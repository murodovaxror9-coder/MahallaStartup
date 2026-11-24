import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ZodError } from 'zod';
import { AppError, type ErrorBody } from '../common/app-error';
import { ERROR_CODES, type ErrorCode } from '../common/error-codes';
import type { Logger } from '../core/logger';

export function zodFields(err: ZodError): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const issue of err.issues) {
    const key = issue.path.map(String).join('.') || '_';
    fields[key] ??= issue.message;
  }
  return fields;
}

const body = (code: ErrorCode, details: Record<string, unknown> = {}, message?: string): ErrorBody => ({
  error: { code, message: message ?? ERROR_CODES[code].message, details },
});

export interface ErrorResponse {
  status: number;
  body: ErrorBody;
  retryAfterSec?: number;
}

/** Har qanday xatoni `{ error: { code, message, details } }` formatiga keltiradi. */
export function toErrorResponse(err: unknown): ErrorResponse {
  if (err instanceof AppError) {
    const retry = err.details['retryAfterSec'];
    return {
      status: err.status,
      body: body(err.code, err.details, err.message),
      ...(typeof retry === 'number' ? { retryAfterSec: retry } : {}),
    };
  }
  if (err instanceof ZodError) {
    return { status: 400, body: body('VALIDATION_ERROR', { fields: zodFields(err) }) };
  }

  // body-parser (express.json) xatolari
  const e = err as { status?: number; type?: string } | null;
  if (e?.type === 'entity.too.large') return { status: 413, body: body('FILE_TOO_LARGE') };
  if (e?.type === 'entity.parse.failed') {
    return { status: 400, body: body('VALIDATION_ERROR', {}, "So'rov tanasi (JSON) noto'g'ri") };
  }
  if (typeof e?.status === 'number' && e.status >= 400 && e.status < 500) {
    return { status: e.status, body: body('VALIDATION_ERROR') };
  }

  return { status: 500, body: body('INTERNAL_ERROR') };
}

export const notFoundHandler: RequestHandler = (_req, _res, next) => {
  next(new AppError('NOT_FOUND'));
};

export function errorHandler(log: Logger): ErrorRequestHandler {
  return (err, req, res, _next) => {
    const out = toErrorResponse(err);
    if (out.status >= 500) {
      (req as { log?: Logger }).log?.error({ err }, 'kutilmagan xato');
      if (!(req as { log?: Logger }).log) log.error({ err }, 'kutilmagan xato');
    }
    if (res.headersSent) return;
    if (out.retryAfterSec) res.setHeader('Retry-After', String(out.retryAfterSec));
    res.status(out.status).json(out.body);
  };
}
