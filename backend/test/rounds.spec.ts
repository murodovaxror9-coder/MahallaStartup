import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { closeDueRounds, closeRound, currentRound } from '../src/modules/rounds/service';
import { periodFor, parsePeriodKey } from '../src/modules/rounds/period';
import { openIssue, world, type World } from './fixtures';
import { createTestApp, type TestApp } from './helpers';

const AFTER_PERIOD = new Date('2026-12-01T00:01:00+05:00');

describe('davr davrlari (Toshkent UTC+5)', () => {
  it('2026-12 davri = 2026-11-30T19:00Z ... 2026-12-31T19:00Z', () => {
    const p = parsePeriodKey('2026-12')!;
    expect(p.start.toISOString()).toBe('2026-11-30T19:00:00.000Z');
    expect(p.end.toISOString()).toBe('2026-12-31T19:00:00.000Z');
    expect(periodFor(new Date('2026-12-01T00:00:00+05:00')).key).toBe('2026-12');
    expect(periodFor(new Date('2026-11-30T23:59:59+05:00')).key).toBe('2026-11');
    expect(periodFor(new Date('2026-12-31T23:59:59+05:00')).key).toBe('2026-12');
    expect(parsePeriodKey('2026-13')).toBeNull();
  });
});

describe('oy yakuni', () => {
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
    w = await world(t, 'mahalla-a', 4);
  });

  const vote = (who: { token: string }, id: string) => t.req('PUT', `/api/v1/issues/${id}/vote`, { token: who.token });
  const roundOf = async () => (await currentRound(t.db, w.mahallaId, t.clock.now())).id;
  const statusOf = async (id: string) => (await t.db.query<{ status: string }>('SELECT status FROM issues WHERE id = $1', [id])).rows[0]!.status;

  it("ko'p ovoz yutadi: post SELECTED, natija, tarix va bildirishnomalar", async () => {
    const a = await openIssue(t, w, w.residents[0]!, 'A post');
    const b = await openIssue(t, w, w.residents[1]!, 'B post');
    await vote(w.residents[2]!, b);
    await vote(w.residents[3]!, b);
    await vote(w.residents[2]!, a);
    await t.req('PUT', `/api/v1/issues/${b}/follow`, { token: w.residents[0]!.token });
    const round = await roundOf();

    t.clock.set(AFTER_PERIOD);
    const result = await closeRound(t.deps, round, t.clock.now());
    expect(result.winner?.issueId).toBe(b);
    expect(result.winner?.votes).toBe(2);
    expect(result.ranking.map((r) => [r.issueId, r.votes, r.rank])).toEqual([
      [b, 2, 1],
      [a, 1, 2],
    ]);
    expect(result.totalVoters).toBe(2);
    expect(result.totalVotes).toBe(3);
    expect(await statusOf(b)).toBe('SELECTED');
    expect(await statusOf(a)).toBe('OPEN');

    const hist = await t.db.query<{ from_status: string; to_status: string; actor_id: string | null }>(
      "SELECT from_status, to_status, actor_id FROM issue_updates WHERE issue_id = $1 AND type = 'STATUS_CHANGE' ORDER BY created_at DESC LIMIT 1",
      [b],
    );
    expect(hist.rows[0]).toMatchObject({ from_status: 'OPEN', to_status: 'SELECTED', actor_id: null });

    const notes = await t.db.query<{ user_id: string; type: string }>(
      "SELECT user_id, type FROM notifications WHERE dedupe_key = $1",
      [`round:${round}:result`],
    );
    const recipients = notes.rows.map((n) => n.user_id).sort();
    // muallif (r1), kuzatuvchi (r0), ovoz berganlar (r2, r3): har biriga bitta
    expect(recipients).toEqual([w.residents[0]!.id, w.residents[1]!.id, w.residents[2]!.id, w.residents[3]!.id].sort());
    expect(notes.rows.every((n) => n.type === 'ROUND_WINNER')).toBe(true);

    const api = await t.req('GET', `/api/v1/rounds/${round}/result`, { token: w.residents[0]!.token });
    expect(api.status).toBe(200);
    expect(api.body.winner.title).toBe('B post');
  });

  it("teng ovozda ertaroq publishedAt yutadi; vaqt ham teng bo'lsa kichik ID", async () => {
    const older = await openIssue(t, w, w.residents[0]!, 'Eski post');
    const newer = await openIssue(t, w, w.residents[1]!, 'Yangi post');
    await vote(w.residents[2]!, older);
    await vote(w.residents[2]!, newer);
    await t.db.query("UPDATE issues SET published_at = '2026-11-20T10:00:00Z' WHERE id = $1", [older]);
    await t.db.query("UPDATE issues SET published_at = '2026-11-21T10:00:00Z' WHERE id = $1", [newer]);
    let round = await roundOf();
    t.clock.set(AFTER_PERIOD);
    expect((await closeRound(t.deps, round, t.clock.now())).winner?.issueId).toBe(older);

    // Vaqt ham teng: kichik ID yutadi
    await t.reset();
    w = await world(t, 'mahalla-a', 4);
    const x = await openIssue(t, w, w.residents[0]!, 'X post');
    const y = await openIssue(t, w, w.residents[1]!, 'Y post');
    await vote(w.residents[2]!, x);
    await vote(w.residents[2]!, y);
    await t.db.query("UPDATE issues SET published_at = '2026-11-20T10:00:00Z'");
    round = await roundOf();
    t.clock.set(AFTER_PERIOD);
    const winner = (await closeRound(t.deps, round, t.clock.now())).winner?.issueId;
    expect(winner).toBe([x, y].sort()[0]);
  });

  it("ovozsiz davr: g'olib yo'q; job 2 marta ishlasa ham bitta RoundResult", async () => {
    await openIssue(t, w, w.residents[0]!, 'Ovozsiz');
    const round = await roundOf();
    t.clock.set(AFTER_PERIOD);

    const first = await closeDueRounds(t.deps, t.clock.now());
    const second = await closeDueRounds(t.deps, t.clock.now());
    expect(first).toBeGreaterThanOrEqual(1);
    expect(second).toBe(0);

    const direct = await closeRound(t.deps, round, t.clock.now());
    expect(direct.winner).toBeNull();
    expect(direct.message).toBe("Bu oy g'olib aniqlanmadi");
    const results = await t.db.query('SELECT 1 FROM round_results WHERE round_id = $1', [round]);
    expect(results.rows).toHaveLength(1);
  });

  it('job ikki marta ishlasa bitta bildirishnoma; davr tugamagan bo‘lsa yopilmaydi', async () => {
    const a = await openIssue(t, w, w.residents[0]!, 'A post');
    await vote(w.residents[1]!, a);
    const round = await roundOf();
    await expect(closeRound(t.deps, round, t.clock.now())).rejects.toMatchObject({ code: 'CONFLICT' });

    t.clock.set(AFTER_PERIOD);
    await closeRound(t.deps, round, t.clock.now());
    await closeRound(t.deps, round, t.clock.now());
    const n = await t.db.query("SELECT 1 FROM notifications WHERE dedupe_key = $1 AND user_id = $2", [`round:${round}:result`, w.residents[1]!.id]);
    expect(n.rows).toHaveLength(1);
  });

  it("kech ishga tushgan job: davr yopilgandan KEYIN yashirilgan post hisobga olinadi, avval yashirilgani olinmaydi", async () => {
    const early = await openIssue(t, w, w.residents[0]!, 'Erta yashirilgan');
    const late = await openIssue(t, w, w.residents[1]!, 'Kech yashirilgan');
    await vote(w.residents[2]!, early);
    await vote(w.residents[2]!, late);
    await vote(w.residents[3]!, early); // early 2 ovoz, late 1 ovoz
    const round = await roundOf();

    // `early` davr ichida yashirildi -> hisobga olinmaydi; `late` davr tugagandan keyin yashirildi -> hisobga olinadi
    await t.req('POST', `/api/v1/admin/content/post/${early}/hide`, { token: w.admin.token, json: { reason: 'Nomaqbul' } });
    t.clock.set(AFTER_PERIOD);
    await t.req('POST', `/api/v1/admin/content/post/${late}/hide`, { token: w.admin.token, json: { reason: 'Kech' } });

    const result = await closeRound(t.deps, round, t.clock.now());
    expect(result.ranking.map((r) => r.issueId)).toEqual([late]);
    expect(result.winner?.issueId).toBe(late);
  });

  it('davr tugagandan keyingi ovozlar sanalmaydi (created_at < period_end)', async () => {
    const a = await openIssue(t, w, w.residents[0]!, 'A post');
    await vote(w.residents[1]!, a);
    const round = await roundOf();
    // Davr tugagandan keyin yozilgan "ovoz" (masalan, kechikib kelgan yozuv)
    await t.db.query(
      `INSERT INTO votes (id, round_id, issue_id, voter_id, slot, created_at) VALUES (gen_random_uuid(), $1, $2, $3, 1, '2026-12-01T00:30:00+05:00')`,
      [round, a, w.residents[2]!.id],
    );
    t.clock.set(AFTER_PERIOD);
    const result = await closeRound(t.deps, round, t.clock.now());
    expect(result.ranking[0]?.votes).toBe(1);
    expect(result.totalVotes).toBe(1);
  });

  it("carry-over: g'olib bo'lmagan post yangi davrga 0 ovoz bilan o'tadi", async () => {
    const win = await openIssue(t, w, w.residents[0]!, 'G\'olib');
    const lose = await openIssue(t, w, w.residents[1]!, 'Yutqazdi');
    await vote(w.residents[2]!, win);
    await vote(w.residents[3]!, win);
    await vote(w.residents[2]!, lose);
    const oldRound = await roundOf();
    t.clock.set(AFTER_PERIOD);
    await closeRound(t.deps, oldRound, t.clock.now());

    // Yopilgan davrdan avtomatik o'tmaydi
    const next = await currentRound(t.db, w.mahallaId, t.clock.now());
    expect(next.id).not.toBe(oldRound);
    const before = await t.db.query('SELECT 1 FROM round_entries WHERE round_id = $1 AND issue_id = $2', [next.id, lose]);
    expect(before.rows).toHaveLength(0);

    const carried = await t.req('POST', `/api/v1/admin/issues/${lose}/carry-over`, { token: w.admin.token });
    expect(carried.status).toBe(200);
    const entry = await t.db.query<{ vote_count: number }>('SELECT vote_count FROM round_entries WHERE round_id = $1 AND issue_id = $2', [next.id, lose]);
    expect(entry.rows[0]!.vote_count).toBe(0);
    // yangi davrda ovoz berish mumkin
    expect((await vote(w.residents[3]!, lose)).status).toBe(200);
    // ikkinchi marta o'tkazib bo'lmaydi; g'olibni (SELECTED) o'tkazib bo'lmaydi
    expect((await t.req('POST', `/api/v1/admin/issues/${lose}/carry-over`, { token: w.admin.token })).status).toBe(409);
    expect((await t.req('POST', `/api/v1/admin/issues/${win}/carry-over`, { token: w.admin.token })).status).toBe(409);
  });

  it('g‘olibni almashtirish endpointi yo‘q', async () => {
    const res = await t.req('PUT', '/api/v1/admin/rounds/00000000-0000-7000-8000-000000000000/winner', { token: w.admin.token, json: {} });
    expect(res.status).toBe(404);
  });
});
