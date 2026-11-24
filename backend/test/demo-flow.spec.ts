import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { closeRound, currentRound } from '../src/modules/rounds/service';
import { jpeg, key, upload, world } from './fixtures';
import { createTestApp, actor, PASSWORD, type TestApp } from './helpers';

/**
 * Yakuniy demo ssenariy (TZ): admin aholi yaratadi -> aholi vaqtinchalik parol bilan kiradi, parolni almashtiradi ->
 * foto bilan «ko'cha chirog'i ishlamayapti» posti -> admin tasdiqlaydi -> 3 qo'shni ovoz beradi ->
 * `round:close --now` -> post SELECTED -> admin IN_PROGRESS -> RESOLVED + foto -> muallif va kuzatuvchilarda
 * bildirishnoma, post tarixida hamma qadam.
 */
describe('demo oqim (e2e)', () => {
  let t: TestApp;

  beforeAll(async () => {
    t = await createTestApp();
  });
  afterAll(async () => {
    await t.close();
  });

  it("aholi yaratilishidan muammo hal bo'lishigacha to'liq yo'l", async () => {
    const w = await world(t, 'demo-yunusobod', 0);
    const admin = w.admin.token;

    // 1. Admin aholi yaratadi
    const created = await t.req('POST', '/api/v1/admin/residents', { token: admin, json: { displayName: 'Ali Valiyev', login: 'ali.valiyev' } });
    expect(created.status).toBe(201);
    const temp = created.body.temporaryPassword as string;

    // 2. Vaqtinchalik parol bilan kiradi; boshqa endpointlar yopiq; parolni almashtiradi
    const login = await t.req('POST', '/api/v1/auth/login', { json: { login: 'ali.valiyev', password: temp, client: 'mobile' } });
    expect(login.body.mustChangePassword).toBe(true);
    const ali = { id: created.body.user.id as string, login: 'ali.valiyev', mahallaId: w.mahallaId, role: 'RESIDENT' as const, token: login.body.token as string };
    expect((await t.req('GET', '/api/v1/home', { token: ali.token })).body.error.code).toBe('PASSWORD_CHANGE_REQUIRED');
    expect((await t.req('POST', '/api/v1/auth/change-password', { token: ali.token, json: { currentPassword: temp, newPassword: 'AliYangiParol1' } })).status).toBe(204);
    expect((await t.req('GET', '/api/v1/home', { token: ali.token })).status).toBe(200);

    // 3. Foto bilan post
    const photo = (await upload(t, ali, await jpeg({ gps: true }))).body.mediaId as string;
    const post = await t.req('POST', '/api/v1/issues', {
      token: ali.token,
      headers: { 'Idempotency-Key': key() },
      json: { title: "Ko'cha chirog'i ishlamayapti", description: "Navoiy ko'chasi 12-uy yonidagi chiroq ikki haftadan beri yonmayapti", category: 'LIGHTING', locationText: 'Navoiy 12', mediaIds: [photo] },
    });
    expect(post.status).toBe(201);
    expect(post.body.status).toBe('PENDING_REVIEW');
    const issue = post.body.id as string;

    // 4. Admin tasdiqlaydi
    expect((await t.req('GET', '/api/v1/admin/moderation/queue', { token: admin })).body.items).toHaveLength(1);
    expect((await t.req('POST', `/api/v1/admin/issues/${issue}/approve`, { token: admin })).body.statusLabel).toBe('Ovoz berilmoqda');

    // 5. Uch qo'shni ovoz beradi (biri kuzatadi)
    const neighbours = await Promise.all(['vali', 'sara', 'dilnoza'].map((n) => actor(t, w.mahallaId, `${n}.yunusobod`)));
    for (const n of neighbours) expect((await t.req('PUT', `/api/v1/issues/${issue}/vote`, { token: n.token })).status).toBe(200);
    await t.req('PUT', `/api/v1/issues/${issue}/follow`, { token: neighbours[0]!.token });
    expect((await t.req('GET', `/api/v1/issues/${issue}`, { token: ali.token })).body.voteCount).toBe(3);
    const home = await t.req('GET', '/api/v1/home', { token: neighbours[0]!.token });
    expect(home.body.round.votesLeft).toBe(2);

    // 6. round:close --now 2026-12-01T00:01:00+05:00
    const round = (await currentRound(t.db, w.mahallaId, t.clock.now())).id;
    t.clock.set(new Date('2026-12-01T00:01:00+05:00'));
    const result = await closeRound(t.deps, round, t.clock.now());
    expect(result.winner).toMatchObject({ issueId: issue, votes: 3 });
    const selected = await t.req('GET', `/api/v1/issues/${issue}`, { token: ali.token });
    expect(selected.body.status).toBe('SELECTED');

    // 7. Admin IN_PROGRESS
    const inProgress = await t.req('POST', `/api/v1/admin/issues/${issue}/transition`, {
      token: admin,
      json: { toStatus: 'IN_PROGRESS', responsible: 'Elektr tarmoqlari xodimi Karimov', nextStep: 'Yangi lampochka va kabel olib kelish', dueDate: '2026-12-08' },
    });
    expect(inProgress.status).toBe(200);

    // 8. RESOLVED + foto
    const donePhoto = (await upload(t, w.admin, await jpeg())).body.mediaId as string;
    const resolved = await t.req('POST', `/api/v1/admin/issues/${issue}/transition`, {
      token: admin,
      json: { toStatus: 'RESOLVED', resolutionText: "Chiroq almashtirildi, hozir yonib turibdi", mediaIds: [donePhoto] },
    });
    expect(resolved.body.status).toBe('RESOLVED');

    // 9. Muallif va kuzatuvchida bildirishnoma; tarixda hamma qadam
    const history = (await t.req('GET', `/api/v1/issues/${issue}`, { token: ali.token })).body.history;
    expect(history.filter((h: { toStatus: string | null }) => h.toStatus).map((h: { toStatus: string }) => h.toStatus)).toEqual(['OPEN', 'SELECTED', 'IN_PROGRESS', 'RESOLVED']);
    expect(history.at(-1).media).toHaveLength(1);
    expect(history.at(-1).media[0].url).toMatch(/\/api\/v1\/files\//);

    const authorNotes = (await t.req('GET', '/api/v1/notifications', { token: ali.token })).body.items.map((n: { type: string }) => n.type);
    expect(authorNotes).toEqual(expect.arrayContaining(['ISSUE_STATUS_CHANGED', 'ROUND_WINNER']));
    const followerNotes = (await t.req('GET', '/api/v1/notifications', { token: neighbours[0]!.token })).body.items;
    expect(followerNotes.map((n: { type: string }) => n.type)).toEqual(expect.arrayContaining(['ROUND_WINNER', 'FOLLOWED_ISSUE_UPDATE']));
    expect(followerNotes.find((n: { type: string }) => n.type === 'FOLLOWED_ISSUE_UPDATE').entityId).toBe(issue);

    // Natija sahifasi va admin ko'rinishi
    const rounds = await t.req('GET', '/api/v1/rounds', { token: ali.token });
    expect(rounds.body.items.find((r: { id: string }) => r.id === round).winner.title).toBe("Ko'cha chirog'i ishlamayapti");
    const dash = await t.req('GET', '/api/v1/admin/dashboard', { token: admin });
    expect(dash.body).toMatchObject({ pendingModeration: 0, openReports: 0, totalResidents: 4 });
    expect(PASSWORD).toBeTruthy();
  });
});
