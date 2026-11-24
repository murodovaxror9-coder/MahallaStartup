import { z } from 'zod';
import { AppError } from '../../common/app-error';
import { audit } from '../../core/audit';
import { clearSessionCookies, route, setSessionCookies } from '../../core/http';
import { uuidv7 } from '../../core/ids';
import { getDummyHash, hashPassword, verifyPassword } from '../../core/password';
import { text } from '../../core/schemas';
import type { Role } from '../../core/types';
import { authMeta } from '../../middleware/auth';
import { rateLimit } from '../../middleware/rate-limit';
import { createSession, dropSessionCache, newToken, revokeSession, revokeUserSessions } from './session';

export const userSchema = z.object({
  id: z.uuid(),
  login: z.string(),
  displayName: z.string(),
  phone: z.string().nullable(),
  role: z.enum(['RESIDENT', 'MAHALLA_ADMIN']),
  mahalla: z.object({ id: z.uuid(), name: z.string(), slug: z.string() }),
});

interface LoginRow {
  id: string;
  login: string;
  display_name: string;
  phone: string | null;
  password_hash: string;
  must_change_password: boolean;
  temp_password_expires_at: Date | null;
  user_status: 'ACTIVE' | 'BLOCKED';
  mahalla_id: string;
  role: Role;
  membership_status: 'ACTIVE' | 'INACTIVE';
  mahalla_name: string;
  mahalla_slug: string;
}

const toUser = (r: LoginRow) => ({
  id: r.id,
  login: r.login,
  displayName: r.display_name,
  phone: r.phone,
  role: r.role,
  mahalla: { id: r.mahalla_id, name: r.mahalla_name, slug: r.mahalla_slug },
});

const FAIL_LIMIT = 5;
const FAIL_WINDOW_SEC = 15 * 60;

const login = route({
  method: 'post',
  path: '/auth/login',
  auth: 'public',
  tag: 'Auth',
  summary: 'Kirish (mobil: Bearer token, veb: HttpOnly cookie)',
  description:
    "Mobil: `{ token, user, mustChangePassword }`. Veb: `Set-Cookie: mhd_session` + `mhd_csrf` va `{ user, mustChangePassword }`. " +
    "Bitta login uchun 5 ketma-ket xato -> 15 daqiqa blok (429 TOO_MANY_ATTEMPTS).",
  body: z.object({
    login: z.string().trim().toLowerCase().min(1).max(64),
    password: z.string().min(1).max(200),
    client: z.enum(['mobile', 'web']),
  }),
  handler: async (ctx) => {
    const { deps, body, req, res } = ctx;
    const ip = req.ip ?? 'unknown';

    await rateLimit(deps, { name: 'login-ip', limit: deps.env.LOGIN_IP_LIMIT, windowSec: 600, key: ip });

    const failKey = `login:fail:${body.login}`;
    const fails = Number((await deps.kv.get(failKey)) ?? 0);
    if (fails >= FAIL_LIMIT) {
      const ttl = await deps.kv.ttl(failKey);
      throw new AppError('TOO_MANY_ATTEMPTS', undefined, { retryAfterSec: ttl > 0 ? ttl : FAIL_WINDOW_SEC });
    }

    const found = await deps.db.query<LoginRow>(
      `SELECT u.id, u.login, u.display_name, u.phone, u.password_hash, u.must_change_password,
              u.temp_password_expires_at, u.status AS user_status,
              m.mahalla_id, m.role, m.status AS membership_status,
              h.name AS mahalla_name, h.slug AS mahalla_slug
         FROM users u
         JOIN memberships m ON m.user_id = u.id
         JOIN mahalla h ON h.id = m.mahalla_id
        WHERE u.login = $1`,
      [body.login],
    );
    const user = found.rows[0];
    const ok = await verifyPassword(user?.password_hash ?? (await getDummyHash()), body.password);
    if (!user || !ok) {
      const n = await deps.kv.incr(failKey, FAIL_WINDOW_SEC);
      // 5-xatodan keyin blok to'liq 15 daqiqa davom etishi uchun muddatni yangilaymiz
      if (n >= FAIL_LIMIT) await deps.kv.set(failKey, String(n), FAIL_WINDOW_SEC);
      throw new AppError('INVALID_CREDENTIALS');
    }

    if (user.user_status !== 'ACTIVE' || user.membership_status !== 'ACTIVE') {
      throw new AppError('FORBIDDEN', 'Akkaunt bloklangan. Mahalla adminiga murojaat qiling');
    }
    if (
      user.must_change_password &&
      user.temp_password_expires_at &&
      user.temp_password_expires_at.getTime() <= ctx.now.getTime()
    ) {
      throw new AppError('TEMP_PASSWORD_EXPIRED');
    }

    await deps.kv.del(failKey);
    const client = body.client === 'web' ? 'WEB' : 'MOBILE';
    const session = await createSession(deps.db, {
      userId: user.id,
      client,
      ip,
      userAgent: req.headers['user-agent'] ?? null,
      now: ctx.now,
    });

    if (client === 'WEB') {
      setSessionCookies(res, deps, session.token, newToken());
      return { user: toUser(user), mustChangePassword: user.must_change_password };
    }
    return { token: session.token, user: toUser(user), mustChangePassword: user.must_change_password };
  },
});

const logout = route({
  method: 'post',
  path: '/auth/logout',
  auth: 'user',
  allowWhileMustChange: true,
  tag: 'Auth',
  summary: 'Chiqish (joriy sessiyani bekor qiladi)',
  status: 204,
  handler: async (ctx) => {
    await revokeSession(ctx.deps, ctx.user.sessionId, ctx.now);
    clearSessionCookies(ctx.res);
  },
});

const changePassword = route({
  method: 'post',
  path: '/auth/change-password',
  auth: 'user',
  allowWhileMustChange: true,
  tag: 'Auth',
  summary: "Parolni almashtirish (joriy sessiyadan boshqalari bekor qilinadi)",
  body: z.object({
    currentPassword: z.string().min(1).max(200),
    newPassword: text(8, 200),
  }),
  status: 204,
  handler: async (ctx) => {
    const { deps, user, body } = ctx;
    const r = await deps.db.query<{ password_hash: string }>('SELECT password_hash FROM users WHERE id = $1', [
      user.userId,
    ]);
    const hash = r.rows[0]?.password_hash;
    if (!hash || !(await verifyPassword(hash, body.currentPassword))) {
      throw new AppError('VALIDATION_ERROR', undefined, {
        fields: { currentPassword: "Joriy parol noto'g'ri" },
      });
    }
    if (body.newPassword === body.currentPassword) {
      throw new AppError('VALIDATION_ERROR', undefined, {
        fields: { newPassword: 'Yangi parol joriy paroldan farq qilsin' },
      });
    }

    const next = await hashPassword(body.newPassword);
    await deps.db.query(
      `UPDATE users SET password_hash = $2, must_change_password = false, temp_password_expires_at = NULL WHERE id = $1`,
      [user.userId, next],
    );
    await revokeUserSessions(deps, user.userId, ctx.now, user.sessionId);
    const meta = authMeta(ctx.req);
    if (meta) await dropSessionCache(deps, meta.token); // mustChangePassword keshda eskirmasin
    await audit(deps.db, {
      mahallaId: user.mahallaId,
      actorId: user.userId,
      action: 'auth.change_password',
      targetType: 'USER',
      targetId: user.userId,
      ip: ctx.req.ip,
    });
  },
});

const me = route({
  method: 'get',
  path: '/me',
  auth: 'user',
  allowWhileMustChange: true,
  tag: 'Auth',
  summary: 'Joriy foydalanuvchi',
  handler: async ({ deps, user }) => {
    const r = await deps.db.query<{ phone: string | null; unread: number }>(
      `SELECT u.phone,
              (SELECT count(*)::int FROM notifications n WHERE n.user_id = u.id AND n.read_at IS NULL) AS unread
         FROM users u WHERE u.id = $1`,
      [user.userId],
    );
    const row = r.rows[0];
    return {
      user: {
        id: user.userId,
        login: user.login,
        displayName: user.displayName,
        phone: row?.phone ?? null,
        role: user.role,
        mahalla: { id: user.mahallaId, name: user.mahallaName, slug: user.mahallaSlug },
      },
      mahalla: { id: user.mahallaId, name: user.mahallaName, slug: user.mahallaSlug },
      role: user.role,
      mustChangePassword: user.mustChangePassword,
      unreadNotifications: row?.unread ?? 0,
    };
  },
});

const putDevice = route({
  method: 'put',
  path: '/devices',
  auth: 'user',
  tag: 'Auth',
  summary: "Push token'ni ro'yxatdan o'tkazish (idempotent)",
  body: z.object({
    expoPushToken: z.string().trim().min(10).max(200),
    platform: z.enum(['ios', 'android']),
  }),
  status: 204,
  handler: async ({ deps, user, body, now }) => {
    await deps.db.query(
      `INSERT INTO device_tokens (id, user_id, expo_push_token, platform, last_seen_at)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (expo_push_token) DO UPDATE
         SET user_id = EXCLUDED.user_id, platform = EXCLUDED.platform, last_seen_at = EXCLUDED.last_seen_at`,
      [uuidv7(), user.userId, body.expoPushToken, body.platform, now],
    );
  },
});

const deleteDevice = route({
  method: 'delete',
  path: '/devices/:token',
  auth: 'user',
  tag: 'Auth',
  summary: "Push token'ni o'chirish",
  params: z.object({ token: z.string().min(10).max(200) }),
  status: 204,
  handler: async ({ deps, user, params }) => {
    await deps.db.query('DELETE FROM device_tokens WHERE expo_push_token = $1 AND user_id = $2', [
      params.token,
      user.userId,
    ]);
  },
});

export const authRoutes = [login, logout, changePassword, me, putDevice, deleteDevice];
