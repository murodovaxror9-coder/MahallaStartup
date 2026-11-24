'use client';
import { usePaged } from '@/lib/api';
import { fmtDateTime } from '@/lib/rules';
import type { AuditEvent } from '@/lib/types';
import { Async, LoadMore, Empty, PageHead } from '@/components/ui';

const ACTION: Record<string, string> = {
  USER_CREATED: 'Akkaunt ochdi',
  PASSWORD_RESET: 'Parolni tikladi',
  USER_BLOCKED: 'Akkauntni blokladi',
  USER_UNBLOCKED: 'Blokdan chiqardi',
  ISSUE_APPROVED: 'Postni tasdiqladi',
  ISSUE_REJECTED: 'Postni rad etdi',
  ISSUE_MERGED: 'Postni asosiy postga bog‘ladi',
  ISSUE_CARRIED_OVER: 'Postni joriy davrga kiritdi',
  ISSUE_IN_PROGRESS: 'Jarayonga o‘tkazdi',
  ISSUE_REFERRED: 'Tashkilotga yubordi',
  ISSUE_RESOLVED: 'Hal qilindi deb belgiladi',
  CONTENT_HIDDEN: 'Kontentni yashirdi',
  REPORT_DISMISSED: 'Shikoyatni yopdi',
  EVENT_CREATED: 'Tadbir qoralamasini yaratdi',
  EVENT_PUBLISHED: 'Tadbirni nashr qildi',
  EVENT_UPDATED: 'Tadbirni tahrirladi',
  EVENT_CANCELLED: 'Tadbirni bekor qildi',
  EVENT_COMPLETED: 'Tadbir natijasini kiritdi',
  ANNOUNCEMENT_DRAFTED: 'E’lon qoralamasini yozdi',
  ANNOUNCEMENT_UPDATED: 'E’lon qoralamasini tahrirladi',
  ANNOUNCEMENT_PUBLISHED: 'E’lonni nashr qildi',
};

export default function AuditPage() {
  const q = usePaged<AuditEvent>('/admin/audit');
  return (
    <>
      <PageHead title="Amallar jurnali" sub="Kim, qachon, qaysi obyektga qanday amal bajargani" />
      <Async q={q} isEmpty={(d) => d.items.length === 0} empty={<Empty title="Hali amal yozilmagan" />}>
        {(d) => (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Vaqt</th><th>Kim</th><th>Amal</th><th>Obyekt</th><th>Sabab</th></tr></thead>
              <tbody>
                {d.items.map((e) => (
                  <tr key={e.id}>
                    <td style={{ whiteSpace: 'nowrap' }}>{fmtDateTime(e.at)}</td>
                    <td>{e.actor.displayName}</td>
                    <td>{ACTION[e.action] ?? e.action}</td>
                    <td className="small">{e.targetType} · {e.targetId}</td>
                    <td className="pre small">{e.reason ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Async>
      <LoadMore q={q} />
    </>
  );
}
