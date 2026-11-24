import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Row = Record<string, any>;

export interface QueryResult<T = Row> {
  rows: T[];
  rowCount: number;
}

export interface Queryable {
  query<T = Row>(text: string, params?: readonly unknown[]): Promise<QueryResult<T>>;
  /** Ko'p operatorli SQL (migratsiyalar uchun), parametrlarsiz */
  exec(sql: string): Promise<void>;
}

export interface Db extends Queryable {
  readonly kind: 'pg' | 'pglite';
  /** Tranzaksiya: `fn` ichida faqat berilgan `q` dan foydalaning (PGlite'da tashqi `db.query` qotib qoladi). */
  tx<T>(fn: (q: Queryable) => Promise<T>): Promise<T>;
  close(): Promise<void>;
}

// `date` ni JS Date'ga aylantirmaymiz — satr bo'lib qoladi (YYYY-MM-DD)
pg.types.setTypeParser(1082, (v: string) => v);

const normalize = (params: readonly unknown[] | undefined): unknown[] =>
  (params ?? []).map((p) => (p === undefined ? null : p));

class PgDb implements Db {
  readonly kind = 'pg' as const;

  constructor(private readonly pool: pg.Pool) {}

  async query<T = Row>(text: string, params?: readonly unknown[]): Promise<QueryResult<T>> {
    const r = await this.pool.query(text, normalize(params));
    return { rows: r.rows as T[], rowCount: r.rowCount ?? r.rows.length };
  }

  async exec(sql: string): Promise<void> {
    await this.pool.query(sql);
  }

  async tx<T>(fn: (q: Queryable) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    const q: Queryable = {
      query: async <R = Row>(text: string, params?: readonly unknown[]) => {
        const r = await client.query(text, normalize(params));
        return { rows: r.rows as R[], rowCount: r.rowCount ?? r.rows.length };
      },
      exec: async (sql) => {
        await client.query(sql);
      },
    };
    try {
      await client.query('BEGIN');
      const result = await fn(q);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK').catch(() => undefined);
      throw err;
    } finally {
      client.release();
    }
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}

interface PgliteLike {
  waitReady: Promise<void>;
  query(text: string, params?: unknown[]): Promise<{ rows: unknown[]; affectedRows?: number }>;
  exec(sql: string): Promise<unknown>;
  transaction<T>(
    fn: (tx: {
      query(text: string, params?: unknown[]): Promise<{ rows: unknown[]; affectedRows?: number }>;
      exec(sql: string): Promise<unknown>;
    }) => Promise<T>,
  ): Promise<T>;
  close(): Promise<void>;
}

class PgliteDb implements Db {
  readonly kind = 'pglite' as const;

  constructor(
    private readonly pglite: PgliteLike,
    private readonly release: () => void = () => undefined,
  ) {}

  async query<T = Row>(text: string, params?: readonly unknown[]): Promise<QueryResult<T>> {
    const r = await this.pglite.query(text, normalize(params));
    return { rows: r.rows as T[], rowCount: r.affectedRows ?? r.rows.length };
  }

  async exec(sql: string): Promise<void> {
    await this.pglite.exec(sql);
  }

  tx<T>(fn: (q: Queryable) => Promise<T>): Promise<T> {
    return this.pglite.transaction(async (t) =>
      fn({
        query: async <R = Row>(text: string, params?: readonly unknown[]) => {
          const r = await t.query(text, normalize(params));
          return { rows: r.rows as R[], rowCount: r.affectedRows ?? r.rows.length };
        },
        exec: async (sql) => {
          await t.exec(sql);
        },
      }),
    );
  }

  async close(): Promise<void> {
    await this.pglite.close();
    this.release();
  }
}

const isAlive = (pid: number): boolean => {
  try {
    process.kill(pid, 0);
    return true;
  } catch (err) {
    return (err as NodeJS.ErrnoException).code === 'EPERM';
  }
};

/** PGlite faylini bir vaqtda ikki jarayon ochmasin (masalan, server ishlayotganda seed): baza buzilishi mumkin. */
function acquireLock(dataDir: string): () => void {
  const lock = `${dataDir}.lock`;
  if (fs.existsSync(lock)) {
    const pid = Number(fs.readFileSync(lock, 'utf8'));
    if (pid && pid !== process.pid && isAlive(pid)) {
      throw new Error(
        `Baza (${dataDir}) boshqa jarayon (PID ${pid}) tomonidan ishlatilmoqda. Avval uni to'xtating (masalan, ishlayotgan server).`,
      );
    }
  }
  fs.writeFileSync(lock, String(process.pid));
  return () => fs.rmSync(lock, { force: true });
}

export interface CreateDbOptions {
  url?: string | undefined;
  poolMax?: number;
}

/**
 * - `postgresql://...`  -> haqiqiy Postgres (`pg` pool)
 * - `memory://`         -> xotiradagi PGlite (testlar)
 * - bo'sh / `pglite://./yo'l` -> fayldagi PGlite (lokal, hech narsa o'rnatmasdan)
 */
export async function createDb(opts: CreateDbOptions = {}): Promise<Db> {
  const url = opts.url;

  if (url && /^postgres(ql)?:\/\//.test(url)) {
    const pool = new pg.Pool({
      connectionString: url,
      max: opts.poolMax ?? 10,
      connectionTimeoutMillis: 5000,
    });
    // Bo'sh turgan ulanish uzilganda jarayon yiqilmasin
    pool.on('error', () => undefined);
    return new PgDb(pool);
  }

  const { PGlite } = await import('@electric-sql/pglite');
  let dataDir: string | undefined;
  let release: () => void = () => undefined;
  if (url !== 'memory://') {
    dataDir = path.resolve(url?.replace(/^pglite:\/\//, '') || './data/pglite');
    fs.mkdirSync(path.dirname(dataDir), { recursive: true });
    release = acquireLock(dataDir);
  }
  try {
    const instance = new PGlite(dataDir) as unknown as PgliteLike;
    await instance.waitReady;
    return new PgliteDb(instance, release);
  } catch (err) {
    release();
    throw err;
  }
}
