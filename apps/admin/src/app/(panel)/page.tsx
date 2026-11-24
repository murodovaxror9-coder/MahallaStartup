'use client';
import Link from 'next/link';
import { useApi } from '@/lib/api';
import { fmtDate, fmtDateTime, timeLeft } from '@/lib/rules';
import type { Dashboard } from '@/lib/types';
import { Async, Empty, PageHead, StatusBadge } from '@/components/ui';

export default function DashboardPage() {
  const q = useApi<Dashboard>('/admin/dashboard');
  return (
    <>
      <PageHead title="Umumiy ko‘rsatkichlar" sub="Joriy oy bo‘yicha holat" />
      <Async q={q} rows={4}>
        {(d) => (
          <div className="stack" style={{ gap: 16 }}>
            <div className="grid">
              <Kpi label="Ovoz berish tugashiga" value={timeLeft(d.round.endsAt)} note={`${fmtDate(d.round.endsAt)} 00:00 gacha`} />
              <Kpi label="Faol ovoz beruvchilar" value={String(d.activeVoters)} note={`${d.residents} faol aholidan`} />
              <Kpi label="Moderatsiya kutmoqda" value={String(d.pendingModeration)} href="/moderatsiya" />
              <Kpi label="Ochiq shikoyatlar" value={String(d.openReports)} href="/shikoyatlar" />
            </div>
            <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(320px, 100%), 1fr))' }}>
              <section className="card stack" aria-labelledby="overdue">
                <h2 id="overdue">Muddatidan o‘tgan ishlar</h2>
                {d.overdueIssues.length === 0 ? (
                  <Empty title="Muddati o‘tgan ish yo‘q" />
                ) : (
                  d.overdueIssues.map((i) => (
                    <Link key={i.id} href={`/muammolar/${i.id}`} className="spread" style={{ color: 'inherit', textDecoration: 'none' }}>
                      <div>
                        <b>{i.title}</b>
                        <div className="small" style={{ color: 'var(--danger)' }}>Muddat: {fmtDate(i.dueDate)}</div>
                      </div>
                      <StatusBadge status={i.status} />
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
                    <Link href="/tadbirlar">Tadbirlarga o‘tish</Link>
                  </div>
                ) : (
                  <Empty title="Rejalashtirilgan tadbir yo‘q">
                    <Link href="/tadbirlar">Tadbir yaratish</Link>
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
