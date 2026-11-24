import { Writable } from 'node:stream';
import { pino } from 'pino';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { PINO_REDACT_PATHS, REDACTED } from '../src/common/redact';
import { cleanupOrphanMedia } from '../src/modules/media/service';
import { jpeg, upload, world, type World } from './fixtures';
import { createTestApp, PASSWORD, type TestApp } from './helpers';

describe('audit', () => {
  let t: TestApp;
  let w: World;

  beforeAll(async () => {
    t = await createTestApp();
  });
  afterAll(async () => {
    await t.close();
  });
  beforeEach(async () => {
    await t.reset();
    w = await world(t, 'mahalla-a', 2);
  });

  it("admin amallari audit'ga yoziladi, lekin parol, xesh va token hech qachon yozilmaydi", async () => {
    const created = await t.req('POST', '/api/v1/admin/residents', {
      token: w.admin.token,
      json: { displayName: 'Ali Valiyev', login: 'Ali.Valiyev', phone: '+998901234567' },
    });
    expect(created.status).toBe(201);
    expect(created.body.user.login).toBe('ali.valiyev');
    const temp = created.body.temporaryPassword as string;
    expect(temp).toMatch(/^[A-HJ-NP-Za-km-z2-9]{10}$/);

    const id = created.body.user.id as string;
    const reset = await t.req('POST', `/api/v1/admin/residents/${id}/reset-password`, { token: w.admin.token });
    await t.req('POST', `/api/v1/admin/residents/${id}/block`, { token: w.admin.token, json: { reason: 'Sinov uchun bloklandi' } });
    await t.req('POST', `/api/v1/admin/residents/${id}/unblock`, { token: w.admin.token });

    // Foydalanuvchi parolini almashtiradi, token oladi
    const login = await t.req('POST', '/api/v1/auth/login', { json: { login: 'ali.valiyev', password: reset.body.temporaryPassword, client: 'mobile' } });
    await t.req('POST', '/api/v1/auth/change-password', { token: login.body.token, json: { currentPassword: reset.body.temporaryPassword, newPassword: 'MutlaqoYangi123' } });

    const audit = await t.req('GET', '/api/v1/admin/audit?limit=50', { token: w.admin.token });
    const actions = audit.body.items.map((a: { action: string }) => a.action);
    expect(actions).toEqual(expect.arrayContaining(['resident.create', 'resident.reset_password', 'resident.block', 'resident.unblock']));

    const dump = JSON.stringify(audit.body) + JSON.stringify((await t.db.query('SELECT meta, reason, ip FROM audit_events')).rows);
    for (const secret of [temp, reset.body.temporaryPassword, 'MutlaqoYangi123', PASSWORD, login.body.token, '$argon2']) {
      expect(dump, `audit'da maxfiy ma'lumot: ${secret}`).not.toContain(secret);
    }
    // /admin/residents ro'yxati ham parol/xesh qaytarmaydi
    const residents = JSON.stringify((await t.req('GET', '/api/v1/admin/residents', { token: w.admin.token })).body);
    expect(residents).not.toContain('password');
    expect(residents).not.toContain('$argon2');
  });

  it('login bandligi, filtrlar va sahifalash', async () => {
    const make = (login: string) =>
      t.req('POST', '/api/v1/admin/residents', { token: w.admin.token, json: { displayName: 'Test Foydalanuvchi', login } });
    expect((await make('sinov1')).status).toBe(201);
    expect((await make('sinov2')).status).toBe(201);
    const dup = await make('SINOV1');
    expect(dup.status).toBe(409);
    expect(dup.body.error.details.fields.login).toBe('Bu login band');
    expect((await make('ab')).status).toBe(400); // juda qisqa
    expect((await make('Bad Login!')).status).toBe(400);

    const filtered = await t.req('GET', '/api/v1/admin/audit?action=resident.create', { token: w.admin.token });
    expect(filtered.body.items.every((a: { action: string }) => a.action === 'resident.create')).toBe(true);
    const page1 = await t.req('GET', '/api/v1/admin/audit?limit=1', { token: w.admin.token });
    expect(page1.body.items).toHaveLength(1);
    expect(page1.body.nextCursor).toBeTruthy();
    const search = await t.req('GET', '/api/v1/admin/residents?query=sinov', { token: w.admin.token });
    expect(search.body.items.map((r: { login: string }) => r.login).sort()).toEqual(['sinov1', 'sinov2']);
    expect((await t.req('GET', '/api/v1/admin/residents?status=BLOCKED', { token: w.admin.token })).body.items).toHaveLength(0);
  });

  it("loglarda parol, token, cookie va push token yashiriladi (pino redact)", () => {
    const lines: string[] = [];
    const stream = new Writable({
      write(chunk, _enc, cb) {
        lines.push(String(chunk));
        cb();
      },
    });
    const log = pino({ redact: { paths: PINO_REDACT_PATHS, censor: REDACTED } }, stream);
    log.info({
      req: { headers: { authorization: 'Bearer sirli-token-123', cookie: 'mhd_session=sirli-cookie', 'x-csrf-token': 'csrf-sirli' } },
      body: { password: 'parol-sirli', currentPassword: 'joriy-sirli', newPassword: 'yangi-sirli', token: 'tok-sirli', expoPushToken: 'push-sirli' },
      res: { headers: { 'set-cookie': ['mhd_session=sirli-set-cookie'] } },
      user: { temporaryPassword: 'vaqtincha-sirli' },
    });
    const out = lines.join('');
    for (const secret of ['sirli-token-123', 'sirli-cookie', 'csrf-sirli', 'parol-sirli', 'joriy-sirli', 'yangi-sirli', 'tok-sirli', 'push-sirli', 'sirli-set-cookie', 'vaqtincha-sirli']) {
      expect(out, secret).not.toContain(secret);
    }
    expect(out).toContain(REDACTED);
  });

  it('o‘z mahallasidagi media chiqish yo‘li: media yuklash audit’ga tegmaydi, lekin cleanup 24 soatdan keyin bog‘lanmaganni o‘chiradi', async () => {
    const m = (await upload(t, w.residents[0]!, await jpeg())).body.mediaId as string;
    expect(await cleanupOrphanMedia(t.deps, t.clock.now())).toBe(0); // hali yangi
    t.clock.advance(25 * 3600_000);
    expect(await cleanupOrphanMedia(t.deps, t.clock.now())).toBe(1);
    expect((await t.db.query('SELECT 1 FROM media WHERE id = $1', [m])).rows).toHaveLength(0);
  });
});
