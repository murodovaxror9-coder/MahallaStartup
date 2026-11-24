import { audit } from '../core/audit';
import { uuidv7 } from '../core/ids';
import { generateTempPassword, hashPassword } from '../core/password';
import { loginSchema } from '../core/schemas';
import { migrate } from '../core/migrate';
import { createDb } from '../core/db';
import { loadEnv } from '../config/env';
import { getOrCreateRound, closeRound } from '../modules/rounds/service';
import { parsePeriodKey } from '../modules/rounds/period';
import { parseArgs, requireArg, withDeps } from './context';
import { seedDemo } from './seed-demo';

const USAGE = `Mahalladosh CLI

  pnpm cli db:migrate
  pnpm cli mahalla:create --name "Yunusobod" --slug yunusobod --admin-login admin.yunusobod --admin-name "Ali Valiyev"
  pnpm cli round:close --mahalla demo-yunusobod --period 2026-11 --now 2026-12-01T00:01:00+05:00
  pnpm db:seed:demo

round:close faqat lokalda (NODE_ENV != production yoki ALLOW_TIME_TRAVEL=true) ishlaydi.`;

async function mahallaCreate(args: Record<string, string | true>): Promise<void> {
  const name = requireArg(args, 'name');
  const slug = requireArg(args, 'slug').toLowerCase();
  const adminName = requireArg(args, 'admin-name');
  if (!/^[a-z0-9-]{3,40}$/.test(slug)) throw new Error('--slug: 3–40 belgi, kichik lotin harflari, raqam va "-"');
  const login = loginSchema.parse(requireArg(args, 'admin-login'));

  await withDeps(async (deps) => {
    const temp = generateTempPassword();
    const hash = await hashPassword(temp);
    const mahallaId = uuidv7();
    const userId = uuidv7();
    const expires = new Date(Date.now() + 72 * 3600_000);
    await deps.db.tx(async (q) => {
      await q.query('INSERT INTO mahalla (id, name, slug) VALUES ($1, $2, $3)', [mahallaId, name, slug]);
      await q.query(
        `INSERT INTO users (id, login, display_name, password_hash, must_change_password, temp_password_expires_at)
         VALUES ($1, $2, $3, $4, true, $5)`,
        [userId, login, adminName, hash, expires],
      );
      await q.query(`INSERT INTO memberships (id, user_id, mahalla_id, role) VALUES ($1, $2, $3, 'MAHALLA_ADMIN')`, [
        uuidv7(),
        userId,
        mahallaId,
      ]);
      await audit(q, { mahallaId, actorId: null, action: 'mahalla.create', targetType: 'MAHALLA', targetId: mahallaId, meta: { slug, adminLogin: login } });
    });
    console.log(`\nMahalla yaratildi: ${name} (${slug})`);
    console.log(`  Admin login:           ${login}`);
    console.log(`  Vaqtinchalik parol:    ${temp}   (72 soat amal qiladi; faqat BIR MARTA ko'rsatiladi)\n`);
  });
}

async function roundClose(args: Record<string, string | true>): Promise<void> {
  const env = loadEnv();
  if (env.NODE_ENV === 'production' && !env.ALLOW_TIME_TRAVEL) {
    throw new Error("round:close productionda o'chiq (ALLOW_TIME_TRAVEL=true bilan yoqish mumkin)");
  }
  const slug = requireArg(args, 'mahalla');
  const period = parsePeriodKey(requireArg(args, 'period'));
  if (!period) throw new Error('--period YYYY-MM ko\'rinishida bo\'lsin (masalan, 2026-11)');
  const closeAt = typeof args['now'] === 'string' ? new Date(args['now']) : new Date();
  if (Number.isNaN(closeAt.getTime())) throw new Error('--now noto\'g\'ri sana (masalan, 2026-12-01T00:01:00+05:00)');

  await withDeps(async (deps) => {
    const m = await deps.db.query<{ id: string }>('SELECT id FROM mahalla WHERE slug = $1', [slug]);
    const mahallaId = m.rows[0]?.id;
    if (!mahallaId) throw new Error(`Mahalla topilmadi: ${slug}`);
    const round = await getOrCreateRound(deps.db, mahallaId, period);
    const result = await closeRound(deps, round.id, closeAt);
    console.log(`\nDavr ${period.key} yopildi (${closeAt.toISOString()})`);
    console.log(`  ${result.message}`);
    console.log(`  Ovoz berganlar: ${result.totalVoters}, jami ovoz: ${result.totalVotes}`);
    for (const r of result.ranking) console.log(`  ${r.rank}. ${r.title} — ${r.votes} ovoz`);
    console.log('');
  });
}

async function main(): Promise<void> {
  const [cmd, ...rest] = process.argv.slice(2);
  const args = parseArgs(rest);
  switch (cmd) {
    case 'db:migrate': {
      const env = loadEnv();
      const db = await createDb({ url: env.DATABASE_URL, poolMax: 2 });
      const ran = await migrate(db, (m) => console.log(m));
      console.log(ran.length ? `${ran.length} ta migratsiya bajarildi` : 'Yangi migratsiya yo\'q');
      await db.close();
      return;
    }
    case 'mahalla:create':
      return mahallaCreate(args);
    case 'round:close':
      return roundClose(args);
    case 'db:seed:demo':
      return withDeps(seedDemo);
    default:
      console.log(USAGE);
      if (cmd) process.exitCode = 1;
  }
}

main().catch((err: unknown) => {
  console.error(`\nXato: ${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});
