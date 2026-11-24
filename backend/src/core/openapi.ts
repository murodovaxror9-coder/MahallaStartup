import { z } from 'zod';
import { ERROR_CODES } from '../common/error-codes';
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
    .map((s) => (s.startsWith(':') ? `By${s[1]?.toUpperCase()}${s.slice(2)}` : s.replace(/[^a-zA-Z0-9]+(.)?/g, (_m, c: string | undefined) => (c ? c.toUpperCase() : ''))))
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1));
  return r.method + words.join('');
};

const errorRef = { $ref: '#/components/schemas/ErrorResponse' };
const errorResponse = (description: string): Json => ({
  description,
  content: { 'application/json': { schema: errorRef } },
});

const SUCCESS_TEXT: Record<number, string> = { 200: 'Muvaffaqiyatli', 201: 'Yaratildi', 204: "Muvaffaqiyatli (javob tanasi yo'q)" };

export function buildOpenApi(routes: readonly AnyRoute[], responses: Record<string, z.ZodType>): Json {
  const paths: Record<string, Json> = {
    '/health': {
      servers: [{ url: 'http://localhost:3000' }],
      get: {
        tags: ['Tizim'],
        summary: 'Liveness: jarayon tirik (bog‘liqliklarga qaramaydi)',
        operationId: 'getHealth',
        responses: { '200': { description: 'Tirik', content: { 'application/json': { schema: { type: 'object', required: ['status'], properties: { status: { type: 'string', enum: ['ok'] } } } } } } },
      },
    },
    '/ready': {
      servers: [{ url: 'http://localhost:3000' }],
      get: {
        tags: ['Tizim'],
        summary: 'Readiness: DB, kesh va saqlash alohida hisobot qilinadi',
        operationId: 'getReady',
        responses: {
          '200': { description: 'Hammasi ishlayapti', content: { 'application/json': { schema: { $ref: '#/components/schemas/Ready' } } } },
          '503': { description: 'Kamida bitta bog‘liqlik ishlamayapti', content: { 'application/json': { schema: { $ref: '#/components/schemas/Ready' } } } },
        },
      },
    },
  };

  const ids = new Set<string>();
  for (const r of routes) {
    const path = r.path.replace(/:([A-Za-z0-9_]+)/g, '{$1}');
    const status = r.status ?? 200;
    const parameters: Json[] = [
      ...(r.params ? toParameters(r.params, 'path') : []),
      ...(r.query ? toParameters(r.query, 'query') : []),
    ];
    if (r.method === 'post' && r.path === '/issues') {
      parameters.push({
        name: 'Idempotency-Key',
        in: 'header',
        required: true,
        description: "8–100 belgi; qayta yuborish o'sha postni qaytaradi",
        schema: { type: 'string', minLength: 8, maxLength: 100 },
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
      requestBody = { required: true, content: { 'application/json': { schema: jsonSchema(r.body, 'input') } } };
    }

    const schema = r.response ?? responses[`${r.method.toUpperCase()} ${r.path}`];
    const successDescription = SUCCESS_TEXT[status] ?? 'Muvaffaqiyatli';
    const successContent =
      status === 204
        ? undefined
        : { 'application/json': { schema: schema ? jsonSchema(schema, 'output') : { type: 'object', additionalProperties: true } } };

    const responsesObj: Record<string, Json> = {
      [String(status)]: { description: successDescription, ...(successContent ? { content: successContent } : {}) },
    };
    if (requestBody || parameters.length > 0) responsesObj['400'] = errorResponse("VALIDATION_ERROR: so'rov noto'g'ri (details.fields)");
    if (r.auth !== 'public') {
      responsesObj['401'] = errorResponse('UNAUTHENTICATED: sessiya yo‘q yoki bekor qilingan');
      responsesObj['403'] = errorResponse('FORBIDDEN / PASSWORD_CHANGE_REQUIRED / CSRF_INVALID');
    }
    if (r.params) responsesObj['404'] = errorResponse('NOT_FOUND: topilmadi (boshqa mahalla obyekti ham shunday)');
    responsesObj['429'] = errorResponse('RATE_LIMITED / TOO_MANY_ATTEMPTS (Retry-After header)');

    const id = operationId(r);
    if (ids.has(id)) throw new Error(`Takroriy operationId: ${id}`);
    ids.add(id);

    const op: Json = {
      tags: [r.tag],
      summary: r.summary,
      ...(r.description ? { description: r.description } : {}),
      operationId: id,
      ...(parameters.length > 0 ? { parameters } : {}),
      ...(requestBody ? { requestBody } : {}),
      responses: responsesObj,
      security: r.auth === 'public' ? [] : [{ bearerAuth: [] }, { cookieAuth: [] }],
      'x-role': r.auth,
    };
    paths[path] = { ...(paths[path] ?? {}), [r.method]: op };
  }

  const codes = Object.keys(ERROR_CODES);
  return {
    openapi: '3.0.3',
    info: {
      title: 'Mahalladosh API',
      version: '0.2.0',
      description:
        "Avtomatik generatsiya qilingan shartnoma (`pnpm contract:build`): marshrutlar va zod sxemalardan. " +
        "Xato formati hamma joyda bir xil: `{ error: { code, message, details } }`. Kursorli sahifalash: `?cursor=&limit=` -> `{ items, nextCursor }`.",
    },
    servers: [{ url: 'http://localhost:3000/api/v1', description: 'Lokal API' }],
    tags: [...new Set(routes.map((r) => r.tag))].map((name) => ({ name })),
    paths,
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', description: 'Mobil: `Authorization: Bearer <opaque token>`' },
        cookieAuth: { type: 'apiKey', in: 'cookie', name: 'mhd_session', description: "Veb: HttpOnly cookie; o'zgartiruvchi so'rovlarda `X-CSRF-Token` = `mhd_csrf` cookie" },
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
          example: { error: { code: 'VOTE_LIMIT_REACHED', message: 'Bu oy uchun 3 ta ovozingizdan foydalandingiz', details: {} } },
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
