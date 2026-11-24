import { z } from 'zod';
import { route } from '../../core/http';
import { decodeCursor, pageQuery, toPage } from '../../core/pagination';
import { Params } from '../../core/sql';
import { currentRound } from '../rounds/service';
import { tashkentToday } from '../issues/service';

const dashboard = route({
  method: 'get',
  path: '/admin/dashboard',
  auth: 'admin',
  tag: 'Admin',
  summary: "Bosh sahifa: faol ovoz beruvchilar, moderatsiya, muddati o'tgan ishlar, tadbir, shikoyatlar",
  handler: async ({ deps, user, now }) => {
    const q = deps.db;
    const m = user.mahallaId;
    const round = await currentRound(q, m, now);
    const today = tashkentToday(now);

    const [voters, pending, overdue, reports, residents, nextEvent] = await Promise.all([
      q.query<{ n: number }>('SELECT count(DISTINCT voter_id)::int AS n FROM votes WHERE round_id = $1', [round.id]),
      q.query<{ n: number }>(`SELECT count(*)::int AS n FROM issues WHERE mahalla_id = $1 AND status = 'PENDING_REVIEW' AND deleted_at IS NULL`, [m]),
      q.query<{ n: number }>(
        `SELECT count(*)::int AS n FROM issues
          WHERE mahalla_id = $1 AND deleted_at IS NULL AND status IN ('IN_PROGRESS', 'REFERRED')
            AND (due_date < $2::date OR follow_up_at < $2::date)`,
        [m, today],
      ),
      q.query<{ n: number }>(`SELECT count(*)::int AS n FROM reports WHERE mahalla_id = $1 AND status = 'OPEN'`, [m]),
      q.query<{ n: number }>(
        `SELECT count(*)::int AS n FROM memberships WHERE mahalla_id = $1 AND role = 'RESIDENT' AND status = 'ACTIVE'`,
        [m],
      ),
      q.query<{ id: string; title: string; starts_at: Date; location: string; rsvp_count: number }>(
        `SELECT id, title, starts_at, location, rsvp_count FROM events
          WHERE mahalla_id = $1 AND status = 'PUBLISHED' AND starts_at >= $2 ORDER BY starts_at LIMIT 1`,
        [m, now],
      ),
    ]);
    const ev = nextEvent.rows[0];
    return {
      round: { id: round.id, periodStart: round.period_start, periodEnd: round.period_end, status: round.status },
      activeVoters: voters.rows[0]?.n ?? 0,
      totalResidents: residents.rows[0]?.n ?? 0,
      pendingModeration: pending.rows[0]?.n ?? 0,
      overdueIssues: overdue.rows[0]?.n ?? 0,
      openReports: reports.rows[0]?.n ?? 0,
      nextEvent: ev ? { id: ev.id, title: ev.title, startsAt: ev.starts_at, location: ev.location, rsvpCount: ev.rsvp_count } : null,
    };
  },
});

const cursorSchema = z.object({ t: z.string(), id: z.uuid() });

const auditList = route({
  method: 'get',
  path: '/admin/audit',
  auth: 'admin',
  tag: 'Admin',
  summary: 'Audit jurnali (parol/token/push token hech qachon yozilmaydi)',
  query: pageQuery.extend({ action: z.string().trim().max(100).optional(), actorId: z.uuid().optional() }),
  handler: async ({ deps, user, query }) => {
    const p = new Params();
    const where = [`a.mahalla_id = ${p.add(user.mahallaId)}`];
    if (query.action) where.push(`a.action = ${p.add(query.action)}`);
    if (query.actorId) where.push(`a.actor_id = ${p.add(query.actorId)}`);
    const cur = decodeCursor(query.cursor, cursorSchema);
    if (cur) where.push(`(a.created_at, a.id) < (${p.add(new Date(cur.t))}, ${p.add(cur.id)})`);
    const r = await deps.db.query<{
      id: string;
      action: string;
      actor_id: string | null;
      actor_name: string | null;
      target_type: string;
      target_id: string | null;
      reason: string | null;
      meta: Record<string, unknown>;
      ip: string | null;
      created_at: Date;
    }>(
      `SELECT a.id, a.action, a.actor_id, u.display_name AS actor_name, a.target_type, a.target_id, a.reason, a.meta, a.ip, a.created_at
         FROM audit_events a LEFT JOIN users u ON u.id = a.actor_id
        WHERE ${where.join(' AND ')} ORDER BY a.created_at DESC, a.id DESC LIMIT ${query.limit + 1}`,
      p.values,
    );
    const page = toPage(r.rows, query.limit, (l) => ({ t: l.created_at.toISOString(), id: l.id }));
    return {
      items: page.items.map((a) => ({
        id: a.id,
        action: a.action,
        actorId: a.actor_id,
        actorName: a.actor_name,
        targetType: a.target_type,
        targetId: a.target_id,
        reason: a.reason,
        meta: a.meta,
        ip: a.ip,
        createdAt: a.created_at,
      })),
      nextCursor: page.nextCursor,
    };
  },
});

export const adminRoutes = [dashboard, auditList];
