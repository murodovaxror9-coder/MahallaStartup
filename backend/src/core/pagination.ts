import { z } from 'zod';
import { AppError } from '../common/app-error';

export const pageQuery = z.object({
  cursor: z.string().max(500).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export interface Page<T> {
  items: T[];
  nextCursor: string | null;
}

export const encodeCursor = (value: unknown): string =>
  Buffer.from(JSON.stringify(value)).toString('base64url');

export function decodeCursor<T>(raw: string | undefined, schema: z.ZodType<T>): T | undefined {
  if (!raw) return undefined;
  try {
    return schema.parse(JSON.parse(Buffer.from(raw, 'base64url').toString('utf8')));
  } catch {
    throw new AppError('VALIDATION_ERROR', undefined, { fields: { cursor: "Kursor noto'g'ri" } });
  }
}

/** `limit + 1` ta qator so'ralgan bo'lishi kerak: ortiqchasi keyingi sahifa borligini bildiradi. */
export function toPage<T>(rows: T[], limit: number, cursorOf: (last: T) => unknown): Page<T> {
  const items = rows.slice(0, limit);
  const last = items[items.length - 1];
  const hasMore = rows.length > limit && last !== undefined;
  return { items, nextCursor: hasMore ? encodeCursor(cursorOf(last)) : null };
}
