import { ERROR_CODES, type ErrorCode } from './error-codes';

/** Biznes xatolari uchun yagona klass. Filter uni `{ error: {...} }` ga aylantiradi. */
export class AppError extends Error {
  readonly status: number;

  constructor(
    readonly code: ErrorCode,
    message?: string,
    readonly details: Record<string, unknown> = {},
  ) {
    super(message ?? ERROR_CODES[code].message);
    this.status = ERROR_CODES[code].status;
  }
}

export interface ErrorBody {
  error: { code: ErrorCode; message: string; details: Record<string, unknown> };
}
