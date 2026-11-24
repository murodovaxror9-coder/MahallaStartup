import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { createApp } from '../src/app';
import { loadEnv } from '../src/config/env';
import { FixedClock } from '../src/core/clock';
import { createDb, type Db } from '../src/core/db';
import { noopJobs, noopRealtime, type Deps, type Realtime } from '../src/core/deps';
import { uuidv7 } from '../src/core/ids';
import { MemoryKv } from '../src/core/kv';
import { createLogger } from '../src/core/logger';
import { migrate } from '../src/core/migrate';
import { hashPassword } from '../src/core/password';
import { createStorage } from '../src/core/storage';
import type { Role } from '../src/core/types';

export const PASSWORD = 'Passw0rd!x';
const PASSWORD_HASH_PROMISE = hashPassword(PASSWORD);

export interface Emitted {
  mahallaId: string;
  event: string;
  payload: unknown;
}

export interface TestApp {
  server: Server;
  deps: Deps;
  db: Db;
  kv: MemoryKv;
  clock: FixedClock;
  base: string;
  emitted: Emitted[];
  req: (method: string, url: string, opts?: ReqOptions) => Promise<Res>;
  reset: () => Promise<void>;
  close: () => Promise<void>;
}

export interface ReqOptions {
  token?: string;
  json?: unknown;
  form?: FormData;
  headers?: Record<string, string>;
}

export interface Res {
  status: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  body: any;
  headers: Headers;
}

export async function createTestApp(env: Record<string, string> = {}): Promise<TestApp> {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mhd-test-'));
  const config = loadEnv({
    NODE_ENV: 'test',
    LOG_LEVEL: 'silent',
    LOGIN_IP_LIMIT: '100000',
    WEB_ORIGINS: 'http://localhost:3001',
    STORAGE_DIR: dir,
    STORAGE_SIGNING_SECRET: 'test-secret',
    PUBLIC_API_URL: 'http://localhost:3000',
    ...env,
  });
  // Standart: xotiradagi PGlite. Haqiqiy Postgres'da sinash uchun: TEST_DATABASE_URL=postgresql://... (jadvallar TRUNCATE qilinadi!)
  const db = await createDb({ url: process.env['TEST_DATABASE_URL'] ?? 'memory://' });
  await migrate(db);
  const kv = new MemoryKv();
  const clock = new FixedClock(new Date('2026-11-24T10:00:00+05:00'));
  const emitted: Emitted[] = [];
  const realtime: Realtime = {
    emitToMahalla: (mahallaId, event, payload) => {
      emitted.push({ mahallaId, event, payload });
    },
    close: async () => undefined,
  };
  const deps: Deps = {
    env: config,
    db,
    kv,
    storage: createStorage(config),
    clock,
    log: createLogger(config),
    realtime: realtime ?? noopRealtime,
    jobs: noopJobs,
  };

  const app = createApp(deps);
  const server: Server = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

  const req = async (method: string, url: string, opts: ReqOptions = {}): Promise<Res> => {
    const headers: Record<string, string> = { ...opts.headers };
    if (opts.token) headers['Authorization'] = `Bearer ${opts.token}`;
    let body: RequestInit['body'];
    if (opts.json !== undefined) {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify(opts.json);
    } else if (opts.form) {
      body = opts.form;
    }
    const res = await fetch(`${base}${url}`, { method, headers, body });
    const raw = await res.text();
    let parsed: unknown = raw;
    try {
      parsed = raw ? JSON.parse(raw) : undefined;
    } catch {
      // JSON emas (masalan, fayl)
    }
    return { status: res.status, body: parsed, headers: res.headers };
  };

  const reset = async () => {
    const tables = await db.query<{ tablename: string }>(
      "SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> 'schema_migrations'",
    );
    await db.exec(`TRUNCATE ${tables.rows.map((t) => t.tablename).join(', ')} CASCADE`);
    kv.clear();
    emitted.length = 0;
    clock.set(new Date('2026-11-24T10:00:00+05:00'));
  };

  const close = async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await db.close();
    fs.rmSync(dir, { recursive: true, force: true });
  };

  return { server, deps, db, kv, clock, base, emitted, req, reset, close };
}

// ---------------------------------------------------------------- ma'lumot yaratish

export async function createMahalla(t: TestApp, slug = 'test-mahalla', name = 'Test mahalla'): Promise<string> {
  const id = uuidv7();
  await t.db.query('INSERT INTO mahalla (id, name, slug) VALUES ($1, $2, $3)', [id, name, slug]);
  return id;
}

export interface MakeUser {
  id: string;
  login: string;
  mahallaId: string;
  role: Role;
}

export async function createUser(
  t: TestApp,
  mahallaId: string,
  login: string,
  role: Role = 'RESIDENT',
  opts: { mustChange?: boolean; tempExpiresAt?: Date | null; displayName?: string } = {},
): Promise<MakeUser> {
  const id = uuidv7();
  await t.db.query(
    `INSERT INTO users (id, login, display_name, password_hash, must_change_password, temp_password_expires_at)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [id, login, opts.displayName ?? login, await PASSWORD_HASH_PROMISE, opts.mustChange ?? false, opts.tempExpiresAt ?? null],
  );
  await t.db.query('INSERT INTO memberships (id, user_id, mahalla_id, role) VALUES ($1, $2, $3, $4)', [
    uuidv7(),
    id,
    mahallaId,
    role,
  ]);
  return { id, login, mahallaId, role };
}

/** Haqiqiy `/auth/login` orqali mobil token oladi. */
export async function loginToken(t: TestApp, login: string, password = PASSWORD): Promise<string> {
  const r = await t.req('POST', '/api/v1/auth/login', { json: { login, password, client: 'mobile' } });
  if (r.status !== 200) throw new Error(`login ${login}: ${r.status} ${JSON.stringify(r.body)}`);
  return r.body.token as string;
}

export interface Actor extends MakeUser {
  token: string;
}

export async function actor(
  t: TestApp,
  mahallaId: string,
  login: string,
  role: Role = 'RESIDENT',
): Promise<Actor> {
  const u = await createUser(t, mahallaId, login, role);
  return { ...u, token: await loginToken(t, login) };
}
