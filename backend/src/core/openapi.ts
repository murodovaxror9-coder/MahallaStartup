import { z } from 'zod';
import { ERROR_CODES, type ErrorCode } from '../common/error-codes';
import type { AnyRoute } from './http';

type Json = Record<string, unknown>;

const OPTS = { target: 'openapi-3.0', unrepresentable: 'any', reused: 'inline' } as const;

function jsonSchema(schema: z.ZodType, io: 'input' | 'output'): Json {
  const out = z.toJSONSchema(schema, { ...OPTS, io }) as Json;
  delete out['$schema'];
  return out;
}

/** Zod obyekt sxemasini OpenAPI `parameters` ro'yxatiga aylantiradi (path/query). */
function toParameters(schema: z.ZodType, where: 'path' | 'query'): Json[] {
  if (!(schema instanceof z.ZodObject)) return [];
  return Object.entries(schema.shape as Record<string, z.ZodType>).map(([name, field]) => ({
    name,
    in: where,
    required: where === 'path' ? true : !field.isOptional(),
    schema: jsonSchema(field, 'output'),
  }));
}

const operationId = (r: AnyRoute): string => {
  const words = r.path
    .split('/')
    .filter(Boolean)
    .map((s) =>
      s.startsWith(':')
        ? `By${s[1]?.toUpperCase()}${s.slice(2)}`
        : s.replace(/[^a-zA-Z0-9]+(.)?/g, (_m, c: string | undefined) => (c ? c.toUpperCase() : '')),
    )
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1));
  return r.method + words.join('');
};

const errorRef = { $ref: '#/components/schemas/ErrorResponse' };

const errorBody = (code: ErrorCode): Json => ({
  error: {
    code,
    message: ERROR_CODES[code].message,
    details: code === 'VALIDATION_ERROR' ? { fields: { title: "5–120 belgi bo'lsin" } } : {},
  },
});

const SUCCESS_TEXT: Record<number, string> = { 200: 'Muvaffaqiyatli', 201: 'Yaratildi', 204: "Muvaffaqiyatli (javob tanasi yo'q)" };

export interface OpenApiOptions {
  /** Javob sxemalari (kalit: `METHOD /yo'l`) */
  responses: Record<string, z.ZodType>;
  /** Haqiqiy javoblardan olingan misollar (kalit bo'yicha) */
  examples?: Record<string, unknown>;
  /** Endpointga xos biznes xatolari */
  errors?: Record<string, readonly ErrorCode[]>;
  /** Nomlangan so'rov misollari */
  requestExamples?: Record<string, Record<string, { summary: string; value: unknown }>>;
  description?: string;
  tagDescriptions?: Record<string, string>;
  roleText?: Record<string, string>;
  servers?: Array<{ url: string; description?: string }>;
}

/** Xato javoblari: kod -> status bo'yicha guruhlanadi, har kod uchun tayyor misol bilan. */
function errorResponses(codes: readonly ErrorCode[]): Record<string, Json> {
  const byStatus = new Map<number, ErrorCode[]>();
  for (const code of new Set(codes)) {
    const status = ERROR_CODES[code].status;
    byStatus.set(status, [...(byStatus.get(status) ?? []), code]);
  }
  const out: Record<string, Json> = {};
  for (const [status, list] of [...byStatus].sort((a, b) => a[0] - b[0])) {
    out[String(status)] = {
      description: list.map((c) => `**${c}** — ${ERROR_CODES[c].message}`).join('\n\n'),
      content: {
        'application/json': {
          schema: errorRef,
          examples: Object.fromEntries(list.map((c) => [c, { summary: c, value: errorBody(c) }])),
        },
      },
    };
  }
  return out;
}

export function buildOpenApi(routes: readonly AnyRoute[], opts: OpenApiOptions): Json {
  const paths: Record<string, Json> = {
    '/health': {
      servers: [{ url: 'http://localhost:3000' }],
      get: {
        tags: ['Tizim'],
        summary: 'Liveness: jarayon tirik (bog‘liqliklarga qaramaydi)',
        operationId: 'getHealth',
        responses: { '200': { description: 'Tirik', content: { 'application/json': { schema: { type: 'object', required: ['status'], properties: { status: { type: 'string', enum: ['ok'] } } }, example: { status: 'ok' } } } } },
      },
    },
    '/ready': {
      servers: [{ url: 'http://localhost:3000' }],
      get: {
        tags: ['Tizim'],
        summary: 'Readiness: DB, kesh va saqlash alohida hisobot qilinadi',
        operationId: 'getReady',
        responses: {
          '200': { description: 'Hammasi ishlayapti', content: { 'application/json': { schema: { $ref: '#/components/schemas/Ready' }, example: { status: 'ok', checks: { db: 'ok', cache: 'ok', storage: 'ok' } } } } },
          '503': { description: 'Kamida bitta bog‘liqlik ishlamayapti', content: { 'application/json': { schema: { $ref: '#/components/schemas/Ready' }, example: { status: 'fail', checks: { db: 'ok', cache: 'fail', storage: 'ok' } } } } },
        },
      },
    },
  };

  const roleText = opts.roleText ?? {};
  const ids = new Set<string>();
  const tagOrder: string[] = [];

  for (const r of routes) {
    const key = `${r.method.toUpperCase()} ${r.path}`;
    const path = r.path.replace(/:([A-Za-z0-9_]+)/g, '{$1}');
    const status = r.status ?? 200;
    if (!tagOrder.includes(r.tag)) tagOrder.push(r.tag);

    const parameters: Json[] = [
      ...(r.params ? toParameters(r.params, 'path') : []),
      ...(r.query ? toParameters(r.query, 'query') : []),
    ];
    if (r.method === 'post' && r.path === '/issues') {
      parameters.push({
        name: 'Idempotency-Key',
        in: 'header',
        required: true,
        description: "8–100 belgi; qayta yuborish o'sha postni qaytaradi (200)",
        schema: { type: 'string', minLength: 8, maxLength: 100 },
        example: 'issue-2026-11-24-0001',
      });
    }

    let requestBody: Json | undefined;
    if (r.path === '/media' && r.method === 'post') {
      requestBody = {
        required: true,
        content: {
          'multipart/form-data': {
            schema: {
              type: 'object',
              required: ['file', 'clientUploadId'],
              properties: { file: { type: 'string', format: 'binary' }, clientUploadId: { type: 'string', format: 'uuid' } },
            },
          },
        },
      };
    } else if (r.body) {
      const named = opts.requestExamples?.[key];
      requestBody = {
        required: true,
        content: {
          'application/json': { schema: jsonSchema(r.body, 'input'), ...(named ? { examples: named } : {}) },
        },
      };
    }

    const schema = r.response ?? opts.responses[key];
    const example = opts.examples?.[key];
    const successContent =
      status === 204
        ? undefined
        : {
            'application/json': {
              schema: schema ? jsonSchema(schema, 'output') : { type: 'object', additionalProperties: true },
              ...(example !== undefined ? { example } : {}),
            },
          };

    // ---- xatolar: umumiy (avtomatik) + endpointga xos
    const generic: ErrorCode[] = [];
    if (requestBody || parameters.length > 0) generic.push('VALIDATION_ERROR');
    if (r.auth !== 'public') {
      generic.push('UNAUTHENTICATED', 'FORBIDDEN');
      if (!r.allowWhileMustChange) generic.push('PASSWORD_CHANGE_REQUIRED');
      if (r.method !== 'get') generic.push('CSRF_INVALID');
    }
    if (r.params) generic.push('NOT_FOUND');
    generic.push('RATE_LIMITED');
    const errs = errorResponses([...(opts.errors?.[key] ?? []), ...generic]);

    const roleLine = `**Rol:** ${roleText[r.auth] ?? r.auth}`;
    const limitLine = r.limit ? `\n\n**Tezlik chegarasi:** ${r.limit.limit} so'rov / ${r.limit.windowSec >= 3600 ? `${r.limit.windowSec / 3600} soat` : `${r.limit.windowSec / 60} daqiqa`}` : '';
    const description = `${roleLine}${r.description ? `\n\n${r.description}` : ''}${limitLine}`;

    const id = operationId(r);
    if (ids.has(id)) throw new Error(`Takroriy operationId: ${id}`);
    ids.add(id);

    const op: Json = {
      tags: [r.tag],
      summary: r.summary,
      description,
      operationId: id,
      ...(parameters.length > 0 ? { parameters } : {}),
      ...(requestBody ? { requestBody } : {}),
      responses: {
        [String(status)]: { description: SUCCESS_TEXT[status] ?? 'Muvaffaqiyatli', ...(successContent ? { content: successContent } : {}) },
        ...errs,
      },
      security: r.auth === 'public' ? [] : [{ bearerAuth: [] }, { cookieAuth: [] }],
      'x-role': r.auth,
    };
    paths[path] = { ...(paths[path] ?? {}), [r.method]: op };
  }

  const codes = Object.keys(ERROR_CODES);
  const tags = [...tagOrder, 'Tizim'].map((name) => ({
    name,
    ...(opts.tagDescriptions?.[name] ? { description: opts.tagDescriptions[name] } : {}),
  }));

  return {
    openapi: '3.0.3',
    info: {
      title: 'Mahalladosh API',
      version: '0.2.0',
      description: opts.description ?? "Avtomatik generatsiya qilingan shartnoma (`pnpm contract:build`).",
    },
    servers: opts.servers ?? [{ url: 'http://localhost:3000/api/v1', description: 'Lokal API' }],
    tags,
    paths,
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', description: 'Mobil: `Authorization: Bearer <opaque token>` (`POST /auth/login`, `client: "mobile"`)' },
        cookieAuth: { type: 'apiKey', in: 'cookie', name: 'mhd_session', description: "Veb: HttpOnly cookie; o'zgartiruvchi so'rovlarda `X-CSRF-Token` = `mhd_csrf` cookie qiymati va `Origin`" },
      },
      schemas: {
        ErrorCode: { type: 'string', enum: codes },
        ErrorResponse: {
          type: 'object',
          required: ['error'],
          properties: {
            error: {
              type: 'object',
              required: ['code', 'message', 'details'],
              properties: {
                code: { $ref: '#/components/schemas/ErrorCode' },
                message: { type: 'string', description: "O'zbek lotin" },
                details: { type: 'object', additionalProperties: true, description: 'VALIDATION_ERROR da `fields`: { maydon: xabar }' },
              },
            },
          },
          example: errorBody('VOTE_LIMIT_REACHED'),
        },
        Ready: {
          type: 'object',
          required: ['status', 'checks'],
          properties: {
            status: { type: 'string', enum: ['ok', 'fail'] },
            checks: {
              type: 'object',
              required: ['db', 'cache', 'storage'],
              properties: {
                db: { type: 'string', enum: ['ok', 'fail'] },
                cache: { type: 'string', enum: ['ok', 'fail'] },
                storage: { type: 'string', enum: ['ok', 'fail'] },
              },
            },
          },
        },
      },
    },
  };
}
