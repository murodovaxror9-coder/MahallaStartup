'use client';
import { Trophy } from 'lucide-react';
import Link from 'next/link';
import { useApi } from '@/lib/api';
import { fmtDate, fmtDateTime, timeLeft } from '@/lib/rules';
import type { IssueSummary, Page, Round } from '@/lib/types';
import { Async, Empty, PageHead } from '@/components/ui';

const MONTHS = ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun', 'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr'];
const monthName = (m: string) => `${MONTHS[Number(m.slice(5, 7)) - 1]} ${m.slice(0, 4)}`;

export default function VotingPage() {
  const rounds = useApi<Page<Round>>('/rounds');
  const ranking = useApi<Page<IssueSummary>>('/issues?period=current&sort=votes&limit=100');

  return (
    <>
      <PageHead title="Ovoz natijalari" sub="Davr Toshkent vaqti bilan oyning 1-kuni 00:00 da ochiladi va yopiladi. G‘olibni server aniqlaydi." />
      <Async q={rounds} rows={3}>
        {(d) => {
          const cur = d.items.find((r) => r.status === 'OPEN');
          const past = d.items.filter((r) => r.status === 'CLOSED');
          const max = Math.max(1, ...(ranking.data?.items.map((i) => i.voteCount) ?? [1]));
          return (
            <div className="stack" style={{ gap: 16 }}>
              {cur && (
                <section className="card stack" aria-labelledby="cur">
                  <div className="spread">
                    <h2 id="cur">{monthName(cur.month)} — joriy davr</h2>
                    <span className="tag">Tugashiga {timeLeft(cur.endsAt)}</span>
                  </div>
                  <p className="muted small">{fmtDateTime(cur.startsAt)} — {fmtDateTime(cur.endsAt)} · {cur.entryCount} ta post · {cur.voterCount} ovoz beruvchi</p>
                  <Async q={ranking} isEmpty={(r) => r.items.length === 0} empty={<Empty title="Davrda hali post yo‘q" />}>
                    {(r) => (
                      <ol className="stack" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                        {r.items.map((i, n) => (
                          <li key={i.id} className="stack" style={{ gap: 6 }}>
                            <div className="spread">
                              <Link href={`/muammolar/${i.id}`}>{n + 1}. {i.title}</Link>
                              <b style={{ fontVariantNumeric: 'tabular-nums' }}>{i.voteCount} ovoz</b>
                            </div>
                            <div className="bar" aria-hidden><i style={{ width: `${(i.voteCount / max) * 100}%` }} /></div>
                          </li>
                        ))}
                      </ol>
                    )}
                  </Async>
                  <p className="small muted">Tenglikda lentaga ertaroq chiqqan post yutadi. Admin g‘olibni qo‘lda almashtira olmaydi.</p>
                </section>
              )}
              <h2>Yopilgan davrlar</h2>
              {past.length === 0 ? (
                <Empty title="Hali yopilgan davr yo‘q" />
              ) : (
                past.map((r) => (
                  <section key={r.id} className="card stack" aria-label={monthName(r.month)}>
                    <div className="spread">
                      <h3>{monthName(r.month)}</h3>
                      <span className="muted small">Yopildi: {fmtDate(r.result?.closedAt)} · {r.voterCount} ovoz beruvchi</span>
                    </div>
                    {r.result?.winner ? (
                      <div className="row">
                        <Trophy size={20} aria-hidden style={{ color: 'var(--s-selected)' }} />
                        <span>G‘olib: <Link href={`/muammolar/${r.result.winner.id}`}><b>{r.result.winner.title}</b></Link></span>
                      </div>
                    ) : (
                      <p><b>Bu oy g‘olib aniqlanmadi</b></p>
                    )}
                    {r.result && r.result.tally.length > 0 && (
                      <table>
                        <thead><tr><th>Post</th><th>Yopilgandagi ovoz</th></tr></thead>
                        <tbody>
                          {r.result.tally.map((t) => (
                            <tr key={t.issueId}><td>{t.title}</td><td style={{ fontVariantNumeric: 'tabular-nums' }}>{t.votes}</td></tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </section>
                ))
              )}
            </div>
          );
        }}
      </Async>
    </>
  );
}
