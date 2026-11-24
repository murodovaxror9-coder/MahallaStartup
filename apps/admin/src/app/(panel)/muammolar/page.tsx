'use client';
import Link from 'next/link';
import { useState } from 'react';
import { usePaged } from '@/lib/api';
import { CATEGORY_LABEL, fmtDate, isOverdue, STATUS_LABEL } from '@/lib/rules';
import type { Category, IssueStatus, IssueSummary } from '@/lib/types';
import { Async, LoadMore, Empty, PageHead, StatusBadge } from '@/components/ui';

const STATUSES = (Object.keys(STATUS_LABEL) as IssueStatus[]).filter((s) => s !== 'PENDING_REVIEW' && s !== 'REJECTED');

export default function IssuesPage() {
  const [f, setF] = useState({ category: '', status: '', period: '', sort: 'new' });
  const qs = new URLSearchParams(Object.entries(f).filter(([, v]) => v)).toString();
  const list = usePaged<IssueSummary>(`/issues?${qs}`);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });

  return (
    <>
      <PageHead title="Muammolar" sub="E’lon qilingan postlar va ularning holati" />
      <div className="row" style={{ marginBottom: 16 }}>
        <Select label="Toifa" value={f.category} onChange={set('category')}>
          <option value="">Barcha toifalar</option>
          {(Object.keys(CATEGORY_LABEL) as Category[]).map((c) => <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>)}
        </Select>
        <Select label="Holat" value={f.status} onChange={set('status')}>
          <option value="">Barcha holatlar</option>
          {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
        </Select>
        <Select label="Davr" value={f.period} onChange={set('period')}>
          <option value="">Barcha davrlar</option>
          <option value="current">Joriy oy ovozi</option>
        </Select>
        <Select label="Saralash" value={f.sort} onChange={set('sort')}>
          <option value="new">Eng yangi</option>
          <option value="votes">Eng ko‘p ovoz</option>
        </Select>
      </div>
      <Async q={list} isEmpty={(d) => d.items.length === 0} empty={<Empty title="Bu filtr bo‘yicha muammo yo‘q" />}>
        {(d) => (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Muammo</th><th>Holat</th><th>Ovoz</th><th>Muddat</th></tr>
              </thead>
              <tbody>
                {d.items.map((i) => (
                  <tr key={i.id}>
                    <td>
                      <Link href={`/muammolar/${i.id}`}><b>{i.title}</b></Link>
                      <span className="sub">{CATEGORY_LABEL[i.category]} · {i.locationText}{i.hidden && ' · yashirilgan'}</span>
                    </td>
                    <td><StatusBadge status={i.status} inCurrentRound={i.inCurrentRound} /></td>
                    <td style={{ fontVariantNumeric: 'tabular-nums' }}>{i.inCurrentRound ? i.voteCount : '—'}</td>
                    <td style={isOverdue(i.dueDate, i.status) ? { color: 'var(--danger)', fontWeight: 600 } : undefined}>
                      {fmtDate(i.dueDate)}{isOverdue(i.dueDate, i.status) && ' · o‘tgan'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Async>
      <LoadMore q={list} />
    </>
  );
}

function Select({ label, children, ...rest }: { label: string } & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <label className="field" style={{ minWidth: 170 }}>
      <span className="small muted">{label}</span>
      <select className="select" {...rest}>{children}</select>
    </label>
  );
}
