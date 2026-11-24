'use client';
import Link from 'next/link';
import { useApi } from '@/lib/api';
import { fmtDate, fmtDateTime, monthName, timeLeft } from '@/lib/rules';
import type { Dashboard, IssueListItem, Page } from '@/lib/types';
import { Async, Empty, PageHead, StatusBadge } from '@/components/ui';

export default function DashboardPage() {
  const q = useApi<Dashboard>('/admin/dashboard');
  const overdue = useApi<Page<IssueListItem>>('/admin/issues?overdue=true&limit=5');
  return (
    <>
      <PageHead title="Umumiy ko‘rsatkichlar" sub="Joriy oy bo‘yicha holat" />
      <Async q={q} rows={4}>
        {(d) => (
          <div className="stack" style={{ gap: 16 }}>
            <div className="grid">
              {d.round ? (
                <Kpi label={`${monthName(d.round.periodStart)} ovozi tugashiga`} value={timeLeft(d.round.periodEnd)} note={`${fmtDate(d.round.periodEnd)} 00:00 gacha`} href="/rounds" />
              ) : (
                <Kpi label="Ovoz berish davri" value="—" note="Joriy davr yo‘q" />
              )}
              <Kpi label="Faol ovoz beruvchilar" value={String(d.activeVoters)} note={`${d.totalResidents} aholidan`} />
              <Kpi label="Moderatsiya kutmoqda" value={String(d.pendingModeration)} href="/moderation" />
              <Kpi label="Ochiq shikoyatlar" value={String(d.openReports)} href="/reports" />
            </div>
            <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(320px, 100%), 1fr))' }}>
              <section className="card stack" aria-labelledby="overdue">
                <div className="spread">
                  <h2 id="overdue">Muddatidan o‘tgan ishlar</h2>
                  <span className="tag">{d.overdueIssues}</span>
                </div>
                {d.overdueIssues === 0 || !overdue.data?.items.length ? (
                  <Empty title="Muddati o‘tgan ish yo‘q" />
                ) : (
                  overdue.data.items.map((i) => (
                    <Link key={i.id} href={`/issues/${i.id}`} className="spread" style={{ color: 'inherit', textDecoration: 'none' }}>
                      <div>
                        <b>{i.title}</b>
                        <div className="small" style={{ color: 'var(--danger)' }}>Muddat: {fmtDate(i.dueDate)} · {i.responsible}</div>
                      </div>
                      <StatusBadge status={i.status} label={i.statusLabel} />
                    </Link>
                  ))
                )}
              </section>
              <section className="card stack" aria-labelledby="next-ev">
                <h2 id="next-ev">Navbatdagi tadbir</h2>
                {d.nextEvent ? (
                  <div className="stack" style={{ gap: 4 }}>
                    <b>{d.nextEvent.title}</b>
                    <span className="muted">{fmtDateTime(d.nextEvent.startsAt)} · {d.nextEvent.location}</span>
                    <span>{d.nextEvent.rsvpCount} kishi qatnashadi</span>
                    <Link href="/events">Tadbirlarga o‘tish</Link>
                  </div>
                ) : (
                  <Empty title="Rejalashtirilgan tadbir yo‘q">
                    <Link href="/events">Tadbir yaratish</Link>
                  </Empty>
                )}
              </section>
            </div>
          </div>
        )}
      </Async>
    </>
  );
}

function Kpi({ label, value, note, href }: { label: string; value: string; note?: string; href?: string }) {
  const body = (
    <>
      <span>{label}</span>
      <b>{value}</b>
      {note && <span className="small">{note}</span>}
    </>
  );
  return href ? (
    <Link href={href} className="card kpi" style={{ color: 'inherit', textDecoration: 'none' }}>
      {body}
    </Link>
  ) : (
    <div className="card kpi">{body}</div>
  );
}
