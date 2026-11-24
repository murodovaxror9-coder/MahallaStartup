import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createIssue, openIssue, world, type World } from './fixtures';
import { createTestApp, type TestApp } from './helpers';

describe('ovoz berish', () => {
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

  const vote = (who: { token: string }, issueId: string) => t.req('PUT', `/api/v1/issues/${issueId}/vote`, { token: who.token });
  const unvote = (who: { token: string }, issueId: string) => t.req('DELETE', `/api/v1/issues/${issueId}/vote`, { token: who.token });

  it('takroriy ovoz sanalmaydi (idempotent), 4-ovoz 409, qaytarib olish limitni tiklaydi', async () => {
    const [a, b, c, d] = await Promise.all([0, 1, 2, 3].map((i) => openIssue(t, w, w.residents[i % 3]!, `Post ${i}`)));
    const me = w.residents[0]!;

    expect((await vote(me, a!)).status).toBe(200);
    const again = await vote(me, a!);
    expect(again.status).toBe(200);
    expect(again.body.votesUsed).toBe(1);

    expect((await vote(me, b!)).status).toBe(200);
    expect((await vote(me, c!)).status).toBe(200);
    const fourth = await vote(me, d!);
    expect(fourth.status).toBe(409);
    expect(fourth.body.error.code).toBe('VOTE_LIMIT_REACHED');
    expect(fourth.body.error.message).toBe('Bu oy uchun 3 ta ovozingizdan foydalandingiz');

    expect((await unvote(me, a!)).status).toBe(204);
    expect((await unvote(me, a!)).status).toBe(204); // ovoz yo'q bo'lsa ham 204
    expect((await vote(me, d!)).status).toBe(200);

    const current = await t.req('GET', '/api/v1/rounds/current', { token: me.token });
    expect(current.body.votesUsed).toBe(3);
    expect(current.body.votesLeft).toBe(0);
    expect(current.body.myVotes.map((v: { issueId: string }) => v.issueId).sort()).toEqual([b, c, d].sort());
  });

  it("20 ta parallel so'rov (bir foydalanuvchi, 5 xil post) -> aniq 3 ta ovoz; voteCount haqiqiy COUNT ga teng", async () => {
    const issues = await Promise.all(Array.from({ length: 5 }, (_, i) => openIssue(t, w, w.residents[i % 3]!, `Parallel ${i}`)));
    const me = w.residents[0]!;

    const results = await Promise.all(Array.from({ length: 20 }, (_, i) => vote(me, issues[i % 5]!)));
    const ok = results.filter((r) => r.status === 200).length;
    const limited = results.filter((r) => r.status === 409 && r.body.error.code === 'VOTE_LIMIT_REACHED').length;
    expect(ok + limited).toBe(20);

    const total = await t.db.query<{ n: number }>('SELECT count(*)::int AS n FROM votes WHERE voter_id = $1', [me.id]);
    expect(total.rows[0]!.n).toBe(3);

    const mismatch = await t.db.query<{ issue_id: string; vote_count: number; real: number }>(
      `SELECT re.issue_id, re.vote_count,
              (SELECT count(*)::int FROM votes v WHERE v.round_id = re.round_id AND v.issue_id = re.issue_id) AS real
         FROM round_entries re`,
    );
    for (const row of mismatch.rows) expect(row.vote_count).toBe(row.real);
    expect(mismatch.rows.reduce((s, r) => s + r.vote_count, 0)).toBe(3);
  });

  it('turli foydalanuvchilar parallel ovoz bersa har birining limiti alohida', async () => {
    const issue = await openIssue(t, w, w.residents[0]!, 'Hamma ovoz beradi');
    const results = await Promise.all(w.residents.map((r) => vote(r, issue)));
    expect(results.every((r) => r.status === 200)).toBe(true);
    const detail = await t.req('GET', `/api/v1/issues/${issue}`, { token: w.residents[0]!.token });
    expect(detail.body.voteCount).toBe(3);
    expect(detail.body.myVote).toBe(true);
    expect(detail.body.canVote).toBe(false);
  });

  it('yopilgan davrga ovoz berib bo‘lmaydi (409 ROUND_CLOSED)', async () => {
    const issue = await openIssue(t, w, w.residents[0]!);
    await t.db.query("UPDATE voting_rounds SET status = 'CLOSED'");
    const res = await vote(w.residents[1]!, issue);
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('ROUND_CLOSED');
    expect((await unvote(w.residents[1]!, issue)).body.error.code).toBe('ROUND_CLOSED');
  });

  it('PENDING_REVIEW va yashirilgan postga ovoz berib bo‘lmaydi; admin ovoz bera olmaydi', async () => {
    const pending = (await createIssue(t, w.residents[0]!)).body.id as string;
    expect((await vote(w.residents[1]!, pending)).body.error.code).toBe('ISSUE_NOT_VOTABLE');

    const open = await openIssue(t, w, w.residents[0]!);
    await t.req('POST', `/api/v1/admin/content/post/${open}/hide`, { token: w.admin.token, json: { reason: 'Nomaqbul' } });
    expect((await vote(w.residents[1]!, open)).body.error.code).toBe('ISSUE_NOT_VOTABLE');

    const other = await openIssue(t, w, w.residents[0]!);
    expect((await vote(w.admin, other)).status).toBe(403);
  });

  it('lentada top-saralash, period=current va myVote/isFollowing (N+1 yo‘q) ishlaydi', async () => {
    const a = await openIssue(t, w, w.residents[0]!, 'Birinchi');
    const b = await openIssue(t, w, w.residents[0]!, 'Ikkinchi');
    await vote(w.residents[1]!, b);
    await vote(w.residents[2]!, b);
    await vote(w.residents[1]!, a);
    await t.req('PUT', `/api/v1/issues/${a}/follow`, { token: w.residents[1]!.token });

    const top = await t.req('GET', '/api/v1/issues?sort=top&period=current', { token: w.residents[1]!.token });
    expect(top.status).toBe(200);
    expect(top.body.items.map((i: { id: string }) => i.id)).toEqual([b, a]);
    expect(top.body.items[0].voteCount).toBe(2);
    expect(top.body.items[0].statusLabel).toBe('Ovoz berilmoqda');
    expect(top.body.items.every((i: { myVote: boolean }) => i.myVote)).toBe(true);
    expect(top.body.items.find((i: { id: string }) => i.id === a).isFollowing).toBe(true);

    const page1 = await t.req('GET', '/api/v1/issues?sort=top&limit=1', { token: w.residents[1]!.token });
    expect(page1.body.items).toHaveLength(1);
    expect(page1.body.nextCursor).toBeTruthy();
    const page2 = await t.req('GET', `/api/v1/issues?sort=top&limit=1&cursor=${page1.body.nextCursor}`, { token: w.residents[1]!.token });
    expect(page2.body.items[0].id).toBe(a);
    expect(page2.body.nextCursor).toBeNull();
  });
});
