import { z } from 'zod';
import { AppError } from '../../common/app-error';
import { route } from '../../core/http';
import { decodeCursor, pageQuery, toPage } from '../../core/pagination';
import { idParam } from '../../core/schemas';
import { Params } from '../../core/sql';

interface NotificationRow {
  id: string;
  type: string;
  title: string;
  body: string;
  entity_type: string;
  entity_id: string;
  read_at: Date | null;
  created_at: Date;
}

const toNotification = (n: NotificationRow) => ({
  id: n.id,
  type: n.type,
  title: n.title,
  body: n.body,
  entityType: n.entity_type,
  entityId: n.entity_id,
  read: n.read_at !== null,
  readAt: n.read_at,
  createdAt: n.created_at,
});

const cursorSchema = z.object({ t: z.string(), id: z.uuid() });

const list = route({
  method: 'get',
  path: '/notifications',
  auth: 'user',
  tag: 'Bildirishnomalar',
  summary: "Bildirishnomalar (yangisidan eskisiga)",
  query: pageQuery,
  handler: async ({ deps, user, query }) => {
    const p = new Params();
    const where = [`user_id = ${p.add(user.userId)}`];
    const cur = decodeCursor(query.cursor, cursorSchema);
    if (cur) where.push(`(created_at, id) < (${p.add(new Date(cur.t))}, ${p.add(cur.id)})`);
    const r = await deps.db.query<NotificationRow>(
      `SELECT id, type, title, body, entity_type, entity_id, read_at, created_at FROM notifications
        WHERE ${where.join(' AND ')} ORDER BY created_at DESC, id DESC LIMIT ${query.limit + 1}`,
      p.values,
    );
    const page = toPage(r.rows, query.limit, (l) => ({ t: l.created_at.toISOString(), id: l.id }));
    return { items: page.items.map(toNotification), nextCursor: page.nextCursor };
  },
});

// `/notifications/unread-count` va `/notifications/read-all` dinamik `:id/read` bilan to'qnashmaydi (boshqa shakl)
const unread = route({
  method: 'get',
  path: '/notifications/unread-count',
  auth: 'user',
  tag: 'Bildirishnomalar',
  summary: "O'qilmaganlar soni (qisman indeks bo'yicha)",
  handler: async ({ deps, user }) => {
    const r = await deps.db.query<{ count: number }>(
      'SELECT count(*)::int AS count FROM notifications WHERE user_id = $1 AND read_at IS NULL',
      [user.userId],
    );
    return { count: r.rows[0]?.count ?? 0 };
  },
});

const readAll = route({
  method: 'post',
  path: '/notifications/read-all',
  auth: 'user',
  tag: 'Bildirishnomalar',
  summary: "Hammasini o'qilgan deb belgilash",
  status: 204,
  handler: async ({ deps, user, now }) => {
    await deps.db.query('UPDATE notifications SET read_at = $2 WHERE user_id = $1 AND read_at IS NULL', [user.userId, now]);
  },
});

const read = route({
  method: 'post',
  path: '/notifications/:id/read',
  auth: 'user',
  tag: 'Bildirishnomalar',
  summary: "O'qilgan deb belgilash (idempotent)",
  params: idParam,
  status: 204,
  handler: async ({ deps, user, params, now }) => {
    const r = await deps.db.query('SELECT 1 FROM notifications WHERE id = $1 AND user_id = $2', [params.id, user.userId]);
    if (r.rows.length === 0) throw new AppError('NOT_FOUND');
    await deps.db.query('UPDATE notifications SET read_at = COALESCE(read_at, $3) WHERE id = $1 AND user_id = $2', [
      params.id,
      user.userId,
      now,
    ]);
  },
});

export const notificationRoutes = [list, unread, readAll, read];
