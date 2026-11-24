import { Redis } from 'ioredis';

/** Kesh / rate-limit / qisqa muddatli holat. Redis bo'lmasa xotirada (bitta jarayon uchun) ishlaydi. */
export interface Kv {
  readonly kind: 'memory' | 'redis';
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSec?: number): Promise<void>;
  del(...keys: string[]): Promise<void>;
  /** Hisoblagichni oshiradi; birinchi oshirishda `ttlSec` o'rnatiladi (fixed window). */
  incr(key: string, ttlSec: number): Promise<number>;
  /** Qolgan soniyalar; kalit yo'q yoki muddatsiz bo'lsa -1 */
  ttl(key: string): Promise<number>;
  ping(): Promise<void>;
  close(): Promise<void>;
}

interface Entry {
  value: string;
  expiresAt: number | null;
}

export class MemoryKv implements Kv {
  readonly kind = 'memory' as const;
  private readonly store = new Map<string, Entry>();

  private read(key: string): Entry | undefined {
    const e = this.store.get(key);
    if (e && e.expiresAt !== null && e.expiresAt <= Date.now()) {
      this.store.delete(key);
      return undefined;
    }
    return e;
  }

  async get(key: string): Promise<string | null> {
    return this.read(key)?.value ?? null;
  }

  async set(key: string, value: string, ttlSec?: number): Promise<void> {
    this.store.set(key, { value, expiresAt: ttlSec ? Date.now() + ttlSec * 1000 : null });
  }

  async del(...keys: string[]): Promise<void> {
    for (const k of keys) this.store.delete(k);
  }

  async incr(key: string, ttlSec: number): Promise<number> {
    const e = this.read(key);
    const next = Number(e?.value ?? 0) + 1;
    this.store.set(key, {
      value: String(next),
      expiresAt: e ? e.expiresAt : Date.now() + ttlSec * 1000,
    });
    return next;
  }

  async ttl(key: string): Promise<number> {
    const e = this.read(key);
    if (!e || e.expiresAt === null) return -1;
    return Math.max(1, Math.ceil((e.expiresAt - Date.now()) / 1000));
  }

  async ping(): Promise<void> {}

  async close(): Promise<void> {
    this.store.clear();
  }

  /** Testlar uchun */
  clear(): void {
    this.store.clear();
  }
}

const INCR_LUA = `
local n = redis.call('INCR', KEYS[1])
if n == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]) end
return n
`;

export class RedisKv implements Kv {
  readonly kind = 'redis' as const;
  readonly client: Redis;

  constructor(url: string) {
    this.client = new Redis(url, { lazyConnect: true, maxRetriesPerRequest: 2, connectTimeout: 3000 });
    this.client.on('error', () => undefined);
  }

  get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async set(key: string, value: string, ttlSec?: number): Promise<void> {
    if (ttlSec) await this.client.set(key, value, 'EX', ttlSec);
    else await this.client.set(key, value);
  }

  async del(...keys: string[]): Promise<void> {
    if (keys.length > 0) await this.client.del(...keys);
  }

  async incr(key: string, ttlSec: number): Promise<number> {
    return Number(await this.client.eval(INCR_LUA, 1, key, String(ttlSec)));
  }

  ttl(key: string): Promise<number> {
    return this.client.ttl(key);
  }

  async ping(): Promise<void> {
    await this.client.ping();
  }

  async close(): Promise<void> {
    if (this.client.status === 'ready') await this.client.quit();
    else this.client.disconnect();
  }
}

export function createKv(redisUrl?: string): Kv {
  return redisUrl ? new RedisKv(redisUrl) : new MemoryKv();
}
