'use client';
import { Check, Link2, X } from 'lucide-react';
import { useState } from 'react';
import { api, formValues, useAction, useApi, usePaged } from '@/lib/api';
import { CATEGORY_LABEL, fmtDateTime } from '@/lib/rules';
import type { IssueDetail, IssueSummary, Page } from '@/lib/types';
import { MediaGrid } from '@/components/issue';
import { Async, LoadMore, Button, Empty, Field, Modal, Notice, PageHead, StatusBadge } from '@/components/ui';

export default function ModerationPage() {
  const queue = usePaged<IssueDetail>('/admin/moderation');
  const published = useApi<Page<IssueSummary>>('/issues?sort=new&limit=100');
  const [dlg, setDlg] = useState<{ kind: 'reject' | 'merge'; issue: IssueDetail } | null>(null);
  const act = useAction();
  const close = () => (setDlg(null), act.reset());

  const [busy, setBusy] = useState('');

  async function run(issue: IssueDetail, action: string, body?: object) {
    setBusy(issue.id);
    const r = await act.run(() => api(`/admin/issues/${issue.id}/${action}`, { method: 'POST', body }));
    if (r) { close(); queue.reload(); published.reload(); }
  }

  return (
    <>
      <PageHead title="Moderatsiya navbati" sub="Tasdiqlangan post lentaga va joriy ovoz davriga qo‘shiladi" />
      {act.error && !dlg && <Notice kind="error">{act.error.message}</Notice>}
      <Async q={queue} isEmpty={(d) => d.items.length === 0} empty={<Empty title="Navbat bo‘sh">Barcha postlar ko‘rib chiqilgan.</Empty>}>
        {(d) => (
          <div className="stack" style={{ gap: 16 }}>
            {d.items.map((i) => (
              <article key={i.id} className="card stack" aria-labelledby={`t-${i.id}`}>
                <div className="spread">
                  <div className="row">
                    <StatusBadge status={i.status} />
                    <span className="tag">{CATEGORY_LABEL[i.category]}</span>
                  </div>
                  <span className="muted small">{i.author.displayName} · {fmtDateTime(i.createdAt)}</span>
                </div>
                <h2 id={`t-${i.id}`}>{i.title}</h2>
                <p className="pre">{i.description}</p>
                <p className="small"><b>Joy:</b> {i.locationText}</p>
                <MediaGrid media={i.media} />
                <div className="row">
                  <Button variant="primary" icon={Check} loading={act.pending && !dlg && busy === i.id}onClick={() => run(i, 'approve')}>Tasdiqlash</Button>
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
            <Field label="Sabab" name="reason" textarea error={act.error?.fields.reason} placeholder="Masalan: joyni aniqroq yozing" required autoFocus />
            <div className="row" style={{ justifyContent: 'flex-end' }}>
              <Button onClick={close}>Bekor qilish</Button>
              <Button type="submit" variant="danger" loading={act.pending}>Rad etish</Button>
            </div>
          </form>
        )}
      </Modal>

      <Modal open={dlg?.kind === 'merge'} onClose={close} title="Asosiy postga bog‘lash">
        {dlg && (
          <form className="stack" noValidate onSubmit={(e) => (e.preventDefault(), run(dlg.issue, 'merge', formValues(e.currentTarget)))}>
            <p>Bu post lentaga chiqmaydi. Muallif asosiy postga havola oladi va o‘sha yerda ovoz bera oladi.</p>
            {act.error && <Notice kind="error">{act.error.message}</Notice>}
            <div className="field">
              <label htmlFor="primary">Asosiy post</label>
              <select id="primary" name="primaryIssueId" className="select" required>
                {published.data?.items.map((p) => (
                  <option key={p.id} value={p.id}>{p.title} — {CATEGORY_LABEL[p.category]}</option>
                ))}
              </select>
            </div>
            <div className="row" style={{ justifyContent: 'flex-end' }}>
              <Button onClick={close}>Bekor qilish</Button>
              <Button type="submit" variant="primary" icon={Link2} loading={act.pending}>Bog‘lash</Button>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}
