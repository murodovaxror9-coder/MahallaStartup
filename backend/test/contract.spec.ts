import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { z } from 'zod';
import { responseSchemas } from '../src/contract/responses';
import { buildContract } from '../src/contract';
import { toYaml } from '../src/core/yaml';
import { allRoutes } from '../src/routes';
import { createIssue, jpeg, openIssue, upload, world, type World } from './fixtures';
import { createTestApp, type TestApp } from './helpers';

describe('API shartnomasi (OpenAPI)', () => {
  it('hamma marshrut hujjatda: takroriy operationId yo‘q, xato sxemasi va xavfsizlik bor', () => {
    const doc = buildContract() as {
      paths: Record<string, Record<string, { operationId?: string; security?: unknown[] }>>;
      components: { schemas: Record<string, unknown> };
    };
    const methods = ['get', 'post', 'put', 'patch', 'delete'];
    const ops = Object.values(doc.paths).flatMap((p) => Object.entries(p).filter(([k]) => methods.includes(k)).map(([, o]) => o));
    expect(ops.length).toBe(allRoutes.length + 2); // + /health, /ready
    expect(new Set(ops.map((o) => o.operationId)).size).toBe(ops.length);
    expect(doc.components.schemas['ErrorResponse']).toBeTruthy();
    expect(doc.paths['/issues/{id}']?.['get']?.security).toEqual([{ bearerAuth: [] }, { cookieAuth: [] }]);
    expect(doc.paths['/auth/login']?.['post']?.security).toEqual([]);
    expect(Object.keys(doc.paths)).toEqual(expect.arrayContaining(['/issues/{id}/vote', '/admin/issues/{id}/transition', '/chat/messages', '/media/{id}/url']));
  });

  it('YAML generatori to‘g‘ri chiqaradi', () => {
    const y = toYaml({ a: 1, b: 'x: y', c: [1, { d: [] }], e: {}, '/p/{id}': null });
    expect(y).toBe(['a: 1', 'b: "x: y"', 'c:', '  - 1', '  - d: []', 'e: {}', '"/p/{id}": null'].join('\n'));
  });

  describe('haqiqiy javoblar sxemalarga mos', () => {
    let t: TestApp;
    let w: World;

    beforeAll(async () => {
      t = await createTestApp();
      w = await world(t, 'mahalla-a', 3);
    });
    afterAll(async () => {
      await t.close();
    });

    const check = (key: string, body: unknown) => {
      const schema = responseSchemas[key] as z.ZodType;
      expect(schema, `sxema yo'q: ${key}`).toBeTruthy();
      const r = schema.safeParse(body);
      expect(r.success, `${key}: ${r.success ? '' : JSON.stringify(r.error.issues.slice(0, 3))}`).toBe(true);
    };

    it('asosiy endpointlar', async () => {
      const [ali, vali] = [w.residents[0]!, w.residents[1]!];
      const photo = (await upload(t, ali, await jpeg())).body.mediaId as string;
      check('POST /media', (await upload(t, vali, await jpeg())).body);
      const created = await createIssue(t, ali, { mediaIds: [photo] });
      check('POST /issues', created.body);
      const id = created.body.id as string;
      const approved = await t.req('POST', `/api/v1/admin/issues/${id}/approve`, { token: w.admin.token });
      check('POST /admin/issues/:id/approve', approved.body);
      const other = await openIssue(t, w, vali, 'Boshqa muammo uchun');

      const get = async (url: string, key: string, token = ali.token) => {
        const res = await t.req('GET', url, { token });
        expect(res.status, url).toBe(200);
        check(key, res.body);
        return res.body;
      };

      check('PUT /issues/:id/vote', (await t.req('PUT', `/api/v1/issues/${id}/vote`, { token: vali.token })).body);
      await t.req('PUT', `/api/v1/issues/${other}/follow`, { token: ali.token });
      check('POST /issues/:id/comments', (await t.req('POST', `/api/v1/issues/${id}/comments`, { token: vali.token, json: { text: 'Izoh matni' } })).body);
      await get(`/api/v1/issues/${id}/comments`, 'GET /issues/:id/comments');
      await get(`/api/v1/issues/${id}`, 'GET /issues/:id');
      await get('/api/v1/issues', 'GET /issues');
      await get('/api/v1/issues/mine', 'GET /issues/mine');
      await get('/api/v1/categories', 'GET /categories');
      await get('/api/v1/rounds/current', 'GET /rounds/current');
      await get('/api/v1/rounds', 'GET /rounds');
      await get('/api/v1/home', 'GET /home');
      await get('/api/v1/me', 'GET /me');
      await get(`/api/v1/media/${photo}/url`, 'GET /media/:id/url');

      const msg = await t.req('POST', '/api/v1/chat/messages', { token: ali.token, json: { text: 'Salom', clientMessageId: 'contract-msg-1' } });
      check('POST /chat/messages', msg.body);
      await get('/api/v1/chat/messages', 'GET /chat/messages');
      check('POST /reports', (await t.req('POST', '/api/v1/reports', { token: vali.token, json: { targetType: 'CHAT_MESSAGE', targetId: msg.body.id, reason: 'Sinov uchun' } })).body);

      const ev = await t.req('POST', '/api/v1/admin/events', {
        token: w.admin.token,
        json: { title: 'Sinov tadbiri', description: 'Shartnoma testi uchun tadbir', startsAt: '2026-12-10T18:00:00+05:00', location: 'Maydon', organizer: 'Admin' },
      });
      check('POST /admin/events', ev.body);
      check('POST /admin/events/:id/publish', (await t.req('POST', `/api/v1/admin/events/${ev.body.id}/publish`, { token: w.admin.token })).body);
      check('PUT /events/:id/rsvp', (await t.req('PUT', `/api/v1/events/${ev.body.id}/rsvp`, { token: ali.token })).body);
      await get('/api/v1/events', 'GET /events');
      await get(`/api/v1/events/${ev.body.id}`, 'GET /events/:id');
      await get(`/api/v1/admin/events/${ev.body.id}/attendees`, 'GET /admin/events/:id/attendees', w.admin.token);

      const ann = await t.req('POST', '/api/v1/admin/announcements', { token: w.admin.token, json: { title: "E'lon sarlavhasi", body: "E'lon matni", isImportant: true } });
      check('POST /admin/announcements', ann.body);
      check('POST /admin/announcements/:id/publish', (await t.req('POST', `/api/v1/admin/announcements/${ann.body.id}/publish`, { token: w.admin.token })).body);
      await get('/api/v1/announcements', 'GET /announcements');
      await t.deps.jobs.stop();

      await get('/api/v1/notifications', 'GET /notifications');
      await get('/api/v1/notifications/unread-count', 'GET /notifications/unread-count');

      const admin = w.admin.token;
      await get('/api/v1/admin/dashboard', 'GET /admin/dashboard', admin);
      await get('/api/v1/admin/moderation/queue', 'GET /admin/moderation/queue', admin);
      await get('/api/v1/admin/issues', 'GET /admin/issues', admin);
      await get(`/api/v1/admin/issues/${id}`, 'GET /admin/issues/:id', admin);
      await get('/api/v1/admin/residents', 'GET /admin/residents', admin);
      await get('/api/v1/admin/reports', 'GET /admin/reports', admin);
      await get('/api/v1/admin/events', 'GET /admin/events', admin);
      await get('/api/v1/admin/audit', 'GET /admin/audit', admin);
      await get('/api/v1/admin/rounds', 'GET /admin/rounds', admin);

      const resident = await t.req('POST', '/api/v1/admin/residents', { token: admin, json: { displayName: 'Yangi Aholi', login: 'yangi.aholi' } });
      check('POST /admin/residents', resident.body);
      check('POST /admin/residents/:id/reset-password', (await t.req('POST', `/api/v1/admin/residents/${resident.body.user.id}/reset-password`, { token: admin })).body);
      await get(`/api/v1/admin/residents/${resident.body.user.id}`, 'GET /admin/residents/:id', admin);
      check('POST /auth/login', (await t.req('POST', '/api/v1/auth/login', { json: { login: ali.login, password: 'Passw0rd!x', client: 'mobile' } })).body);
    });
  });
});
