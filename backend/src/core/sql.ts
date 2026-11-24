/** Dinamik SQL uchun parametrlar yig'uvchi: `p.add(x)` -> `$n`. */
export class Params {
  readonly values: unknown[] = [];

  add(value: unknown): string {
    this.values.push(value === undefined ? null : value);
    return `$${this.values.length}`;
  }
}

/**
 * JS massivini Postgres massiv literaliga aylantiradi (`'{a,b}'`), keyin SQL'da `$1::uuid[]` deb cast qilinadi.
 * Bu `pg` va PGlite uchun bir xil ishlaydi (drayverga xos massiv serializatsiyasiga tayanmaymiz).
 */
export function pgArray(values: readonly string[]): string {
  return `{${values.map((v) => `"${v.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`).join(',')}}`;
}

export function isUniqueViolation(err: unknown, constraintPart?: string): boolean {
  const e = err as { code?: string; constraint?: string; message?: string } | null;
  if (e?.code !== '23505') return false;
  if (!constraintPart) return true;
  return (e.constraint ?? e.message ?? '').includes(constraintPart);
}

export function escapeLike(input: string): string {
  return input.replace(/[\\%_]/g, (c) => `\\${c}`);
}
