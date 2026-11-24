import http from 'node:http';
import { createApp } from './app';
import { loadEnv } from './config/env';
import { systemClock } from './core/clock';
import { createDb } from './core/db';
import { noopJobs, noopRealtime, type Deps } from './core/deps';
import { createKv } from './core/kv';
import { createLogger } from './core/logger';
import { migrate } from './core/migrate';
import { createStorage } from './core/storage';
import { startJobs } from './jobs';
import { createRealtime } from './realtime';

async function main(): Promise<void> {
  const env = loadEnv();
  const log = createLogger(env);

  const db = await createDb({ url: env.DATABASE_URL, poolMax: env.DATABASE_POOL_MAX });
  await migrate(db, (m) => log.info(m));
  const kv = createKv(env.REDIS_URL);
  const storage = createStorage(env);

  const deps: Deps = {
    env,
    db,
    kv,
    storage,
    clock: systemClock,
    log,
    realtime: noopRealtime,
    jobs: noopJobs,
  };
  log.info(
    { db: db.kind, cache: kv.kind, storage: storage.kind },
    db.kind === 'pglite' ? 'lokal rejim: ichki Postgres (PGlite), hech narsa o\'rnatish shart emas' : 'ulandi',
  );

  const app = createApp(deps);
  const server = http.createServer(app);
  deps.realtime = await createRealtime(server, deps);
  deps.jobs = startJobs(deps);

  await new Promise<void>((resolve) => server.listen(env.PORT, env.HOST, resolve));
  log.info(`API tayyor: http://${env.HOST}:${env.PORT}/api/v1  (health: /health, ready: /ready)`);

  let stopping = false;
  const shutdown = async (signal: string) => {
    if (stopping) return;
    stopping = true;
    log.info({ signal }, "to'xtatilmoqda");
    await deps.jobs.stop();
    await deps.realtime.close();
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await kv.close();
    await db.close();
    process.exit(0);
  };
  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
