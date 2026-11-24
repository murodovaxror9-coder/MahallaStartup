import { loadEnv } from '../config/env';
import { systemClock } from '../core/clock';
import { createDb } from '../core/db';
import { noopJobs, noopRealtime, type Deps } from '../core/deps';
import { MemoryKv } from '../core/kv';
import { createLogger } from '../core/logger';
import { migrate } from '../core/migrate';
import { createStorage } from '../core/storage';

/** CLI uchun: server bilan bir xil DB/saqlash, lekin keshsiz va fon vazifalarsiz. */
export async function withDeps<T>(fn: (deps: Deps) => Promise<T>): Promise<T> {
  const env = loadEnv();
  const db = await createDb({ url: env.DATABASE_URL, poolMax: 3 });
  try {
    await migrate(db);
    const deps: Deps = {
      env,
      db,
      kv: new MemoryKv(),
      storage: createStorage(env),
      clock: systemClock,
      log: createLogger({ ...env, LOG_LEVEL: 'warn' }),
      realtime: noopRealtime,
      jobs: noopJobs,
    };
    return await fn(deps);
  } finally {
    await db.close();
  }
}

/** `--kalit qiymat` va `--bayroq` ni oddiy obyektga aylantiradi. */
export function parseArgs(argv: string[]): Record<string, string | true> {
  const out: Record<string, string | true> = {};
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i] as string;
    if (!a.startsWith('--')) continue;
    const key = a.slice(2);
    const next = argv[i + 1];
    if (next !== undefined && !next.startsWith('--')) {
      out[key] = next;
      i += 1;
    } else {
      out[key] = true;
    }
  }
  return out;
}

export function requireArg(args: Record<string, string | true>, name: string): string {
  const v = args[name];
  if (typeof v !== 'string' || v.trim() === '') throw new Error(`--${name} majburiy`);
  return v.trim();
}
