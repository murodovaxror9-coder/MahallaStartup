/** Log va auditga hech qachon tushmasligi kerak bo'lgan kalitlar (kichik harfda). */
const SECRET_KEYS = new Set([
  'password',
  'token',
  'authorization',
  'cookie',
  'set-cookie',
  'expopushtoken',
  'x-csrf-token',
]);

export const REDACTED = '[REDACTED]';

function isSecretKey(key: string): boolean {
  const k = key.toLowerCase();
  return SECRET_KEYS.has(k) || k.includes('password') || k.includes('token') || k.includes('secret');
}

/** Obyektdan maxfiy maydonlarni rekursiv olib tashlaydi (asl obyektni o'zgartirmaydi). */
export function redactSecrets<T>(value: T, depth = 0): T {
  if (depth > 8 || value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map((v) => redactSecrets(v, depth + 1)) as T;
  if (value instanceof Date) return value;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    out[k] = isSecretKey(k) ? REDACTED : redactSecrets(v, depth + 1);
  }
  return out as T;
}

/** pino `redact.paths` — so'rov/javob loglari uchun. */
export const PINO_REDACT_PATHS = [
  'req.headers.authorization',
  'req.headers.cookie',
  'req.headers["x-csrf-token"]',
  'res.headers["set-cookie"]',
  '*.password',
  '*.currentPassword',
  '*.newPassword',
  '*.temporaryPassword',
  '*.token',
  '*.expoPushToken',
];
