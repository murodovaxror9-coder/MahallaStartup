import { timingSafeEqual } from 'node:crypto';
import type { Request } from 'express';
import { AppError } from '../common/app-error';
import type { Deps } from '../core/deps';
import type { AuthUser } from '../core/types';
import { resolveSession } from '../modules/auth/session';

export const SESSION_COOKIE = 'mhd_session';
export const CSRF_COOKIE = 'mhd_csrf';

export function parseCookies(header: string | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(';')) {
    const i = part.indexOf('=');
    if (i < 0) continue;
    const key = part.slice(0, i).trim();
    const raw = part.slice(i + 1).trim();
    if (!key || key in out) continue;
    try {
      out[key] = decodeURIComponent(raw);
    } catch {
      out[key] = raw;
    }
  }
  return out;
}

export interface AuthMeta {
  via: 'bearer' | 'cookie';
  token: string;
  refreshed: boolean;
}

const metaByRequest = new WeakMap<Request, AuthMeta>();
export const authMeta = (req: Request): AuthMeta | undefined => metaByRequest.get(req);

/** Bearer (mobil) yoki cookie (veb) orqali sessiyani aniqlaydi. Sessiya yo'q/bekor bo'lsa 401. */
export async function authenticate(deps: Deps, req: Request, now: Date): Promise<AuthUser> {
  const header = req.headers.authorization;
  const bearer = header?.startsWith('Bearer ') ? header.slice(7).trim() : undefined;
  const cookieToken = parseCookies(req.headers.cookie)[SESSION_COOKIE];
  const token = bearer || cookieToken;
  if (!token) throw new AppError('UNAUTHENTICATED');

  const resolved = await resolveSession(deps, token, now);
  if (!resolved) throw new AppError('UNAUTHENTICATED');

  metaByRequest.set(req, { via: bearer ? 'bearer' : 'cookie', token, refreshed: resolved.refreshed });
  return resolved.user;
}

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

function safeEqual(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/**
 * Cookie bilan kelgan o'zgartiruvchi so'rovlar uchun: double-submit (`mhd_csrf` cookie == `X-CSRF-Token`)
 * va `Origin` tekshiruvi. Bearer so'rovlarga CSRF shart emas.
 */
export function csrfGuard(deps: Deps, req: Request): void {
  const meta = authMeta(req);
  if (!meta || meta.via !== 'cookie' || SAFE_METHODS.has(req.method)) return;

  const origin = req.headers.origin;
  if (!origin || !deps.env.WEB_ORIGINS.includes(origin)) throw new AppError('CSRF_INVALID');

  const cookie = parseCookies(req.headers.cookie)[CSRF_COOKIE];
  const header = req.headers['x-csrf-token'];
  if (!cookie || typeof header !== 'string' || !safeEqual(cookie, header)) {
    throw new AppError('CSRF_INVALID');
  }
}
