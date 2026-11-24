/**
 * Soddalashtirilgan yuklama o'lchovi (qo'shimcha kutubxonasiz): ishlayotgan serverga qarshi.
 *   pnpm db:seed:demo && API_RATE_LIMIT=100000 pnpm dev   (boshqa terminalda)   ->   pnpm bench
 * Maqsad: lenta, post sahifasi, ovoz, chat uchun p95 < 150 ms (lokal, seed bilan).
 */
const BASE = process.env['BENCH_URL'] ?? 'http://127.0.0.1:3000';
const TOTAL = Number(process.env['BENCH_REQUESTS'] ?? 300);
const CONCURRENCY = Number(process.env['BENCH_CONCURRENCY'] ?? 10);

async function api(method: string, path: string, token?: string, body?: unknown): Promise<{ status: number; json: any }> {
  const res = await fetch(`${BASE}/api/v1${path}`, {
    method,
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  return { status: res.status, json: text ? JSON.parse(text) : undefined };
}

const pct = (sorted: number[], p: number): number => sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))] ?? 0;

async function bench(name: string, fn: (i: number) => Promise<number>, total = TOTAL): Promise<boolean> {
  const times: number[] = [];
  let failed = 0;
  let next = 0;
  const started = performance.now();
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      while (next < total) {
        const i = next++;
        const t0 = performance.now();
        const status = await fn(i).catch(() => 0);
        times.push(performance.now() - t0);
        if (status < 200 || status >= 300) failed += 1;
      }
    }),
  );
  const elapsed = (performance.now() - started) / 1000;
  const sorted = [...times].sort((a, b) => a - b);
  const p95 = pct(sorted, 95);
  const ok = p95 < 150 && failed === 0;
  console.log(
    `${ok ? 'OK  ' : 'SEKIN'} ${name.padEnd(28)} p50=${pct(sorted, 50).toFixed(0).padStart(4)}ms  p95=${p95.toFixed(0).padStart(4)}ms  max=${(sorted.at(-1) ?? 0).toFixed(0).padStart(4)}ms  ${(total / elapsed).toFixed(0).padStart(4)} req/s${failed ? `  xato: ${failed}` : ''}`,
  );
  return ok;
}

async function main(): Promise<void> {
  const login = await api('POST', '/auth/login', undefined, { login: 'ali.yunusobod', password: 'Demo12345!', client: 'mobile' });
  if (login.status !== 200) throw new Error(`Login bo'lmadi (${login.status}). Avval: pnpm db:seed:demo`);
  const token = login.json.token as string;
  const feed = await api('GET', '/issues?sort=top&period=current', token);
  const issueId = feed.json.items[0].id as string;
  await api('PUT', `/issues/${issueId}/vote`, token); // allaqachon ovoz bergan bo'lishi mumkin: idempotent

  console.log(`\n${BASE}  |  ${TOTAL} so'rov, ${CONCURRENCY} parallel\n`);
  const results = [
    await bench('GET /home', () => api('GET', '/home', token).then((r) => r.status)),
    await bench('GET /issues (lenta)', () => api('GET', '/issues?limit=20', token).then((r) => r.status)),
    await bench('GET /issues?sort=top', () => api('GET', '/issues?sort=top&period=current', token).then((r) => r.status)),
    await bench('GET /issues/:id', () => api('GET', `/issues/${issueId}`, token).then((r) => r.status)),
    await bench('PUT /issues/:id/vote', () => api('PUT', `/issues/${issueId}/vote`, token).then((r) => r.status)),
    await bench('GET /chat/messages', () => api('GET', '/chat/messages?limit=30', token).then((r) => r.status)),
    await bench('POST /chat/messages', (i) =>
      api('POST', '/chat/messages', token, { text: `bench ${i}`, clientMessageId: `bench-${Date.now()}-${i}` }).then((r) => r.status),
      25, // chat: daqiqasiga 30 xabar chegarasi
    ),
  ];
  console.log(results.every(Boolean) ? "\nHamma endpoint p95 < 150 ms\n" : '\nBaʼzi endpointlar maqsaddan sekin\n');
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
