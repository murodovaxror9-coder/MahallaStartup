'use client';
import { Trophy } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { useApi, usePaged } from '@/lib/api';
import { fmtDate, fmtDateTime, monthName, timeLeft } from '@/lib/rules';
import type { AdminRound, IssueListItem, Page, RoundResult } from '@/lib/types';
import { Async, Button, Empty, LoadMore, PageHead } from '@/components/ui';

export default function RoundsPage() {
  const rounds = usePaged<AdminRound>('/admin/rounds');
  const ranking = useApi<Page<IssueListItem>>('/issues?period=current&sort=top&limit=50');

  return (
    <>
      <PageHead title="Ovoz natijalari" sub="Davr Toshkent vaqti bilan oyning 1-kuni 00:00 da ochiladi va yopiladi. G‘olibni server aniqlaydi, uni qo‘lda almashtirib bo‘lmaydi." />
      <Async q={rounds} rows={3} isEmpty={(d) => d.items.length === 0} empty={<Empty title="Hali ovoz davri yo‘q" />}>
        {(d) => {
          const cur = d.items.find((r) => r.status === 'OPEN');
          const past = d.items.filter((r) => r.status !== 'OPEN');
          const max = Math.max(1, ...(ranking.data?.items.map((i) => i.voteCount ?? 0) ?? [1]));
          return (
            <div className="stack" style={{ gap: 16 }}>
              {cur && (
                <section className="card stack" aria-labelledby="cur">
                  <div className="spread">
                    <h2 id="cur">{monthName(cur.periodStart)} — joriy davr</h2>
                    <span className="tag">Tugashiga {timeLeft(cur.periodEnd)}</span>
                  </div>
                  <p className="muted small">{fmtDateTime(cur.periodStart)} — {fmtDateTime(cur.periodEnd)}</p>
                  <Async q={ranking} isEmpty={(r) => r.items.length === 0} empty={<Empty title="Davrda hali post yo‘q" />}>
                    {(r) => (
                      <ol className="stack" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                        {r.items.map((i, n) => (
                          <li key={i.id} className="stack" style={{ gap: 6 }}>
                            <div className="spread">
                              <Link href={`/issues/${i.id}`}>{n + 1}. {i.title}</Link>
                              <b style={{ fontVariantNumeric: 'tabular-nums' }}>{i.voteCount ?? 0} ovoz</b>
                            </div>
                            <div className="bar" aria-hidden><i style={{ width: `${((i.voteCount ?? 0) / max) * 100}%` }} /></div>
                          </li>
                        ))}
                      </ol>
                    )}
                  </Async>
                  <p className="small muted">Tenglikda lentaga ertaroq chiqqan post yutadi.</p>
                </section>
              )}
              <h2>Yopilgan davrlar</h2>
              {past.length === 0 ? <Empty title="Hali yopilgan davr yo‘q" /> : past.map((r) => <PastRound key={r.id} r={r} />)}
            </div>
          );
        }}
      </Async>
      <LoadMore q={rounds} />
    </>
  );
}

function PastRound({ r }: { r: AdminRound }) {
  const [open, setOpen] = useState(false);
  const result = useApi<RoundResult>(open ? `/admin/rounds/${r.id}/result` : null);
  return (
    <section className="card stack" aria-label={monthName(r.periodStart)}>
      <div className="spread">
        <h3>{monthName(r.periodStart)}</h3>
        <span className="muted small">Yopildi: {fmtDate(r.periodEnd)} · {r.totalVoters ?? 0} ovoz beruvchi · {r.totalVotes ?? 0} ovoz</span>
      </div>
      {r.winner ? (
        <div className="row">
          <Trophy size={20} aria-hidden style={{ color: 'var(--s-selected)' }} />
          <span>G‘olib: <Link href={`/issues/${r.winner.issueId}`}><b>{r.winner.title}</b></Link> · {r.winner.votes} ovoz</span>
        </div>
      ) : (
        <p><b>Bu oy g‘olib aniqlanmadi</b></p>
      )}
      <Button size="sm" onClick={() => setOpen(!open)} aria-expanded={open} style={{ width: 'fit-content' }}>
        {open ? 'Reytingni yopish' : 'Yopilgandagi reyting'}
      </Button>
      {open && (
        <Async q={result} rows={2} isEmpty={(d) => d.ranking.length === 0} empty={<p className="muted">Ovoz berilmagan.</p>}>
          {(d) => (
            <table>
              <thead><tr><th>#</th><th>Post</th><th>Ovoz</th></tr></thead>
              <tbody>
                {d.ranking.map((t) => (
                  <tr key={t.issueId}>
                    <td>{t.rank}</td>
                    <td><Link href={`/issues/${t.issueId}`}>{t.title}</Link></td>
                    <td style={{ fontVariantNumeric: 'tabular-nums' }}>{t.votes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Async>
      )}
    </section>
  );
}
