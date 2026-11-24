import { z } from 'zod';
import { AppError } from '../../common/app-error';
import { audit } from '../../core/audit';
import { route } from '../../core/http';
import { uuidv7 } from '../../core/ids';
import { decodeCursor, pageQuery, toPage } from '../../core/pagination';
import { idParam, text, uuid } from '../../core/schemas';
import { Params } from '../../core/sql';
import { requireVisibleIssue } from '../issues/service';
import { hideContent, type ContentType } from './content';

const TARGETS = ['POST', 'COMMENT', 'CHAT_MESSAGE'] as const;
type TargetType = (typeof TARGETS)[number];

const contentTypeOf: Record<TargetType, ContentType> = {
  POST: 'post',
  COMMENT: 'comment',
  CHAT_MESSAGE: 'chat_message',
};

interface ReportRow {
  id: string;
  target_type: TargetType;
  target_id: string;
  reporter_id: string;
  reason: string;
  status: 'OPEN' | 'ACTIONED' | 'DISMISSED';
  resolution: string | null;
  created_at: Date;
  resolved_at: Date | null;
}

const toReport = (r: ReportRow) => ({
  id: r.id,
  targetType: r.target_type,
  targetId: r.target_id,
  reason: r.reason,
  status: r.status,
  resolution: r.resolution,
  createdAt: r.created_at,
  resolvedAt: r.resolved_at,
});

const create = route({
  method: 'post',
  path: '/reports',
  auth: 'resident',
  tag: 'Shikoyatlar',
  summary: "Shikoyat qilish (POST | COMMENT | CHAT_MESSAGE); bir kontentga bitta shikoyat — takroriy so'rov 200",
  body: z.object({ targetType: z.enum(TARGETS), targetId: uuid, reason: text(3, 500) }),
  limit: { name: 'report', limit: 20, windowSec: 3600 },
  status: 201,
  handler: async (ctx) => {
    const { deps, user, body, now } = ctx;

    // Obyekt shu mahallada va shikoyatchiga ko'rinadigan bo'lishi shart (aks holda 404)
    if (body.targetType === 'POST') {
      const { vis } = await requireVisibleIssue(deps.db, user, body.targetId);
      if (vis !== 'full') throw new AppError('NOT_FOUND');
    } else if (body.targetType === 'COMMENT') {
      const c = await deps.db.query<{ issue_id: string }>(
        'SELECT issue_id FROM comments WHERE id = $1 AND mahalla_id = $2 AND hidden_at IS NULL',
        [body.targetId, user.mahallaId],
      );
      if (!c.rows[0]) throw new AppError('NOT_FOUND');
      await requireVisibleIssue(deps.db, user, c.rows[0].issue_id);
    } else {
      const m = await deps.db.query(
        'SELECT 1 FROM chat_messages WHERE id = $1 AND mahalla_id = $2 AND hidden_at IS NULL',
        [body.targetId, user.mahallaId],
      );
      if (m.rows.length === 0) throw new AppError('NOT_FOUND');
    }

    const ins = await deps.db.query<ReportRow>(
      `INSERT INTO reports (id, mahalla_id, reporter_id, target_type, target_id, reason, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (reporter_id, target_type, target_id) DO NOTHING
       RETURNING id, target_type, target_id, reporter_id, reason, status, resolution, created_at, resolved_at`,
      [uuidv7(), user.mahallaId, user.userId, body.targetType, body.targetId, body.reason, now],
    );
    if (ins.rows[0]) return toReport(ins.rows[0]);

    ctx.status = 200;
    const existing = await deps.db.query<ReportRow>(
      `SELECT id, target_type, target_id, reporter_id, reason, status, resolution, created_at, resolved_at
         FROM reports WHERE reporter_id = $1 AND target_type = $2 AND target_id = $3`,
      [user.userId, body.targetType, body.targetId],
    );
    return toReport(existing.rows[0] as ReportRow);
  },
});

const cursorSchema = z.object({ t: z.string(), id: z.uuid() });

const adminList = route({
  method: 'get',
  path: '/admin/reports',
  auth: 'admin',
  tag: 'Admin: moderatsiya',
  summary: "Shikoyatlar ro'yxati (kontent matni bilan)",
  query: pageQuery.extend({ status: z.enum(['OPEN', 'ACTIONED', 'DISMISSED']).optional() }),
  handler: async ({ deps, user, query }) => {
    const p = new Params();
    const where = [`r.mahalla_id = ${p.add(user.mahallaId)}`];
    if (query.status) where.push(`r.status = ${p.add(query.status)}`);
    const cur = decodeCursor(query.cursor, cursorSchema);
    if (cur) where.push(`(r.created_at, r.id) < (${p.add(new Date(cur.t))}, ${p.add(cur.id)})`);

    const r = await deps.db.query<
      ReportRow & { reporter_name: string; content_preview: string | null; content_hidden: boolean }
    >(
      `SELECT r.id, r.target_type, r.target_id, r.reporter_id, r.reason, r.status, r.resolution, r.created_at,
              r.resolved_at, ru.display_name AS reporter_name,
              CASE r.target_type WHEN 'POST' THEN i.title WHEN 'COMMENT' THEN c.text ELSE cm.text END AS content_preview,
              (CASE r.target_type WHEN 'POST' THEN i.hidden_at WHEN 'COMMENT' THEN c.hidden_at ELSE cm.hidden_at END IS NOT NULL) AS content_hidden
         FROM reports r
         JOIN users ru ON ru.id = r.reporter_id
         LEFT JOIN issues i ON r.target_type = 'POST' AND i.id = r.target_id
         LEFT JOIN comments c ON r.target_type = 'COMMENT' AND c.id = r.target_id
         LEFT JOIN chat_messages cm ON r.target_type = 'CHAT_MESSAGE' AND cm.id = r.target_id
        WHERE ${where.join(' AND ')}
        ORDER BY r.created_at DESC, r.id DESC LIMIT ${query.limit + 1}`,
      p.values,
    );
    const page = toPage(r.rows, query.limit, (l) => ({ t: l.created_at.toISOString(), id: l.id }));
    return {
      items: page.items.map((x) => ({
        ...toReport(x),
        reporterName: x.reporter_name,
        contentPreview: x.content_preview,
        contentHidden: x.content_hidden,
      })),
      nextCursor: page.nextCursor,
    };
  },
});

const adminHide = route({
  method: 'post',
  path: '/admin/reports/:id/hide',
  auth: 'admin',
  tag: 'Admin: moderatsiya',
  summary: "Shikoyat bo'yicha kontentni yashirish (sabab majburiy)",
  params: idParam,
  body: z.object({ reason: text(3, 500) }),
  handler: async ({ deps, user, params, body, now, req }) => {
    return deps.db.tx(async (q) => {
      const found = await q.query<ReportRow>(
        `SELECT id, target_type, target_id, reporter_id, reason, status, resolution, created_at, resolved_at
           FROM reports WHERE id = $1 AND mahalla_id = $2 FOR UPDATE`,
        [params.id, user.mahallaId],
      );
      const rep = found.rows[0];
      if (!rep) throw new AppError('NOT_FOUND');
      if (rep.status !== 'OPEN') throw new AppError('CONFLICT', "Shikoyat allaqachon ko'rib chiqilgan");

      await hideContent(deps, q, user, contentTypeOf[rep.target_type], rep.target_id, body.reason, now, req.ip);
      // Shu kontentga tushgan barcha ochiq shikoyatlar yopiladi
      await q.query(
        `UPDATE reports SET status = 'ACTIONED', resolved_by_id = $4, resolution = $5, resolved_at = $6
          WHERE mahalla_id = $1 AND target_type = $2 AND target_id = $3 AND status = 'OPEN'`,
        [user.mahallaId, rep.target_type, rep.target_id, user.userId, body.reason, now],
      );
      await audit(q, {
        mahallaId: user.mahallaId,
        actorId: user.userId,
        action: 'report.hide',
        targetType: 'REPORT',
        targetId: rep.id,
        reason: body.reason,
        ip: req.ip,
      });
      return { id: rep.id, status: 'ACTIONED' as const };
    });
  },
});

const adminDismiss = route({
  method: 'post',
  path: '/admin/reports/:id/dismiss',
  auth: 'admin',
  tag: 'Admin: moderatsiya',
  summary: 'Shikoyatni rad etish',
  params: idParam,
  body: z.object({ reason: text(3, 500).optional() }),
  handler: async ({ deps, user, params, body, now, req }) => {
    const r = await deps.db.query(
      `UPDATE reports SET status = 'DISMISSED', resolved_by_id = $3, resolution = $4, resolved_at = $5
        WHERE id = $1 AND mahalla_id = $2 AND status = 'OPEN'`,
      [params.id, user.mahallaId, user.userId, body.reason ?? null, now],
    );
    if (r.rowCount === 0) {
      const exists = await deps.db.query('SELECT 1 FROM reports WHERE id = $1 AND mahalla_id = $2', [params.id, user.mahallaId]);
      if (exists.rows.length === 0) throw new AppError('NOT_FOUND');
      throw new AppError('CONFLICT', "Shikoyat allaqachon ko'rib chiqilgan");
    }
    await audit(deps.db, {
      mahallaId: user.mahallaId,
      actorId: user.userId,
      action: 'report.dismiss',
      targetType: 'REPORT',
      targetId: params.id,
      reason: body.reason ?? null,
      ip: req.ip,
    });
    return { id: params.id, status: 'DISMISSED' as const };
  },
});

export const moderationRoutes = [create, adminList, adminHide, adminDismiss];
