'use client';
import { Check, Link2, X } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { api, formValues, useAction, useApi, usePaged } from '@/lib/api';
import { fmtDateTime } from '@/lib/rules';
import type { IssueDetail, IssueListItem, Page } from '@/lib/types';
import { MediaGrid } from '@/components/issue';
import { Async, Button, Empty, Field, LoadMore, Modal, Notice, PageHead, StatusBadge } from '@/components/ui';

export default function ModerationPage() {
  const queue = usePaged<IssueListItem>('/admin/moderation/queue');
  const [dlg, setDlg] = useState<{ kind: 'reject' | 'merge'; issue: IssueListItem } | null>(null);
  const [busy, setBusy] = useState('');
  const act = useAction();
  const close = () => (setDlg(null), act.reset());

  async function run(issue: IssueListItem, action: string, json?: object) {
    setBusy(issue.id);
    const ok = await act.run(() => api<unknown>(`/admin/issues/${issue.id}/${action}`, { method: 'POST', json }).then(() => true));
    if (ok) {
      close();
      queue.reload();
    }
  }

  return (
    <>
      <PageHead title="Moderatsiya navbati" sub="Tasdiqlangan post lentaga va joriy ovoz davriga qo‘shiladi. Eskisi birinchi." />
      {act.error && !dlg && <Notice kind="error">{act.error.message}</Notice>}
      <Async q={queue} isEmpty={(d) => d.items.length === 0} empty={<Empty title="Navbat bo‘sh">Barcha postlar ko‘rib chiqilgan.</Empty>}>
        {(d) => (
          <div className="stack" style={{ gap: 16 }}>
            {d.items.map((i) => (
              <article key={i.id} className="card stack" aria-labelledby={`t-${i.id}`}>
                <div className="spread">
                  <div className="row">
                    <StatusBadge status={i.status} label={i.statusLabel} />
                    <span className="tag">{i.categoryLabel}</span>
                  </div>
                  <span className="muted small">{i.authorName} · {fmtDateTime(i.createdAt)}</span>
                </div>
                <h2 id={`t-${i.id}`}><Link href={`/issues/${i.id}`} style={{ color: 'inherit' }}>{i.title}</Link></h2>
                <IssueBody id={i.id} />
                <p className="small"><b>Joy:</b> {i.locationText}</p>
                <div className="row">
                  <Button variant="primary" icon={Check} loading={act.pending && !dlg && busy === i.id} onClick={() => run(i, 'approve')}>Tasdiqlash</Button>
                  <Button variant="danger" icon={X} onClick={() => setDlg({ kind: 'reject', issue: i })}>Rad etish</Button>
                  <Button icon={Link2} onClick={() => setDlg({ kind: 'merge', issue: i })}>Asosiy postga bog‘lash</Button>
                </div>
              </article>
            ))}
          </div>
        )}
      </Async>
      <LoadMore q={queue} />

      <Modal open={dlg?.kind === 'reject'} onClose={close} title="Postni rad etish">
        {dlg && (
          <form className="stack" noValidate onSubmit={(e) => (e.preventDefault(), run(dlg.issue, 'reject', formValues(e.currentTarget)))}>
            <p>Muallif sababni ko‘radi, postni tuzatib qayta yuborishi mumkin.</p>
            {act.error && !act.error.fields.reason && <Notice kind="error">{act.error.message}</Notice>}
            <Field label="Sabab" name="reason" textarea error={act.error?.fields.reason} placeholder="Masalan: joyni aniqroq yozing" required />
            <div className="row" style={{ justifyContent: 'flex-end' }}>
              <Button onClick={close}>Bekor qilish</Button>
              <Button type="submit" variant="danger" loading={act.pending}>Rad etish</Button>
            </div>
          </form>
        )}
      </Modal>

      <Modal open={dlg?.kind === 'merge'} onClose={close} title="Asosiy postga bog‘lash">
        {dlg && <MergeForm issue={dlg.issue} pending={act.pending} error={act.error?.message} onCancel={close} onSubmit={(targetIssueId) => run(dlg.issue, 'merge', { targetIssueId })} />}
      </Modal>
    </>
  );
}

/** Navbat elementida tavsif va media yo'q; ularni tafsilotdan olamiz. */
function IssueBody({ id }: { id: string }) {
  const q = useApi<IssueDetail>(`/admin/issues/${id}`);
  if (!q.data) return q.error ? <p className="small" style={{ color: 'var(--danger)' }}>{q.error.message}</p> : <div className="skel" />;
  return (
    <>
      <p className="pre">{q.data.description}</p>
      <MediaGrid media={q.data.media} />
    </>
  );
}

function MergeForm({ issue, pending, error, onCancel, onSubmit }: { issue: IssueListItem; pending: boolean; error?: string; onCancel: () => void; onSubmit: (id: string) => void }) {
  const targets = useApi<Page<IssueListItem>>('/issues?sort=newest&limit=50');
  const [sel, setSel] = useState('');
  return (
    <form className="stack" noValidate onSubmit={(e) => (e.preventDefault(), sel && onSubmit(sel))}>
      <p>«{issue.title}» lentaga chiqmaydi. Muallif asosiy postni avtomatik kuzatadi va o‘sha yerda ovoz bera oladi.</p>
      {error && <Notice kind="error">{error}</Notice>}
      <div className="field">
        <label htmlFor="primary">Asosiy post</label>
        <select id="primary" className="select" value={sel} onChange={(e) => setSel(e.target.value)} required>
          <option value="">{targets.data ? 'Tanlang…' : 'Yuklanmoqda…'}</option>
          {targets.data?.items.map((p) => (
            <option key={p.id} value={p.id}>{p.title} — {p.categoryLabel}</option>
          ))}
        </select>
      </div>
      <div className="row" style={{ justifyContent: 'flex-end' }}>
        <Button onClick={onCancel}>Bekor qilish</Button>
        <Button type="submit" variant="primary" icon={Link2} loading={pending} disabled={!sel}>Bog‘lash</Button>
      </div>
    </form>
  );
}
