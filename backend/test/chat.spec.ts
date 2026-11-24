import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { openIssue, world, type World } from './fixtures';
import { createTestApp, type TestApp } from './helpers';

describe('chat va moderatsiya', () => {
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
    w = await world(t, 'mahalla-a', 3);
  });

  const send = (who: { token: string }, text: string, clientMessageId: string) =>
    t.req('POST', '/api/v1/chat/messages', { token: who.token, json: { text, clientMessageId } });

  it('clientMessageId idempotent: dublikat yaratilmaydi va message:new bir marta tarqatiladi', async () => {
    const a = await send(w.residents[0]!, '  Assalomu alaykum  ', 'client-msg-0001');
    const b = await send(w.residents[0]!, 'Assalomu alaykum', 'client-msg-0001');
    expect(a.status).toBe(201);
    expect(b.status).toBe(200);
    expect(b.body.id).toBe(a.body.id);
    expect(a.body.text).toBe('Assalomu alaykum');
    expect((await t.db.query('SELECT 1 FROM chat_messages')).rows).toHaveLength(1);
    expect(t.emitted.filter((e) => e.event === 'message:new')).toHaveLength(1);
    expect(t.emitted[0]).toMatchObject({ mahallaId: w.mahallaId });

    // boshqa foydalanuvchi bir xil clientMessageId ishlata oladi
    expect((await send(w.residents[1]!, 'Salom', 'client-msg-0001')).status).toBe(201);
  });

  it('matn validatsiyasi: bo‘sh va 1000 belgidan uzun rad etiladi', async () => {
    expect((await send(w.residents[0]!, '   ', 'client-msg-0002')).status).toBe(400);
    expect((await send(w.residents[0]!, 'x'.repeat(1001), 'client-msg-0003')).status).toBe(400);
    expect((await send(w.residents[0]!, 'x'.repeat(1000), 'client-msg-0004')).status).toBe(201);
  });

  it("tarix: before kursori (yangidan eskiga) va after kursori (uzilishdan keyin davom)", async () => {
    const ids: string[] = [];
    for (let i = 0; i < 5; i += 1) {
      ids.push((await send(w.residents[i % 3]!, `Xabar ${i}`, `client-msg-h${i}-000`)).body.id);
    }
    const me = w.residents[0]!.token;

    const first = await t.req('GET', '/api/v1/chat/messages?limit=2', { token: me });
    expect(first.body.items.map((m: { text: string }) => m.text)).toEqual(['Xabar 4', 'Xabar 3']);
    expect(first.body.items[0].mine).toBe(false);
    expect(first.body.items[1].mine).toBe(true); // Xabar 3 — o'zim yozganman
    const older = await t.req('GET', `/api/v1/chat/messages?limit=2&before=${first.body.nextCursor}`, { token: me });
    expect(older.body.items.map((m: { text: string }) => m.text)).toEqual(['Xabar 2', 'Xabar 1']);
    const oldest = await t.req('GET', `/api/v1/chat/messages?limit=2&before=${older.body.nextCursor}`, { token: me });
    expect(oldest.body.items.map((m: { text: string }) => m.text)).toEqual(['Xabar 0']);
    expect(oldest.body.nextCursor).toBeNull();

    // Uzilish: oxirgi ko'rilgan Xabar 1; keyingilari eskidan yangiga
    const missed = await t.req('GET', `/api/v1/chat/messages?after=${ids[1]}`, { token: me });
    expect(missed.body.items.map((m: { text: string }) => m.text)).toEqual(['Xabar 2', 'Xabar 3', 'Xabar 4']);
    expect(missed.body.nextCursor).toBeNull();
    expect((await t.req('GET', `/api/v1/chat/messages?after=${ids[4]}`, { token: me })).body.items).toEqual([]);
  });

  it('chat tezligi: daqiqada 30 xabardan oshsa 429', async () => {
    let last = 0;
    for (let i = 0; i < 31; i += 1) last = (await send(w.residents[0]!, `Tez ${i}`, `client-msg-r${i}-000`)).status;
    expect(last).toBe(429);
  });

  it("shikoyat: bir kontentga bitta; admin ro'yxatida; yashirilgan xabar ro'yxatdan chiqadi va message:hidden tarqatiladi", async () => {
    const msg = (await send(w.residents[0]!, 'Nomaqbul xabar', 'client-msg-bad-001')).body.id as string;
    await send(w.residents[1]!, 'Yaxshi xabar', 'client-msg-ok-0001');

    const report = (token: string, targetId: string, reason = 'Haqoratli so‘zlar') =>
      t.req('POST', '/api/v1/reports', { token, json: { targetType: 'CHAT_MESSAGE', targetId, reason } });
    const first = await report(w.residents[1]!.token, msg);
    expect(first.status).toBe(201);
    expect(first.body).toMatchObject({ status: 'OPEN', targetType: 'CHAT_MESSAGE' });
    const again = await report(w.residents[1]!.token, msg);
    expect(again.status).toBe(200);
    expect(again.body.id).toBe(first.body.id);
    expect((await report(w.residents[2]!.token, msg)).status).toBe(201);
    expect((await t.db.query('SELECT 1 FROM reports')).rows).toHaveLength(2);
    expect((await t.req('POST', '/api/v1/reports', { token: w.admin.token, json: { targetType: 'CHAT_MESSAGE', targetId: msg, reason: 'sabab' } })).status).toBe(403);

    const list = await t.req('GET', '/api/v1/admin/reports?status=OPEN', { token: w.admin.token });
    expect(list.body.items).toHaveLength(2);
    expect(list.body.items[0]).toMatchObject({ contentPreview: 'Nomaqbul xabar', contentHidden: false, status: 'OPEN' });
    expect((await t.req('GET', '/api/v1/admin/dashboard', { token: w.admin.token })).body.openReports).toBe(2);
    expect((await t.req('GET', '/api/v1/admin/reports', { token: w.residents[0]!.token })).status).toBe(403);

    expect((await t.req('POST', `/api/v1/admin/reports/${first.body.id}/hide`, { token: w.admin.token, json: { reason: 'x' } })).status).toBe(400);
    const hidden = await t.req('POST', `/api/v1/admin/reports/${first.body.id}/hide`, { token: w.admin.token, json: { reason: 'Qoidabuzarlik' } });
    expect(hidden.status).toBe(200);
    expect(t.emitted.filter((e) => e.event === 'message:hidden')).toEqual([{ mahallaId: w.mahallaId, event: 'message:hidden', payload: { id: msg } }]);

    // Yashirilgan xabar ro'yxatdan chiqdi, ikkala shikoyat yopildi, qayta shikoyat qilib bo'lmaydi
    const history = await t.req('GET', '/api/v1/chat/messages', { token: w.residents[2]!.token });
    expect(history.body.items.map((m: { text: string }) => m.text)).toEqual(['Yaxshi xabar']);
    expect((await t.req('GET', '/api/v1/admin/reports?status=ACTIONED', { token: w.admin.token })).body.items).toHaveLength(2);
    expect((await t.req('POST', `/api/v1/admin/reports/${first.body.id}/hide`, { token: w.admin.token, json: { reason: 'Qoidabuzarlik' } })).status).toBe(409);
    expect((await report(w.residents[0]!.token, msg)).status).toBe(404);

    const audit = await t.req('GET', '/api/v1/admin/audit?action=content.hide', { token: w.admin.token });
    expect(audit.body.items[0]).toMatchObject({ action: 'content.hide', targetType: 'CHAT_MESSAGE', targetId: msg, reason: 'Qoidabuzarlik' });
  });

  it("shikoyatni rad etish va postga/izohga shikoyat", async () => {
    const issue = await openIssue(t, w, w.residents[0]!, 'Shikoyat uchun post');
    const comment = (await t.req('POST', `/api/v1/issues/${issue}/comments`, { token: w.residents[1]!.token, json: { text: 'Spam izoh' } })).body.id as string;

    const postReport = await t.req('POST', '/api/v1/reports', { token: w.residents[2]!.token, json: { targetType: 'POST', targetId: issue, reason: 'Yolg‘on ma‘lumot' } });
    const commentReport = await t.req('POST', '/api/v1/reports', { token: w.residents[2]!.token, json: { targetType: 'COMMENT', targetId: comment, reason: 'Spam' } });
    expect([postReport.status, commentReport.status]).toEqual([201, 201]);

    const dismissed = await t.req('POST', `/api/v1/admin/reports/${postReport.body.id}/dismiss`, { token: w.admin.token, json: { reason: "Asossiz" } });
    expect(dismissed.body.status).toBe('DISMISSED');
    expect((await t.req('POST', `/api/v1/admin/reports/${postReport.body.id}/dismiss`, { token: w.admin.token, json: {} })).status).toBe(409);
    expect((await t.req('GET', `/api/v1/issues/${issue}`, { token: w.residents[1]!.token })).status).toBe(200);

    await t.req('POST', `/api/v1/admin/reports/${commentReport.body.id}/hide`, { token: w.admin.token, json: { reason: 'Spam' } });
    expect((await t.req('GET', `/api/v1/issues/${issue}/comments`, { token: w.residents[0]!.token })).body.items).toHaveLength(0);
  });
});
