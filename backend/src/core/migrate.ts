import fs from 'node:fs';
import path from 'node:path';
import type { Db } from './db';

/** `db/migrations/*.sql` fayllarini tartib bilan, har birini alohida tranzaksiyada bajaradi. */
export async function migrate(db: Db, log: (msg: string) => void = () => undefined): Promise<string[]> {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `);

  const dir = process.env['MIGRATIONS_DIR'] ?? path.resolve(process.cwd(), 'db/migrations');
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  const done = await db.query<{ name: string }>('SELECT name FROM schema_migrations');
  const applied = new Set(done.rows.map((r) => r.name));
  const ran: string[] = [];

  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = fs.readFileSync(path.join(dir, file), 'utf8');
    await db.tx(async (q) => {
      await q.exec(sql);
      await q.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file]);
    });
    ran.push(file);
    log(`migratsiya bajarildi: ${file}`);
  }
  return ran;
}
