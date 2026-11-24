import type { Queryable } from './db';
import { pgArray } from './sql';

export type NotificationType =
  | 'ISSUE_STATUS_CHANGED'
  | 'ISSUE_REJECTED'
  | 'ROUND_WINNER'
  | 'FOLLOWED_ISSUE_UPDATE'
  | 'AUTHOR_FEEDBACK'
  | 'EVENT_UPDATED'
  | 'EVENT_CANCELLED'
  | 'EVENT_REMINDER'
  | 'IMPORTANT_ANNOUNCEMENT';

export type EntityType = 'ISSUE' | 'EVENT' | 'ANNOUNCEMENT' | 'ROUND';

export interface NotifyInput {
  userIds: readonly string[];
  mahallaId: string;
  type: NotificationType;
  title: string;
  body: string;
  entityType: EntityType;
  entityId: string;
  /** (userId, dedupeKey) unikal: bir xil kalit bilan qayta yaratish dublikat bermaydi */
  dedupeKey: string;
}

/**
 * Bildirishnomalarni `ON CONFLICT DO NOTHING` bilan yaratadi va FAQAT yangi qo'shilganlar sonini qaytaradi.
 * Push alohida ishchi (jobs/push) tomonidan `pushed_at IS NULL` qatorlar uchun yuboriladi,
 * shuning uchun dublikat qatorlar uchun push ham ketmaydi.
 */
export async function notify(q: Queryable, n: NotifyInput): Promise<number> {
  const users = [...new Set(n.userIds)];
  if (users.length === 0) return 0;
  const r = await q.query(
    `INSERT INTO notifications (id, user_id, mahalla_id, type, title, body, entity_type, entity_id, dedupe_key)
     SELECT gen_random_uuid(), u, $2::uuid, $3::text, $4::text, $5::text, $6::text, $7::uuid, $8::text
     FROM unnest($1::uuid[]) AS u
     ON CONFLICT (user_id, dedupe_key) DO NOTHING`,
    [pgArray(users), n.mahallaId, n.type, n.title, n.body, n.entityType, n.entityId, n.dedupeKey],
  );
  return r.rowCount;
}
