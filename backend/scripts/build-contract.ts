import fs from 'node:fs';
import path from 'node:path';
import { responseSchemas } from '../src/contract/responses';
import { buildOpenApi } from '../src/core/openapi';
import { toYaml } from '../src/core/yaml';
import { allRoutes } from '../src/routes';

// 1) OpenAPI shartnomasi: backend/openapi.yaml (frontend/mobil tiplarni va Prism mock'ni shundan oladi)
const doc = buildOpenApi(allRoutes, responseSchemas);
fs.writeFileSync(
  path.resolve('openapi.yaml'),
  `# Avtomatik generatsiya: \`pnpm contract:build\` (marshrutlar + zod sxemalar). Qo'lda tahrirlamang.\n${toYaml(doc)}\n`,
);

// 2) Endpointlar jadvali: docs/ENDPOINTS.md
const ROLE: Record<string, string> = { public: 'ochiq', user: 'har qanday kirgan', resident: 'aholi', admin: 'admin' };
const byTag = new Map<string, typeof allRoutes>();
for (const r of allRoutes) byTag.set(r.tag, [...(byTag.get(r.tag) ?? []), r]);

const lines = [
  '# Endpointlar',
  '',
  "Avtomatik generatsiya: `pnpm contract:build` (qo'lda tahrirlamang). Prefiks: `/api/v1`. To'liq sxemalar — `backend/openapi.yaml`, jonli hujjat — `GET /api/docs` (dev).",
  '',
  '`/health` (liveness) va `/ready` (DB, kesh, saqlash holati) — prefikssiz.',
];
for (const [tag, routes] of byTag) {
  lines.push('', `## ${tag}`, '', '| Metod | Yo\'l | Kim | Tavsif |', '| --- | --- | --- | --- |');
  for (const r of routes) {
    lines.push(`| \`${r.method.toUpperCase()}\` | \`${r.path}\` | ${ROLE[r.auth]} | ${r.summary.replace(/\|/g, '\\|')} |`);
  }
}
const docsDir = path.resolve('..', 'docs');
fs.mkdirSync(docsDir, { recursive: true });
fs.writeFileSync(path.join(docsDir, 'ENDPOINTS.md'), `${lines.join('\n')}\n`);

console.log(`openapi.yaml va docs/ENDPOINTS.md yozildi: ${allRoutes.length} ta endpoint`);
