'use client';
import Link from 'next/link';
import { useState } from 'react';
import { usePaged } from '@/lib/api';
import { fmtDate, isOverdue, STATUS_LABEL } from '@/lib/rules';
import type { IssueListItem, IssueStatus } from '@/lib/types';
import { Async, Empty, LoadMore, PageHead, StatusBadge } from '@/components/ui';

export default function IssuesPage() {
  const [f, setF] = useState({ status: '', overdue: '', sort: 'newest' });
  const qs = new URLSearchParams(Object.entries(f).filter(([, v]) => v)).toString();
  const list = usePaged<IssueListItem>(`/admin/issues?${qs}`);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });

  return (
    <>
      <PageHead title="Muammolar" sub="Mahalladagi barcha postlar, yashirilganlari ham" />
      <div className="row" style={{ marginBottom: 16 }}>
        <Select label="Holat" value={f.status} onChange={set('status')}>
          <option value="">Barcha holatlar</option>
          {(Object.keys(STATUS_LABEL) as IssueStatus[]).map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
        </Select>
        <Select label="Muddat" value={f.overdue} onChange={set('overdue')}>
          <option value="">Hammasi</option>
          <option value="true">Faqat muddati o‘tganlar</option>
        </Select>
        <Select label="Saralash" value={f.sort} onChange={set('sort')}>
          <option value="newest">Eng yangi</option>
          <option value="top">Eng ko‘p ovoz</option>
        </Select>
      </div>
      <Async q={list} isEmpty={(d) => d.items.length === 0} empty={<Empty title="Bu filtr bo‘yicha muammo yo‘q" />}>
        {(d) => (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Muammo</th><th>Holat</th><th>Ovoz</th><th>Mas’ul va muddat</th></tr>
              </thead>
              <tbody>
                {d.items.map((i) => (
                  <tr key={i.id}>
                    <td>
                      <Link href={`/issues/${i.id}`}><b>{i.title}</b></Link>
                      <span className="sub">
                        {i.categoryLabel} · {i.locationText} · {i.authorName}
                        {i.hidden && ' · yashirilgan'}
                        {i.duplicateOf && ` · «${i.duplicateOf.title}» ga bog‘langan`}
                      </span>
                    </td>
                    <td><StatusBadge status={i.status} label={i.statusLabel} /></td>
                    <td style={{ fontVariantNumeric: 'tabular-nums' }}>{i.voteCount ?? '—'}</td>
                    <td>
                      {i.responsible ?? '—'}
                      {i.dueDate && (
                        <span className="sub" style={isOverdue(i.dueDate, i.status) ? { color: 'var(--danger)', fontWeight: 600 } : undefined}>
                          {fmtDate(i.dueDate)}{isOverdue(i.dueDate, i.status) && ' · muddat o‘tgan'}
                        </span>
                      )}
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
