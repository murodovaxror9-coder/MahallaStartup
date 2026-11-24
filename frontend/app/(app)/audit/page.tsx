'use client';
import { usePaged } from '@/lib/api';
import { fmtDateTime } from '@/lib/rules';
import type { AuditEvent } from '@/lib/types';
import { Async, Empty, LoadMore, PageHead } from '@/components/ui';

const ACTION: Record<string, string> = {
  'auth.change_password': 'Parolini almashtirdi',
  'resident.create': 'Akkaunt ochdi',
  'resident.reset_password': 'Parolni tikladi',
  'resident.block': 'Akkauntni blokladi',
  'resident.unblock': 'Blokdan chiqardi',
  'issue.approve': 'Postni tasdiqladi',
  'issue.reject': 'Postni rad etdi',
  'issue.merge': 'Postni asosiy postga bog‘ladi',
  'issue.carry_over': 'Postni joriy davrga o‘tkazdi',
  'issue.transition': 'Holatni o‘zgartirdi',
  'issue.work_update': 'Mas’ul/muddatni o‘zgartirdi',
  'content.hide': 'Kontentni yashirdi',
  'content.unhide': 'Kontentni qaytardi',
  'report.hide': 'Shikoyat bo‘yicha yashirdi',
  'report.dismiss': 'Shikoyatni rad etdi',
  'event.create': 'Tadbir yaratdi',
  'event.update': 'Tadbirni tahrirladi',
  'event.publish': 'Tadbirni nashr qildi',
  'event.cancel': 'Tadbirni bekor qildi',
  'event.complete': 'Tadbir natijasini kiritdi',
  'announcement.create': 'E’lon qoralamasini yozdi',
  'announcement.update': 'E’lonni tahrirladi',
  'announcement.publish': 'E’lonni nashr qildi',
  'announcement.delete': 'E’lon qoralamasini o‘chirdi',
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
                    <td style={{ whiteSpace: 'nowrap' }}>{fmtDateTime(e.createdAt)}</td>
                    <td>{e.actorName ?? 'Tizim'}</td>
                    <td>{ACTION[e.action] ?? e.action}</td>
                    <td className="small">{e.targetType}</td>
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
