import { z } from 'zod';
import { AppError } from '../../common/app-error';
import { audit } from '../../core/audit';
import type { Queryable } from '../../core/db';
import { route } from '../../core/http';
import { uuidv7 } from '../../core/ids';
import { decodeCursor, pageQuery, toPage } from '../../core/pagination';
import { generateTempPassword, hashPassword } from '../../core/password';
import { idParam, loginSchema, text } from '../../core/schemas';
import { escapeLike, isUniqueViolation, Params } from '../../core/sql';
import { revokeUserSessions } from '../auth/session';

const TEMP_PASSWORD_TTL_MS = 72 * 3600_000;

interface ResidentRow {
  id: string;
  login: string;
  display_name: string;
  phone: string | null;
  status: 'ACTIVE' | 'BLOCKED';
  blocked_reason: string | null;
  must_change_password: boolean;
  temp_password_expires_at: Date | null;
  created_at: Date;
}

const toResident = (r: ResidentRow) => ({
  id: r.id,
  login: r.login,
  displayName: r.display_name,
  phone: r.phone,
  status: r.status,
  blockedReason: r.blocked_reason,
  mustChangePassword: r.must_change_password,
  tempPasswordExpiresAt: r.temp_password_expires_at,
  createdAt: r.created_at,
});

const COLUMNS = `u.id, u.login, u.display_name, u.phone, u.status, u.blocked_reason,
                 u.must_change_password, u.temp_password_expires_at, u.created_at`;

async function loadResident(q: Queryable, mahallaId: string, id: string): Promise<ResidentRow> {
  const r = await q.query<ResidentRow>(
    `SELECT ${COLUMNS} FROM users u JOIN memberships m ON m.user_id = u.id
      WHERE u.id = $1 AND m.mahalla_id = $2 AND m.role = 'RESIDENT'`,
    [id, mahallaId],
  );
  const row = r.rows[0];
  if (!row) throw new AppError('NOT_FOUND');
  return row;
}

const cursorSchema = z.object({ at: z.string(), id: z.uuid() });

const list = route({
  method: 'get',
  path: '/admin/residents',
  auth: 'admin',
  tag: 'Admin: aholi',
  summary: "Aholi ro'yxati",
  query: pageQuery.extend({
    query: z.string().trim().max(100).optional(),
    status: z.enum(['ACTIVE', 'BLOCKED']).optional(),
  }),
  handler: async ({ deps, user, query }) => {
    const p = new Params();
    const where = [`m.mahalla_id = ${p.add(user.mahallaId)}`, `m.role = 'RESIDENT'`];
    if (query.status) where.push(`u.status = ${p.add(query.status)}`);
    if (query.query) {
      const like = p.add(`%${escapeLike(query.query)}%`);
      where.push(`(u.display_name ILIKE ${like} OR u.login ILIKE ${like} OR u.phone ILIKE ${like})`);
    }
    const cur = decodeCursor(query.cursor, cursorSchema);
    if (cur) where.push(`(u.created_at, u.id) < (${p.add(new Date(cur.at))}, ${p.add(cur.id)})`);

    const r = await deps.db.query<ResidentRow>(
      `SELECT ${COLUMNS} FROM users u JOIN memberships m ON m.user_id = u.id
        WHERE ${where.join(' AND ')}
        ORDER BY u.created_at DESC, u.id DESC LIMIT ${query.limit + 1}`,
      p.values,
    );
    const page = toPage(r.rows, query.limit, (last) => ({ at: last.created_at.toISOString(), id: last.id }));
    return { items: page.items.map(toResident), nextCursor: page.nextCursor };
  },
});

const detail = route({
  method: 'get',
  path: '/admin/residents/:id',
  auth: 'admin',
  tag: 'Admin: aholi',
  summary: "Aholi a'zosi",
  params: idParam,
  handler: async ({ deps, user, params }) => toResident(await loadResident(deps.db, user.mahallaId, params.id)),
});

const create = route({
  method: 'post',
  path: '/admin/residents',
  auth: 'admin',
  tag: 'Admin: aholi',
  summary: "Aholi akkaunti yaratish (vaqtinchalik parol bir marta qaytadi)",
  body: z.object({
    displayName: text(2, 100),
    login: loginSchema,
    phone: z
      .string()
      .trim()
      .regex(/^[+0-9 ()-]{5,32}$/, "Telefon raqami noto'g'ri")
      .optional(),
  }),
  status: 201,
  handler: async ({ deps, user, body, now, req }) => {
    const temporaryPassword = generateTempPassword();
    const hash = await hashPassword(temporaryPassword);
    const expiresAt = new Date(now.getTime() + TEMP_PASSWORD_TTL_MS);
    const id = uuidv7();
    try {
      await deps.db.tx(async (q) => {
        await q.query(
          `INSERT INTO users (id, login, display_name, phone, password_hash, must_change_password, temp_password_expires_at, created_at)
           VALUES ($1, $2, $3, $4, $5, true, $6, $7)`,
          [id, body.login, body.displayName, body.phone ?? null, hash, expiresAt, now],
        );
        await q.query(
          `INSERT INTO memberships (id, user_id, mahalla_id, role, created_at) VALUES ($1, $2, $3, 'RESIDENT', $4)`,
          [uuidv7(), id, user.mahallaId, now],
        );
        await audit(q, {
          mahallaId: user.mahallaId,
          actorId: user.userId,
          action: 'resident.create',
          targetType: 'USER',
          targetId: id,
          meta: { login: body.login },
          ip: req.ip,
        });
      });
    } catch (err) {
      if (isUniqueViolation(err)) {
        throw new AppError('CONFLICT', 'Bu login band', { fields: { login: 'Bu login band' } });
      }
      throw err;
    }
    const resident = await loadResident(deps.db, user.mahallaId, id);
    return { user: toResident(resident), temporaryPassword, expiresAt };
  },
});

const resetPassword = route({
  method: 'post',
  path: '/admin/residents/:id/reset-password',
  auth: 'admin',
  tag: 'Admin: aholi',
  summary: "Parolni tiklash (yangi vaqtinchalik parol, barcha sessiyalar bekor)",
  params: idParam,
  handler: async ({ deps, user, params, now, req }) => {
    await loadResident(deps.db, user.mahallaId, params.id);
    const temporaryPassword = generateTempPassword();
    const hash = await hashPassword(temporaryPassword);
    const expiresAt = new Date(now.getTime() + TEMP_PASSWORD_TTL_MS);
    await deps.db.query(
      `UPDATE users SET password_hash = $2, must_change_password = true, temp_password_expires_at = $3 WHERE id = $1`,
      [params.id, hash, expiresAt],
    );
    await revokeUserSessions(deps, params.id, now);
    await audit(deps.db, {
      mahallaId: user.mahallaId,
      actorId: user.userId,
      action: 'resident.reset_password',
      targetType: 'USER',
      targetId: params.id,
      ip: req.ip,
    });
    return { temporaryPassword, expiresAt };
  },
});

const block = route({
  method: 'post',
  path: '/admin/residents/:id/block',
  auth: 'admin',
  tag: 'Admin: aholi',
  summary: "Bloklash (barcha sessiyalar darhol bekor)",
  params: idParam,
  body: z.object({ reason: text(3, 500) }),
  handler: async ({ deps, user, params, body, now, req }) => {
    await loadResident(deps.db, user.mahallaId, params.id);
    await deps.db.query(`UPDATE users SET status = 'BLOCKED', blocked_reason = $2 WHERE id = $1`, [
      params.id,
      body.reason,
    ]);
    await revokeUserSessions(deps, params.id, now);
    await audit(deps.db, {
      mahallaId: user.mahallaId,
      actorId: user.userId,
      action: 'resident.block',
      targetType: 'USER',
      targetId: params.id,
      reason: body.reason,
      ip: req.ip,
    });
    return toResident(await loadResident(deps.db, user.mahallaId, params.id));
  },
});

const unblock = route({
  method: 'post',
  path: '/admin/residents/:id/unblock',
  auth: 'admin',
  tag: 'Admin: aholi',
  summary: 'Blokdan chiqarish',
  params: idParam,
  handler: async ({ deps, user, params, req }) => {
    await loadResident(deps.db, user.mahallaId, params.id);
    await deps.db.query(`UPDATE users SET status = 'ACTIVE', blocked_reason = NULL WHERE id = $1`, [params.id]);
    await audit(deps.db, {
      mahallaId: user.mahallaId,
      actorId: user.userId,
      action: 'resident.unblock',
      targetType: 'USER',
      targetId: params.id,
      ip: req.ip,
    });
    return toResident(await loadResident(deps.db, user.mahallaId, params.id));
  },
});

export const residentRoutes = [list, detail, create, resetPassword, block, unblock];
