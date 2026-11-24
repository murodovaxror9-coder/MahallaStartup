import { redactSecrets } from '../common/redact';
import type { Queryable } from './db';
import { uuidv7 } from './ids';

export interface AuditInput {
  mahallaId?: string | null;
  actorId?: string | null;
  action: string;
  targetType: string;
  targetId?: string | null;
  reason?: string | null;
  meta?: Record<string, unknown>;
  ip?: string | null;
}

/** Audit yozuvi. Parol/token/push token `redactSecrets` orqali hech qachon yozilmaydi. */
export async function audit(q: Queryable, e: AuditInput): Promise<void> {
  await q.query(
    `INSERT INTO audit_events (id, mahalla_id, actor_id, action, target_type, target_id, reason, meta, ip)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9)`,
    [
      uuidv7(),
      e.mahallaId ?? null,
      e.actorId ?? null,
      e.action,
      e.targetType,
      e.targetId ?? null,
      e.reason ?? null,
      JSON.stringify(redactSecrets(e.meta ?? {})),
      e.ip ?? null,
    ],
  );
}
