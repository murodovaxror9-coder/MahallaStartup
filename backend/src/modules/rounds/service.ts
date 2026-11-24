import { AppError } from '../../common/app-error';
import type { Queryable } from '../../core/db';
import type { Deps } from '../../core/deps';
import { uuidv7 } from '../../core/ids';
import { notify } from '../../core/notify';
import type { AuthUser } from '../../core/types';
import { periodFor, type Period } from './period';

export interface RoundRow {
  id: string;
  mahalla_id: string;
  period_start: Date;
  period_end: Date;
  status: 'OPEN' | 'CLOSED';
}

export async function getOrCreateRound(q: Queryable, mahallaId: string, period: Period): Promise<RoundRow> {
  const select = () =>
    q.query<RoundRow>('SELECT * FROM voting_rounds WHERE mahalla_id = $1 AND period_start = $2', [
      mahallaId,
      period.start,
    ]);
  const found = await select();
  if (found.rows[0]) return found.rows[0];
  await q.query(
    `INSERT INTO voting_rounds (id, mahalla_id, period_start, period_end)
     VALUES ($1, $2, $3, $4) ON CONFLICT (mahalla_id, period_start) DO NOTHING`,
    [uuidv7(), mahallaId, period.start, period.end],
  );
  const again = await select();
  return again.rows[0] as RoundRow;
}

/** Joriy davr (kerak bo'lsa lazy yaratiladi; har oy 1-sanada ish ham oldindan yaratadi). */
export const currentRound = (q: Queryable, mahallaId: string, now: Date): Promise<RoundRow> =>
  getOrCreateRound(q, mahallaId, periodFor(now));

export const roundIsVotable = (round: RoundRow, now: Date): boolean =>
  round.status === 'OPEN' && now.getTime() < round.period_end.getTime();

// ---------------------------------------------------------------- ovoz berish

export interface VoteState {
  issueId: string;
  voted: boolean;
  slot: number | null;
  votesUsed: number;
  votesLeft: number;
}

async function voteState(q: Queryable, roundId: string, voterId: string, issueId: string): Promise<VoteState> {
  const mine = await q.query<{ issue_id: string; slot: number }>(
    'SELECT issue_id, slot FROM votes WHERE round_id = $1 AND voter_id = $2',
    [roundId, voterId],
  );
  const here = mine.rows.find((r) => r.issue_id === issueId);
  return {
    issueId,
    voted: Boolean(here),
    slot: here?.slot ?? null,
    votesUsed: mine.rows.length,
    votesLeft: Math.max(0, 3 - mine.rows.length),
  };
}

/**
 * Ovoz berish. 3 ta ovoz limiti LOCK'SIZ, DB cheklovlari bilan ta'minlanadi:
 *   UNIQUE(round, issue, voter) — bitta postga bitta ovoz
 *   UNIQUE(round, voter, slot) + CHECK(slot 1..3) — jami 3 tadan oshmaydi
 * Insert bo'sh slotni tanlaydi; parallel so'rovda to'qnashuv bo'lsa qayta uriniladi.
 * `vote_count` shu bitta SQL bayonotida atomik oshadi.
 */
export async function castVote(deps: Deps, user: AuthUser, issueId: string, now: Date): Promise<VoteState> {
  const q = deps.db;
  const round = await currentRound(q, user.mahallaId, now);
  if (!roundIsVotable(round, now)) throw new AppError('ROUND_CLOSED');

  const found = await q.query<{ status: string; hidden_at: Date | null; deleted_at: Date | null; entry_id: string | null }>(
    `SELECT i.status, i.hidden_at, i.deleted_at, re.id AS entry_id
       FROM issues i
       LEFT JOIN round_entries re ON re.issue_id = i.id AND re.round_id = $2
      WHERE i.id = $1 AND i.mahalla_id = $3`,
    [issueId, round.id, user.mahallaId],
  );
  const issue = found.rows[0];
  if (!issue || issue.deleted_at) throw new AppError('NOT_FOUND');
  if (issue.status !== 'OPEN' || issue.hidden_at || !issue.entry_id) throw new AppError('ISSUE_NOT_VOTABLE');

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const state = await voteState(q, round.id, user.userId, issueId);
    if (state.voted) return state; // idempotent: allaqachon ovoz bergan
    const used = await q.query<{ slot: number }>('SELECT slot FROM votes WHERE round_id = $1 AND voter_id = $2', [
      round.id,
      user.userId,
    ]);
    const taken = new Set(used.rows.map((r) => r.slot));
    const slot = [1, 2, 3].find((s) => !taken.has(s));
    if (slot === undefined) throw new AppError('VOTE_LIMIT_REACHED');

    await q.query(
      `WITH ins AS (
         INSERT INTO votes (id, round_id, issue_id, voter_id, slot, created_at)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT DO NOTHING
         RETURNING 1
       )
       UPDATE round_entries
          SET vote_count = vote_count + (SELECT count(*)::int FROM ins)
        WHERE round_id = $2 AND issue_id = $3`,
      [uuidv7(), round.id, issueId, user.userId, slot, now],
    );

    const after = await voteState(q, round.id, user.userId, issueId);
    if (after.voted) return after;
    // Boshqa parallel so'rov shu slotni oldi: qayta urinamiz
  }
  throw new AppError('VOTE_LIMIT_REACHED');
}

/** Ovozni qaytarib olish (hard delete, slot bo'shaydi). Ovoz yo'q bo'lsa ham xato emas. */
export async function removeVote(deps: Deps, user: AuthUser, issueId: string, now: Date): Promise<void> {
  const q = deps.db;
  const round = await currentRound(q, user.mahallaId, now);
  if (!roundIsVotable(round, now)) throw new AppError('ROUND_CLOSED');
  await q.query(
    `WITH del AS (
       DELETE FROM votes WHERE round_id = $1 AND issue_id = $2 AND voter_id = $3 RETURNING 1
     )
     UPDATE round_entries
        SET vote_count = vote_count - (SELECT count(*)::int FROM del)
      WHERE round_id = $1 AND issue_id = $2`,
    [round.id, issueId, user.userId],
  );
}

// ---------------------------------------------------------------- natija

export interface RankedIssue {
  issueId: string;
  title: string;
  votes: number;
  rank: number;
}

export interface RoundResultDto {
  roundId: string;
  periodStart: Date;
  periodEnd: Date;
  closedAt: Date;
  winner: RankedIssue | null;
  ranking: RankedIssue[];
  totalVoters: number;
  totalVotes: number;
  message: string;
}

export const NO_WINNER_MESSAGE = "Bu oy g'olib aniqlanmadi";

interface ResultJoin {
  round_id: string;
  period_start: Date;
  period_end: Date;
  winner_issue_id: string | null;
  snapshot: RankedIssue[];
  total_voters: number;
  total_votes: number;
  closed_at: Date;
}

export async function loadRoundResult(q: Queryable, roundId: string): Promise<RoundResultDto | null> {
  const r = await q.query<ResultJoin>(
    `SELECT rr.round_id, vr.period_start, vr.period_end, rr.winner_issue_id, rr.snapshot,
            rr.total_voters, rr.total_votes, rr.closed_at
       FROM round_results rr JOIN voting_rounds vr ON vr.id = rr.round_id
      WHERE rr.round_id = $1`,
    [roundId],
  );
  const row = r.rows[0];
  if (!row) return null;
  const winner = row.winner_issue_id ? (row.snapshot[0] ?? null) : null;
  return {
    roundId: row.round_id,
    periodStart: row.period_start,
    periodEnd: row.period_end,
    closedAt: row.closed_at,
    winner,
    ranking: row.snapshot,
    totalVoters: row.total_voters,
    totalVotes: row.total_votes,
    message: winner ? `«${winner.title}» ${winner.votes} ta ovoz bilan g'olib bo'ldi` : NO_WINNER_MESSAGE,
  };
}

/**
 * Davrni yopadi. IDEMPOTENT: `round_results` allaqachon bor bo'lsa o'shani qaytaradi
 * (job ikki marta ishlasa ham bitta natija va bitta bildirishnoma).
 * Asos — davr yopilgan paytdagi ko'rinish: `hidden_at > period_end` bo'lsa post hisobga olinadi,
 * ovozlar `created_at < period_end` filtri bilan sanaladi.
 */
export async function closeRound(deps: Pick<Deps, 'db'>, roundId: string, closeAt: Date): Promise<RoundResultDto> {
  return deps.db.tx(async (q) => {
    const rr = await q.query<RoundRow>('SELECT * FROM voting_rounds WHERE id = $1 FOR UPDATE', [roundId]);
    const round = rr.rows[0];
    if (!round) throw new AppError('NOT_FOUND');

    const existing = await loadRoundResult(q, roundId);
    if (existing) {
      if (round.status !== 'CLOSED') await q.query("UPDATE voting_rounds SET status = 'CLOSED' WHERE id = $1", [roundId]);
      return existing;
    }
    if (round.period_end.getTime() > closeAt.getTime()) {
      throw new AppError('CONFLICT', 'Davr hali tugamagan');
    }

    const cands = await q.query<{ id: string; title: string; author_id: string; votes: number }>(
      `SELECT i.id, i.title, i.author_id,
              (SELECT count(*)::int FROM votes v
                WHERE v.round_id = re.round_id AND v.issue_id = re.issue_id AND v.created_at < $2) AS votes
         FROM round_entries re
         JOIN issues i ON i.id = re.issue_id
        WHERE re.round_id = $1
          AND i.status = 'OPEN' AND i.deleted_at IS NULL
          AND (i.hidden_at IS NULL OR i.hidden_at > $2)
        ORDER BY votes DESC, i.published_at ASC, i.id ASC`,
      [roundId, round.period_end],
    );

    const ranking: RankedIssue[] = cands.rows.map((c, idx) => ({
      issueId: c.id,
      title: c.title,
      votes: c.votes,
      rank: idx + 1,
    }));
    const top = cands.rows[0];
    const winnerRow = top && top.votes > 0 ? top : null;

    const totals = await q.query<{ voters: number; votes: number }>(
      `SELECT count(DISTINCT voter_id)::int AS voters, count(*)::int AS votes
         FROM votes WHERE round_id = $1 AND created_at < $2`,
      [roundId, round.period_end],
    );
    const totalVoters = totals.rows[0]?.voters ?? 0;
    const totalVotes = totals.rows[0]?.votes ?? 0;

    await q.query(
      `INSERT INTO round_results (id, round_id, winner_issue_id, snapshot, total_voters, total_votes, closed_at)
       VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7)`,
      [uuidv7(), roundId, winnerRow?.id ?? null, JSON.stringify(ranking), totalVoters, totalVotes, closeAt],
    );
    await q.query("UPDATE voting_rounds SET status = 'CLOSED' WHERE id = $1", [roundId]);

    const voters = await q.query<{ voter_id: string }>(
      'SELECT DISTINCT voter_id FROM votes WHERE round_id = $1 AND created_at < $2',
      [roundId, round.period_end],
    );
    const voterIds = voters.rows.map((v) => v.voter_id);
    const dedupeKey = `round:${roundId}:result`;

    if (winnerRow) {
      await q.query("UPDATE issues SET status = 'SELECTED', updated_at = $2 WHERE id = $1", [winnerRow.id, closeAt]);
      await q.query(
        `INSERT INTO issue_updates (id, issue_id, actor_id, type, from_status, to_status, reason, payload, created_at)
         VALUES ($1, $2, NULL, 'STATUS_CHANGE', 'OPEN', 'SELECTED', $3, $4::jsonb, $5)`,
        [uuidv7(), winnerRow.id, "Oy g'olibi", JSON.stringify({ roundId, votes: winnerRow.votes }), closeAt],
      );
      const followers = await q.query<{ user_id: string }>('SELECT user_id FROM issue_follows WHERE issue_id = $1', [
        winnerRow.id,
      ]);
      // Bildirishnoma tegishli POST sahifasini ochadi (TZ); g'olib yo'q bo'lsa davr natijasi
      const common = { mahallaId: round.mahalla_id, type: 'ROUND_WINNER' as const, entityType: 'ISSUE' as const, entityId: winnerRow.id, dedupeKey };
      // Avval muallif (maxsus matn), keyin kuzatuvchilar va ovoz berganlar: har kimga bitta bildirishnoma
      await notify(q, {
        ...common,
        userIds: [winnerRow.author_id],
        title: "Muammongiz oy g'olibi bo'ldi!",
        body: `«${winnerRow.title}» ${winnerRow.votes} ta ovoz bilan tanlandi`,
      });
      await notify(q, {
        ...common,
        userIds: [...followers.rows.map((f) => f.user_id), ...voterIds],
        title: "Oy muammosi tanlandi",
        body: `«${winnerRow.title}» ${winnerRow.votes} ta ovoz bilan g'olib bo'ldi`,
      });
    } else {
      await notify(q, {
        mahallaId: round.mahalla_id,
        type: 'ROUND_WINNER',
        entityType: 'ROUND',
        entityId: roundId,
        dedupeKey,
        userIds: voterIds,
        title: 'Oy natijasi',
        body: NO_WINNER_MESSAGE,
      });
    }

    return (await loadRoundResult(q, roundId)) as RoundResultDto;
  });
}

/** `period_end <= now` bo'lib, hali yopilmagan davrlarni yopadi (job). */
export async function closeDueRounds(deps: Deps, now: Date): Promise<number> {
  const due = await deps.db.query<{ id: string }>(
    "SELECT id FROM voting_rounds WHERE status <> 'CLOSED' AND period_end <= $1 ORDER BY period_end",
    [now],
  );
  let closed = 0;
  for (const r of due.rows) {
    try {
      await closeRound(deps, r.id, now);
      closed += 1;
    } catch (err) {
      deps.log.error({ err, roundId: r.id }, 'davrni yopib bo\'lmadi');
    }
  }
  return closed;
}

/** Har bir mahalla uchun joriy davrni oldindan yaratadi (oy boshida cron o'rniga). */
export async function ensureCurrentRounds(deps: Deps, now: Date): Promise<void> {
  const m = await deps.db.query<{ id: string }>('SELECT id FROM mahalla');
  for (const row of m.rows) await currentRound(deps.db, row.id, now);
}
