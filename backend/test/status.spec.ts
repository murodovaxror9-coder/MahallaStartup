import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { closeRound, currentRound } from '../src/modules/rounds/service';
import { jpeg, openIssue, upload, world, type World } from './fixtures';
import { createTestApp, type TestApp } from './helpers';

describe('holat mashinasi (API)', () => {
  let t: TestApp;
  let w: World;
  let issue: string;

  beforeAll(async () => {
    t = await createTestApp();
  });
  afterAll(async () => {
    await t.close();
  });

  beforeEach(async () => {
    await t.reset();
    w = await world(t, 'mahalla-a', 4);
    issue = await openIssue(t, w, w.residents[0]!, "Ko'cha chirog'i ishlamayapti");
    await t.req('PUT', `/api/v1/issues/${issue}/follow`, { token: w.residents[2]!.token });
    await t.req('PUT', `/api/v1/issues/${issue}/vote`, { token: w.residents[1]!.token });
  });

  const admin = () => w.admin.token;
  const transition = (json: Record<string, unknown>, token = admin()) =>
    t.req('POST', `/api/v1/admin/issues/${issue}/transition`, { token, json });
  const status = async () => (await t.db.query<{ status: string }>('SELECT status FROM issues WHERE id = $1', [issue])).rows[0]!.status;

  async function select(): Promise<void> {
    const round = (await currentRound(t.db, w.mahallaId, t.clock.now())).id;
    t.clock.set(new Date('2026-12-01T00:01:00+05:00'));
    await closeRound(t.deps, round, t.clock.now());
    expect(await status()).toBe('SELECTED');
  }

  it("ruxsat etilmagan o'tishlar 409 INVALID_STATUS_TRANSITION (OPEN holatdan to'g'ridan-to'g'ri ish boshlab bo'lmaydi)", async () => {
    const full = { responsible: 'Ali Valiyev', nextStep: "Elektrchini chaqirish", dueDate: '2026-12-10' };
    for (const toStatus of ['IN_PROGRESS', 'REFERRED', 'RESOLVED']) {
      const res = await transition({ toStatus, ...full, referredOrg: 'Hokimlik', referredAt: '2026-12-01', followUpAt: '2026-12-05', resolutionText: 'Hal qilindi' });
      expect(res.status, toStatus).toBe(409);
      expect(res.body.error.code).toBe('INVALID_STATUS_TRANSITION');
    }
    // Admin OPEN -> SELECTED qila olmaydi (faqat davr yopish vazifasi) va PENDING/OPEN/MERGED ga bu endpoint orqali o'tolmaydi
    for (const toStatus of ['SELECTED', 'OPEN', 'MERGED', 'REJECTED', 'PENDING_REVIEW']) {
      expect((await transition({ toStatus })).status, toStatus).toBe(409);
    }
    expect(await status()).toBe('OPEN');
  });

  it('IN_PROGRESS majburiy maydonlarsiz 400; resident admin endpointiga kira olmaydi', async () => {
    await select();
    const bad = await transition({ toStatus: 'IN_PROGRESS' });
    expect(bad.status).toBe(400);
    expect(Object.keys(bad.body.error.details.fields).sort()).toEqual(['dueDate', 'nextStep', 'responsible']);
    const partial = await transition({ toStatus: 'IN_PROGRESS', responsible: 'Ali' });
    expect(Object.keys(partial.body.error.details.fields).sort()).toEqual(['dueDate', 'nextStep']);
    expect(await status()).toBe('SELECTED');
    expect((await transition({ toStatus: 'IN_PROGRESS' }, w.residents[0]!.token)).status).toBe(403);
  });

  it("to'liq hayot sikli: IN_PROGRESS -> REFERRED -> IN_PROGRESS -> RESOLVED -> qayta ochish; har o'tish tarix + audit + bildirishnoma yozadi", async () => {
    await select();
    const author = w.residents[0]!;
    const follower = w.residents[2]!;

    const inProgress = await transition({ toStatus: 'IN_PROGRESS', responsible: 'Ali Valiyev', nextStep: 'Elektrchini chaqirish', dueDate: '2026-12-10' });
    expect(inProgress.status).toBe(200);
    expect(inProgress.body).toMatchObject({ status: 'IN_PROGRESS', responsible: 'Ali Valiyev', dueDate: '2026-12-10', statusLabel: 'Jarayonda' });

    const noOrg = await transition({ toStatus: 'REFERRED', referredOrg: 'Hokimlik' });
    expect(noOrg.status).toBe(400);
    const referred = await transition({ toStatus: 'REFERRED', referredOrg: 'Hokimlik', referredAt: '2026-12-02', followUpAt: '2026-12-09' });
    expect(referred.body).toMatchObject({ status: 'REFERRED', referredOrg: 'Hokimlik', followUpAt: '2026-12-09' });

    // REFERRED -> IN_PROGRESS: mas'ul/qadam/muddat avvalgisidan olinadi
    expect((await transition({ toStatus: 'IN_PROGRESS' })).body.status).toBe('IN_PROGRESS');

    const photo = (await upload(t, w.admin, await jpeg())).body.mediaId as string;
    expect((await transition({ toStatus: 'RESOLVED' })).status).toBe(400); // yakun matni majburiy
    const resolved = await transition({ toStatus: 'RESOLVED', resolutionText: "Chiroq almashtirildi, ishlayapti", mediaIds: [photo] });
    expect(resolved.status).toBe(200);
    expect(resolved.body.resolutionText).toBe("Chiroq almashtirildi, ishlayapti");
    const resolvedStep = resolved.body.history.find((h: { toStatus: string }) => h.toStatus === 'RESOLVED');
    expect(resolvedStep.media).toHaveLength(1);

    // RESOLVED -> IN_PROGRESS: sabab majburiy
    expect((await transition({ toStatus: 'IN_PROGRESS' })).status).toBe(400);
    const reopened = await transition({ toStatus: 'IN_PROGRESS', reason: 'Muallif: muammo hali davom etmoqda' });
    expect(reopened.body.status).toBe('IN_PROGRESS');

    // Tarix: SELECTED, IN_PROGRESS, REFERRED, IN_PROGRESS, RESOLVED, IN_PROGRESS (+ OPEN)
    const history = reopened.body.history.map((h: { toStatus: string }) => h.toStatus);
    expect(history).toEqual(['OPEN', 'SELECTED', 'IN_PROGRESS', 'REFERRED', 'IN_PROGRESS', 'RESOLVED', 'IN_PROGRESS']);
    expect(reopened.body.history.at(-1).actorName).toBe(w.admin.login);

    const audit = await t.db.query<{ n: number }>("SELECT count(*)::int AS n FROM audit_events WHERE action = 'issue.transition' AND target_id = $1", [issue]);
    expect(audit.rows[0]!.n).toBe(5);

    // Muallif va kuzatuvchi har o'tishda bildirishnoma oladi; adminga yuborilmaydi; kuzatuvchi — boshqa tur
    const types = async (userId: string) =>
      (await t.db.query<{ type: string }>('SELECT type FROM notifications WHERE user_id = $1 AND entity_id = $2', [userId, issue])).rows.map((r) => r.type);
    const authorTypes = await types(author.id);
    const followerTypes = await types(follower.id);
    expect(authorTypes.filter((x) => x === 'ISSUE_STATUS_CHANGED')).toHaveLength(6); // tasdiqlash + 5 o'tish
    expect(followerTypes.filter((x) => x === 'FOLLOWED_ISSUE_UPDATE')).toHaveLength(5);
    expect(await types(w.admin.id)).toEqual([]);

    // Bildirishnomani o'qish
    const list = await t.req('GET', '/api/v1/notifications', { token: author.token });
    expect(list.body.items.length).toBeGreaterThan(0);
    const unread = await t.req('GET', '/api/v1/notifications/unread-count', { token: author.token });
    expect(unread.body.count).toBeGreaterThan(0);
    expect((await t.req('POST', `/api/v1/notifications/${list.body.items[0].id}/read`, { token: author.token })).status).toBe(204);
    expect((await t.req('POST', '/api/v1/notifications/read-all', { token: author.token })).status).toBe(204);
    expect((await t.req('GET', '/api/v1/notifications/unread-count', { token: author.token })).body.count).toBe(0);
  });

  it("muallif fikri: faqat RESOLVED da, faqat muallif; STILL_ONGOING holatni o'zgartirmaydi va adminga xabar beradi", async () => {
    await select();
    await transition({ toStatus: 'IN_PROGRESS', responsible: 'Ali', nextStep: 'Qadam', dueDate: '2026-12-10' });
    const feedback = (token: string, json: Record<string, unknown>) => t.req('POST', `/api/v1/issues/${issue}/feedback`, { token, json });

    expect((await feedback(w.residents[0]!.token, { type: 'STILL_ONGOING', comment: 'Hali ishlamayapti' })).status).toBe(409); // hali RESOLVED emas
    await transition({ toStatus: 'RESOLVED', resolutionText: 'Hal qilindi deb belgilandi' });

    expect((await feedback(w.residents[1]!.token, { type: 'STILL_ONGOING', comment: 'Hali ishlamayapti' })).status).toBe(403);
    expect((await feedback(w.residents[0]!.token, { type: 'STILL_ONGOING' })).status).toBe(400); // izoh majburiy
    const ok = await feedback(w.residents[0]!.token, { type: 'STILL_ONGOING', comment: 'Chiroq yana o‘chib qoldi' });
    expect(ok.status).toBe(201);
    expect(await status()).toBe('RESOLVED');

    const adminNote = await t.db.query<{ type: string; body: string }>('SELECT type, body FROM notifications WHERE user_id = $1', [w.admin.id]);
    expect(adminNote.rows).toHaveLength(1);
    expect(adminNote.rows[0]!.type).toBe('AUTHOR_FEEDBACK');
    expect(adminNote.rows[0]!.body).toContain("o‘chib qoldi");

    const detail = await t.req('GET', `/api/v1/issues/${issue}`, { token: w.residents[0]!.token });
    const last = detail.body.history.at(-1);
    expect(last).toMatchObject({ type: 'AUTHOR_FEEDBACK', toStatus: null });
    expect(last.payload.feedback).toBe('STILL_ONGOING');
  });

  it("ish ma'lumotlari: sabab majburiy, holat o'zgarmaydi, muddati o'tgan ishlar ro'yxatda va dashboardda", async () => {
    await select();
    await transition({ toStatus: 'IN_PROGRESS', responsible: 'Ali', nextStep: 'Qadam', dueDate: '2026-12-10' });
    const work = (json: Record<string, unknown>) => t.req('PATCH', `/api/v1/admin/issues/${issue}/work`, { token: admin(), json });

    expect((await work({ responsible: 'Vali' })).status).toBe(400); // sabab yo'q
    expect((await work({ reason: 'Sabab bor' })).status).toBe(400); // hech narsa o'zgarmaydi
    const res = await work({ responsible: 'Vali Aliyev', dueDate: '2026-12-02', reason: "Mas'ul almashdi" });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'IN_PROGRESS', responsible: 'Vali Aliyev', dueDate: '2026-12-02' });
    const upd = res.body.history.at(-1);
    expect(upd).toMatchObject({ type: 'DETAILS_CHANGE', reason: "Mas'ul almashdi" });
    expect(upd.payload.before.responsible).toBe('Ali');
    expect(upd.payload.after.responsible).toBe('Vali Aliyev');

    // Bugun 2026-12-01: 2026-12-02 hali o'tmagan
    expect((await t.req('GET', '/api/v1/admin/issues?overdue=true', { token: admin() })).body.items).toHaveLength(0);
    t.clock.set(new Date('2026-12-05T10:00:00+05:00'));
    const overdue = await t.req('GET', '/api/v1/admin/issues?overdue=true', { token: admin() });
    expect(overdue.body.items.map((i: { id: string }) => i.id)).toEqual([issue]);
    expect((await t.req('GET', '/api/v1/admin/dashboard', { token: admin() })).body.overdueIssues).toBe(1);
    // aholi bu filtrdan foydalana olmaydi
    expect((await t.req('GET', '/api/v1/admin/issues?overdue=true', { token: w.residents[0]!.token })).status).toBe(403);
  });
});
