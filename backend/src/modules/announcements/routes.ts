import { z } from 'zod';
import { AppError } from '../../common/app-error';
import { audit } from '../../core/audit';
import type { Deps } from '../../core/deps';
import { route } from '../../core/http';
import { uuidv7 } from '../../core/ids';
import { decodeCursor, pageQuery, toPage } from '../../core/pagination';
import { idParam, text } from '../../core/schemas';
import { Params } from '../../core/sql';
import type { AuthUser } from '../../core/types';

interface AnnouncementRow {
  id: string;
  title: string;
  body: string;
  is_important: boolean;
  status: 'DRAFT' | 'PUBLISHED';
  published_at: Date | null;
  created_at: Date;
  sort_at: Date;
}

const COLUMNS = `a.id, a.title, a.body, a.is_important, a.status, a.published_at, a.created_at,
                 COALESCE(a.published_at, a.created_at) AS sort_at`;

const toAnnouncement = (a: AnnouncementRow) => ({
  id: a.id,
  title: a.title,
  body: a.body,
  isImportant: a.is_important,
  status: a.status,
  publishedAt: a.published_at,
  createdAt: a.created_at,
});

async function find(deps: Pick<Deps, 'db'>, user: AuthUser, id: string): Promise<AnnouncementRow> {
  const r = await deps.db.query<AnnouncementRow>(
    `SELECT ${COLUMNS} FROM announcements a WHERE a.id = $1 AND a.mahalla_id = $2`,
    [id, user.mahallaId],
  );
  const a = r.rows[0];
  if (!a || (a.status === 'DRAFT' && user.role !== 'MAHALLA_ADMIN')) throw new AppError('NOT_FOUND');
  return a;
}

const cursorSchema = z.object({ t: z.string(), id: z.uuid() });

const list = route({
  method: 'get',
  path: '/announcements',
  auth: 'user',
  tag: "E'lonlar",
  summary: "E'lonlar (admin qoralamalarni ham ko'radi)",
  query: pageQuery,
  handler: async ({ deps, user, query }) => {
    const p = new Params();
    const where = [`a.mahalla_id = ${p.add(user.mahallaId)}`];
    if (user.role !== 'MAHALLA_ADMIN') where.push(`a.status = 'PUBLISHED'`);
    const cur = decodeCursor(query.cursor, cursorSchema);
    if (cur) where.push(`(COALESCE(a.published_at, a.created_at), a.id) < (${p.add(new Date(cur.t))}, ${p.add(cur.id)})`);
    const r = await deps.db.query<AnnouncementRow>(
      `SELECT ${COLUMNS} FROM announcements a WHERE ${where.join(' AND ')}
        ORDER BY COALESCE(a.published_at, a.created_at) DESC, a.id DESC LIMIT ${query.limit + 1}`,
      p.values,
    );
    const page = toPage(r.rows, query.limit, (l) => ({ t: l.sort_at.toISOString(), id: l.id }));
    return { items: page.items.map(toAnnouncement), nextCursor: page.nextCursor };
  },
});

const detail = route({
  method: 'get',
  path: '/announcements/:id',
  auth: 'user',
  tag: "E'lonlar",
  summary: "E'lon",
  params: idParam,
  handler: async ({ deps, user, params }) => toAnnouncement(await find(deps, user, params.id)),
});

const body = z.object({
  title: text(3, 150),
  body: text(3, 5000),
  isImportant: z.boolean().default(false),
});

const create = route({
  method: 'post',
  path: '/admin/announcements',
  auth: 'admin',
  tag: "Admin: e'lonlar",
  summary: "E'lon yaratish (DRAFT)",
  body,
  status: 201,
  handler: async ({ deps, user, body: b, now, req }) => {
    const id = uuidv7();
    await deps.db.query(
      `INSERT INTO announcements (id, mahalla_id, title, body, is_important, created_by_id, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $7)`,
      [id, user.mahallaId, b.title, b.body, b.isImportant, user.userId, now],
    );
    await audit(deps.db, { mahallaId: user.mahallaId, actorId: user.userId, action: 'announcement.create', targetType: 'ANNOUNCEMENT', targetId: id, ip: req.ip });
    return toAnnouncement(await find(deps, user, id));
  },
});

const patch = route({
  method: 'patch',
  path: '/admin/announcements/:id',
  auth: 'admin',
  tag: "Admin: e'lonlar",
  summary: "E'lonni tahrirlash",
  params: idParam,
  body: body.partial(),
  handler: async ({ deps, user, params, body: b, now, req }) => {
    const a = await find(deps, user, params.id);
    await deps.db.query(
      `UPDATE announcements SET title = COALESCE($2, title), body = COALESCE($3, body),
              is_important = COALESCE($4, is_important), updated_at = $5 WHERE id = $1`,
      [a.id, b.title ?? null, b.body ?? null, b.isImportant ?? null, now],
    );
    await audit(deps.db, { mahallaId: user.mahallaId, actorId: user.userId, action: 'announcement.update', targetType: 'ANNOUNCEMENT', targetId: a.id, ip: req.ip });
    return toAnnouncement(await find(deps, user, a.id));
  },
});

const publish = route({
  method: 'post',
  path: '/admin/announcements/:id/publish',
  auth: 'admin',
  tag: "Admin: e'lonlar",
  summary: "Nashr qilish (idempotent). Muhim e'lon a'zolarga fon vazifasida (fan-out) bildirishnoma qiladi",
  params: idParam,
  handler: async ({ deps, user, params, now, req }) => {
    const a = await find(deps, user, params.id);
    if (a.status === 'DRAFT') {
      await deps.db.query(`UPDATE announcements SET status = 'PUBLISHED', published_at = $2, updated_at = $2 WHERE id = $1`, [a.id, now]);
      await audit(deps.db, { mahallaId: user.mahallaId, actorId: user.userId, action: 'announcement.publish', targetType: 'ANNOUNCEMENT', targetId: a.id, ip: req.ip });
    }
    const fresh = await find(deps, user, a.id);
    if (fresh.is_important) deps.jobs.kick('announcement-fanout');
    return toAnnouncement(fresh);
  },
});

const remove = route({
  method: 'delete',
  path: '/admin/announcements/:id',
  auth: 'admin',
  tag: "Admin: e'lonlar",
  summary: "O'chirish (faqat qoralama)",
  params: idParam,
  status: 204,
  handler: async ({ deps, user, params, req }) => {
    const a = await find(deps, user, params.id);
    if (a.status !== 'DRAFT') throw new AppError('CONFLICT', "Faqat qoralamani o'chirish mumkin");
    await deps.db.query('DELETE FROM announcements WHERE id = $1', [a.id]);
    await audit(deps.db, { mahallaId: user.mahallaId, actorId: user.userId, action: 'announcement.delete', targetType: 'ANNOUNCEMENT', targetId: a.id, ip: req.ip });
  },
});

export const announcementRoutes = [list, detail, create, patch, publish, remove];

/**
 * Muhim e'lonni mahallaning faol a'zolariga bildirishnoma qiladi. Idempotent (unikal dedupe kalit)
 * va `fanout_done_at` bilan belgilanadi; job qayta ishlasa ham dublikat chiqmaydi.
 */
export async function fanoutAnnouncement(deps: Pick<Deps, 'db'>, id: string): Promise<number> {
  const r = await deps.db.query<{ mahalla_id: string; title: string; body: string }>(
    `SELECT mahalla_id, title, body FROM announcements WHERE id = $1 AND status = 'PUBLISHED' AND is_important`,
    [id],
  );
  const a = r.rows[0];
  if (!a) return 0;
  const ins = await deps.db.query(
    `INSERT INTO notifications (id, user_id, mahalla_id, type, title, body, entity_type, entity_id, dedupe_key)
     SELECT gen_random_uuid(), m.user_id, m.mahalla_id, 'IMPORTANT_ANNOUNCEMENT', $2::text, $3::text,
            'ANNOUNCEMENT', $1::uuid, 'announcement:' || $1::text
       FROM memberships m JOIN users u ON u.id = m.user_id
      WHERE m.mahalla_id = $4::uuid AND m.status = 'ACTIVE' AND u.status = 'ACTIVE'
     ON CONFLICT (user_id, dedupe_key) DO NOTHING`,
    [id, a.title, a.body.slice(0, 200), a.mahalla_id],
  );
  await deps.db.query('UPDATE announcements SET fanout_done_at = now() WHERE id = $1', [id]);
  return ins.rowCount;
}

export async function fanoutPendingAnnouncements(deps: Pick<Deps, 'db'>): Promise<number> {
  const pending = await deps.db.query<{ id: string }>(
    `SELECT id FROM announcements WHERE is_important AND status = 'PUBLISHED' AND fanout_done_at IS NULL`,
  );
  let n = 0;
  for (const p of pending.rows) n += await fanoutAnnouncement(deps, p.id);
  return n;
}
