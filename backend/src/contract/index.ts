import { buildOpenApi } from '../core/openapi';
import { allRoutes } from '../routes';
import { API_DESCRIPTION, ROLE_TEXT, TAG_DESCRIPTIONS } from './docs';
import { routeErrors } from './errors';
import { requestExamples } from './request-examples';
import responseExamples from './response-examples.json';
import { responseSchemas } from './responses';

export { responseSchemas } from './responses';
export const examples = responseExamples as Record<string, unknown>;

/** To'liq OpenAPI hujjati: marshrutlar + zod sxemalar + TZ matnlari + xatolar + misollar. */
export function buildContract(
  servers?: Array<{ url: string; description?: string }>,
  responseExamples: Record<string, unknown> = examples,
) {
  return buildOpenApi(allRoutes, {
    responses: responseSchemas,
    examples: responseExamples,
    errors: routeErrors,
    requestExamples,
    description: API_DESCRIPTION,
    tagDescriptions: TAG_DESCRIPTIONS,
    roleText: ROLE_TEXT,
    ...(servers ? { servers } : {}),
  });
}

/** `/api/openapi.json`: «Try it out» doim shu serverga (relative URL) boradi: emulyator, LAN, proksi uchun ham. */
export const LIVE_SERVERS = [{ url: '/api/v1', description: 'Shu server (Try it out)' }];

export const FILE_SERVERS = [
  { url: 'http://localhost:3000/api/v1', description: 'Lokal API (iOS simulyator, veb)' },
  { url: 'http://10.0.2.2:3000/api/v1', description: 'Android emulyator' },
  { url: 'http://localhost:4010/api/v1', description: 'Prism mock (pnpm contract:mock)' },
];
