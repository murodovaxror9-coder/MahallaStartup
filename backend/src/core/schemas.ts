import { z } from 'zod';

export const uuid = z.uuid();

/** Javobdagi sana-vaqt (ISO 8601, UTC) — hujjat va testlar uchun. */
export const dt = z.iso.datetime();
export const idParam = z.object({ id: uuid });

/** Trim qilinadigan matn, o'zbekcha xabar bilan. */
export const text = (min: number, max: number) => {
  const msg = `${min}–${max} belgi bo'lsin`;
  return z.string().trim().min(min, msg).max(max, msg);
};

export const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Sana YYYY-MM-DD ko'rinishida bo'lsin")
  .refine((s) => !Number.isNaN(Date.parse(`${s}T00:00:00Z`)), "Sana noto'g'ri");

export const isoDateTime = z
  .string()
  .refine((s) => !Number.isNaN(Date.parse(s)) && /^\d{4}-\d{2}-\d{2}T/.test(s), "Sana-vaqt ISO 8601 bo'lsin")
  .transform((s) => new Date(s));

export const loginSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9._]{3,32}$/, "Login 3–32 belgi: kichik lotin harflari, raqam, nuqta va pastki chiziq");

export const page = <T extends z.ZodType>(item: T) =>
  z.object({ items: z.array(item), nextCursor: z.string().nullable() });
