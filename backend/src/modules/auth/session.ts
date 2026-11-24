import { createHash, randomBytes } from 'node:crypto';
import type { Queryable } from '../../core/db';
import type { Deps } from '../../core/deps';
import { uuidv7 } from '../../core/ids';
import type { AuthUser, ClientKind, Role } from '../../core/types';

/** Mobil: 30 kun, veb: 12 soat (ikkalasi ham sliding). */
export const SESSION_TTL_MS: Record<ClientKind, number> = {
  MOBILE: 30 * 24 * 3600_000,
  WEB: 12 * 3600_000,
};
const SLIDE_AFTER_MS = 5 * 60_000;
const CACHE_TTL_SEC = 60;

export const hashToken = (token: string): string => createHash('sha256').update(token).digest('hex');
export const newToken = (): string => randomBytes(32).toString('base64url');
export const sessionCacheKey = (hash: string): string => `sess:${hash}`;

export interface CreatedSession {
  token: string;
  sessionId: string;
  expiresAt: Date;
}

/** Opaque token (32 bayt): DB'da faqat SHA-256 xeshi saqlanadi. */
export async function createSession(
  q: Queryable,
  args: { userId: string; client: ClientKind; ip?: string | null; userAgent?: string | null; now: Date },
): Promise<CreatedSession> {
  const token = newToken();
  const sessionId = uuidv7();
  const expiresAt = new Date(args.now.getTime() + SESSION_TTL_MS[args.client]);
  await q.query(
    `INSERT INTO sessions (id, user_id, token_hash, client, expires_at, last_used_at, ip, user_agent)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      sessionId,
      args.userId,
      hashToken(token),
      args.client,
      expiresAt,
      args.now,
      args.ip ?? null,
      args.userAgent?.slice(0, 300) ?? null,
    ],
  );
  return { token, sessionId, expiresAt };
}

interface SessionRow {
  session_id: string;
  client: ClientKind;
  expires_at: Date;
  last_used_at: Date;
  user_id: string;
  login: string;
  display_name: string;
  must_change_password: boolean;
  mahalla_id: string;
  role: Role;
  mahalla_name: string;
  mahalla_slug: string;
}

export interface ResolvedSession {
  user: AuthUser;
  /** Sliding muddat uzaytirildi (veb cookie qayta yoziladi) */
  refreshed: boolean;
}

/** Token -> foydalanuvchi. Redis/xotira keshi 60 s; bloklash/tiklashda kesh darhol tozalanadi. */
export async function resolveSession(
  deps: Pick<Deps, 'db' | 'kv'>,
  token: string,
  now: Date,
): Promise<ResolvedSession | null> {
  const hash = hashToken(token);
  const key = sessionCacheKey(hash);

  const cached = await deps.kv.get(key);
  if (cached) {
    const user = JSON.parse(cached) as AuthUser;
    if (user.expiresAt > now.getTime()) return { user, refreshed: false };
    await deps.kv.del(key);
  }

  const { rows } = await deps.db.query<SessionRow>(
    `SELECT s.id AS session_id, s.client, s.expires_at, s.last_used_at,
            u.id AS user_id, u.login, u.display_name, u.must_change_password,
            m.mahalla_id, m.role, h.name AS mahalla_name, h.slug AS mahalla_slug
       FROM sessions s
       JOIN users u ON u.id = s.user_id AND u.status = 'ACTIVE'
       JOIN memberships m ON m.user_id = u.id AND m.status = 'ACTIVE'
       JOIN mahalla h ON h.id = m.mahalla_id
      WHERE s.token_hash = $1 AND s.revoked_at IS NULL AND s.expires_at > $2`,
    [hash, now],
  );
  const r = rows[0];
  if (!r) return null;

  let expiresAt = r.expires_at.getTime();
  let refreshed = false;
  if (now.getTime() - r.last_used_at.getTime() > SLIDE_AFTER_MS) {
    const next = new Date(now.getTime() + SESSION_TTL_MS[r.client]);
    await deps.db.query('UPDATE sessions SET last_used_at = $2, expires_at = $3 WHERE id = $1', [
      r.session_id,
      now,
      next,
    ]);
    expiresAt = next.getTime();
    refreshed = true;
  }

  const user: AuthUser = {
    userId: r.user_id,
    login: r.login,
    displayName: r.display_name,
    mahallaId: r.mahalla_id,
    mahallaName: r.mahalla_name,
    mahallaSlug: r.mahalla_slug,
    role: r.role,
    sessionId: r.session_id,
    client: r.client,
    mustChangePassword: r.must_change_password,
    expiresAt,
  };
  await deps.kv.set(key, JSON.stringify(user), CACHE_TTL_SEC);
  return { user, refreshed };
}

export async function revokeSession(deps: Pick<Deps, 'db' | 'kv'>, sessionId: string, now: Date): Promise<void> {
  const r = await deps.db.query<{ token_hash: string }>(
    'UPDATE sessions SET revoked_at = $2 WHERE id = $1 AND revoked_at IS NULL RETURNING token_hash',
    [sessionId, now],
  );
  await deps.kv.del(...r.rows.map((x) => sessionCacheKey(x.token_hash)));
}

/** Foydalanuvchining barcha (yoki `exceptSessionId` dan boshqa) sessiyalarini bekor qiladi va keshdan tozalaydi. */
export async function revokeUserSessions(
  deps: Pick<Deps, 'db' | 'kv'>,
  userId: string,
  now: Date,
  exceptSessionId?: string,
  q: Queryable = deps.db,
): Promise<void> {
  const r = exceptSessionId
    ? await q.query<{ token_hash: string }>(
        `UPDATE sessions SET revoked_at = $2
          WHERE user_id = $1 AND revoked_at IS NULL AND id <> $3 RETURNING token_hash`,
        [userId, now, exceptSessionId],
      )
    : await q.query<{ token_hash: string }>(
        `UPDATE sessions SET revoked_at = $2
          WHERE user_id = $1 AND revoked_at IS NULL RETURNING token_hash`,
        [userId, now],
      );
  await deps.kv.del(...r.rows.map((x) => sessionCacheKey(x.token_hash)));
}

/** Kesh yozuvini (masalan, parol almashgach `mustChangePassword`) darhol yangilanishi uchun o'chiradi. */
export async function dropSessionCache(deps: Pick<Deps, 'kv'>, token: string): Promise<void> {
  await deps.kv.del(sessionCacheKey(hashToken(token)));
}
