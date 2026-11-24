import { io, type Socket } from 'socket.io-client';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createRealtime } from '../src/realtime';
import { createIssue, jpeg, openIssue, upload, world, type World } from './fixtures';
import { createTestApp, type TestApp } from './helpers';

const ZERO = '00000000-0000-7000-8000-000000000000';

describe('mahalla izolyatsiyasi', () => {
  let t: TestApp;
  let a: World;
  let b: World;
  // B mahalla obyektlari
  let issue: string;
  let comment: string;
  let message: string;
  let media: string;
  let event: string;
  let announcement: string;
  let report: string;
  let notification: string;
  let round: string;

  beforeAll(async () => {
    t = await createTestApp();
    t.deps.realtime = await createRealtime(t.server, t.deps);
  });
  afterAll(async () => {
    await t.deps.realtime.close();
    await t.close();
  });

  beforeEach(async () => {
    await t.reset();
    a = await world(t, 'mahalla-a', 2);
    b = await world(t, 'mahalla-b', 2);

    media = (await upload(t, b.residents[0]!, await jpeg())).body.mediaId;
    const created = await createIssue(t, b.residents[0]!, { mediaIds: [media], title: 'B mahalla muammosi' });
    issue = created.body.id;
    await t.req('POST', `/api/v1/admin/issues/${issue}/approve`, { token: b.admin.token });
    comment = (await t.req('POST', `/api/v1/issues/${issue}/comments`, { token: b.residents[1]!.token, json: { text: 'B izohi' } })).body.id;
    message = (await t.req('POST', '/api/v1/chat/messages', { token: b.residents[0]!.token, json: { text: 'B chati', clientMessageId: 'b-message-1' } })).body.id;
    const ev = await t.req('POST', '/api/v1/admin/events', {
      token: b.admin.token,
      json: { title: 'B tadbiri', description: 'B tadbiri tavsifi matni', startsAt: '2026-12-10T10:00:00+05:00', location: 'B maydon', organizer: 'B admin' },
    });
    event = ev.body.id;
    await t.req('POST', `/api/v1/admin/events/${event}/publish`, { token: b.admin.token });
    await t.req('PUT', `/api/v1/events/${event}/rsvp`, { token: b.residents[0]!.token });
    announcement = (await t.req('POST', '/api/v1/admin/announcements', { token: b.admin.token, json: { title: "B e'loni", body: "B e'loni matni" } })).body.id;
    await t.req('POST', `/api/v1/admin/announcements/${announcement}/publish`, { token: b.admin.token });
    report = (await t.req('POST', '/api/v1/reports', { token: b.residents[1]!.token, json: { targetType: 'POST', targetId: issue, reason: 'B shikoyati' } })).body.id;
    notification = (await t.db.query<{ id: string }>('SELECT id FROM notifications WHERE user_id = $1 LIMIT 1', [b.residents[0]!.id])).rows[0]!.id;
    round = (await t.db.query<{ id: string }>('SELECT id FROM voting_rounds WHERE mahalla_id = $1', [b.mahallaId])).rows[0]!.id;
  });

  it("A mahalla aholisi B mahalla obyektlariga ID orqali murojaat qilsa hammasi 404", async () => {
    const me = a.residents[0]!.token;
    const checks: Array<[string, string, unknown?]> = [
      ['GET', `/api/v1/issues/${issue}`],
      ['PATCH', `/api/v1/issues/${issue}`, { title: 'Hack hack hack' }],
      ['DELETE', `/api/v1/issues/${issue}`],
      ['POST', `/api/v1/issues/${issue}/resubmit`],
      ['PUT', `/api/v1/issues/${issue}/follow`],
      ['GET', `/api/v1/issues/${issue}/comments`],
      ['POST', `/api/v1/issues/${issue}/comments`, { text: 'salom' }],
      ['POST', `/api/v1/issues/${issue}/feedback`, { type: 'CONFIRMED', comment: 'yaxshi' }],
      ['PUT', `/api/v1/issues/${issue}/vote`],
      ['GET', `/api/v1/media/${media}/url`],
      ['GET', `/api/v1/events/${event}`],
      ['PUT', `/api/v1/events/${event}/rsvp`],
      ['GET', `/api/v1/announcements/${announcement}`],
      ['POST', `/api/v1/notifications/${notification}/read`],
      ['GET', `/api/v1/rounds/${round}/result`],
      ['POST', '/api/v1/reports', { targetType: 'POST', targetId: issue, reason: 'sabab' }],
      ['POST', '/api/v1/reports', { targetType: 'COMMENT', targetId: comment, reason: 'sabab' }],
      ['POST', '/api/v1/reports', { targetType: 'CHAT_MESSAGE', targetId: message, reason: 'sabab' }],
    ];
    for (const [method, url, json] of checks) {
      const res = await t.req(method, url, { token: me, ...(json ? { json } : {}) });
      expect(res.status, `${method} ${url}`).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    }
  });

  it('A mahalla admini B mahalla obyektlarida hech qanday admin amalini bajara olmaydi (404)', async () => {
    const admin = a.admin.token;
    const resident = b.residents[0]!.id;
    const checks: Array<[string, string, unknown?]> = [
      ['GET', `/api/v1/admin/issues/${issue}`],
      ['POST', `/api/v1/admin/issues/${issue}/approve`],
      ['POST', `/api/v1/admin/issues/${issue}/reject`, { reason: 'sabab bor' }],
      ['POST', `/api/v1/admin/issues/${issue}/merge`, { targetIssueId: ZERO }],
      ['POST', `/api/v1/admin/issues/${issue}/transition`, { toStatus: 'IN_PROGRESS', responsible: 'Ali', nextStep: 'Qadam', dueDate: '2026-12-12' }],
      ['PATCH', `/api/v1/admin/issues/${issue}/work`, { responsible: 'Vali', reason: 'sabab bor' }],
      ['POST', `/api/v1/admin/issues/${issue}/carry-over`],
      ['POST', `/api/v1/admin/content/post/${issue}/hide`, { reason: 'sabab bor' }],
      ['POST', `/api/v1/admin/content/comment/${comment}/hide`, { reason: 'sabab bor' }],
      ['POST', `/api/v1/admin/content/chat_message/${message}/hide`, { reason: 'sabab bor' }],
      ['POST', `/api/v1/admin/content/post/${issue}/unhide`],
      ['GET', `/api/v1/admin/residents/${resident}`],
      ['POST', `/api/v1/admin/residents/${resident}/reset-password`],
      ['POST', `/api/v1/admin/residents/${resident}/block`, { reason: 'sabab bor' }],
      ['POST', `/api/v1/admin/residents/${resident}/unblock`],
      ['POST', `/api/v1/admin/reports/${report}/hide`, { reason: 'sabab bor' }],
      ['POST', `/api/v1/admin/reports/${report}/dismiss`, {}],
      ['PATCH', `/api/v1/admin/events/${event}`, { title: 'Hack hack hack' }],
      ['POST', `/api/v1/admin/events/${event}/publish`],
      ['POST', `/api/v1/admin/events/${event}/cancel`, {}],
      ['POST', `/api/v1/admin/events/${event}/complete`, {}],
      ['GET', `/api/v1/admin/events/${event}/attendees`],
      ['PATCH', `/api/v1/admin/announcements/${announcement}`, { title: 'Hack hack hack' }],
      ['POST', `/api/v1/admin/announcements/${announcement}/publish`],
      ['DELETE', `/api/v1/admin/announcements/${announcement}`],
      ['GET', `/api/v1/admin/rounds/${round}/result`],
    ];
    for (const [method, url, json] of checks) {
      const res = await t.req(method, url, { token: admin, ...(json !== undefined ? { json } : {}) });
      expect(res.status, `${method} ${url}`).toBe(404);
    }
    // B ma'lumotlari o'zgarmagan
    const row = await t.db.query<{ status: string; hidden_at: Date | null }>('SELECT status, hidden_at FROM issues WHERE id = $1', [issue]);
    expect(row.rows[0]).toMatchObject({ status: 'OPEN', hidden_at: null });
  });

  it("ro'yxatlar, dashboard, audit va chat faqat o'z mahallasini ko'rsatadi", async () => {
    await openIssue(t, a, a.residents[0]!, 'A mahalla muammosi');
    const feed = await t.req('GET', '/api/v1/issues', { token: a.residents[1]!.token });
    expect(feed.body.items.map((i: { title: string }) => i.title)).toEqual(['A mahalla muammosi']);

    const adminIssues = await t.req('GET', '/api/v1/admin/issues', { token: a.admin.token });
    expect(adminIssues.body.items).toHaveLength(1);
    const residents = await t.req('GET', '/api/v1/admin/residents', { token: a.admin.token });
    expect(residents.body.items).toHaveLength(2);
    expect(residents.body.items.every((r: { login: string }) => r.login.includes('mahalla_a'))).toBe(true);

    expect((await t.req('GET', '/api/v1/chat/messages', { token: a.residents[0]!.token })).body.items).toHaveLength(0);
    expect((await t.req('GET', '/api/v1/events?scope=upcoming', { token: a.residents[0]!.token })).body.items).toHaveLength(0);
    expect((await t.req('GET', '/api/v1/announcements', { token: a.residents[0]!.token })).body.items).toHaveLength(0);
    expect((await t.req('GET', '/api/v1/notifications', { token: a.residents[1]!.token })).body.items).toHaveLength(0);

    const audit = await t.req('GET', '/api/v1/admin/audit', { token: a.admin.token });
    const targets = audit.body.items.map((x: { targetId: string }) => x.targetId);
    expect(targets).not.toContain(issue);
    expect(targets).not.toContain(event);

    const dash = await t.req('GET', '/api/v1/admin/dashboard', { token: a.admin.token });
    expect(dash.body.pendingModeration).toBe(0);
    expect(dash.body.openReports).toBe(0);
    expect(dash.body.nextEvent).toBeNull();
  });

  it("merge'da boshqa mahalla posti asosiy post bo'la olmaydi", async () => {
    const pending = (await createIssue(t, a.residents[0]!)).body.id as string;
    const res = await t.req('POST', `/api/v1/admin/issues/${pending}/merge`, { token: a.admin.token, json: { targetIssueId: issue } });
    expect(res.status).toBe(400);
    expect(res.body.error.details.fields.targetIssueId).toBeTruthy();
  });

  describe('Socket.IO /chat', () => {
    const sockets: Socket[] = [];
    const connect = (token: string | undefined, extra: Record<string, unknown> = {}): Promise<Socket> =>
      new Promise((resolve, reject) => {
        const s = io(`${t.base}/chat`, { transports: ['websocket'], reconnection: false, auth: token ? { token } : {}, ...extra });
        sockets.push(s);
        s.on('connect', () => resolve(s));
        s.on('connect_error', (e) => reject(e));
      });
    const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

    afterAll(() => {
      for (const s of sockets) s.close();
    });

    it("boshqa mahalla xabarlari kelmaydi; o'z mahallasiga message:new va message:hidden keladi", async () => {
      const sa = await connect(a.residents[0]!.token);
      const sb = await connect(b.residents[1]!.token);
      const gotA: unknown[] = [];
      const gotB: Array<{ text: string }> = [];
      const hiddenB: unknown[] = [];
      sa.on('message:new', (m) => gotA.push(m));
      sb.on('message:new', (m) => gotB.push(m));
      sb.on('message:hidden', (m) => hiddenB.push(m));
      // Klient o'zi xohlagan xonaga qo'shila olmaydi
      sa.emit('join', `mahalla:${b.mahallaId}`);

      const sent = await t.req('POST', '/api/v1/chat/messages', { token: b.residents[0]!.token, json: { text: 'Salom B!', clientMessageId: 'b-message-2' } });
      await wait(300);
      expect(gotB.map((m) => m.text)).toEqual(['Salom B!']);
      expect(gotA).toHaveLength(0);

      await t.req('POST', `/api/v1/admin/content/chat_message/${sent.body.id}/hide`, { token: b.admin.token, json: { reason: 'Nomaqbul' } });
      await wait(300);
      expect(hiddenB).toEqual([{ id: sent.body.id }]);
    });

    it('tokensiz yoki yaroqsiz token bilan ulanib bo‘lmaydi; cookie bilan Origin kerak', async () => {
      await expect(connect(undefined)).rejects.toThrow('UNAUTHENTICATED');
      await expect(connect('yaroqsiz-token')).rejects.toThrow('UNAUTHENTICATED');
      const res = await t.req('POST', '/api/v1/auth/login', { json: { login: a.residents[0]!.login, password: 'Passw0rd!x', client: 'web' } });
      const cookie = res.headers.getSetCookie().map((c) => c.split(';')[0]).join('; ');
      await expect(connect(undefined, { extraHeaders: { cookie } })).rejects.toThrow('FORBIDDEN');
      const ok = await connect(undefined, { extraHeaders: { cookie, origin: 'http://localhost:3001' } });
      expect(ok.connected).toBe(true);
    });
  });
});
