import { AppError } from '../common/app-error';
import type { Deps } from '../core/deps';

export interface RateLimitOptions {
  /** Hisoblagich nomi (kalit prefiksi) */
  name: string;
  limit: number;
  windowSec: number;
  /** Kim bo'yicha: foydalanuvchi ID yoki IP */
  key: string;
  code?: 'RATE_LIMITED' | 'TOO_MANY_ATTEMPTS';
}

/** Fixed-window hisoblagich (Redis yoki xotira). Chegara oshsa 429 + `Retry-After`. */
export async function rateLimit(deps: Pick<Deps, 'kv'>, o: RateLimitOptions): Promise<void> {
  const key = `rl:${o.name}:${o.key}`;
  const n = await deps.kv.incr(key, o.windowSec);
  if (n > o.limit) {
    const ttl = await deps.kv.ttl(key);
    throw new AppError(o.code ?? 'RATE_LIMITED', undefined, {
      retryAfterSec: ttl > 0 ? ttl : o.windowSec,
    });
  }
}
