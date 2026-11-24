'use client';
import { Check, EyeOff } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { api, compact, formValues, useAction, usePaged } from '@/lib/api';
import { fmtDateTime } from '@/lib/rules';
import type { Report } from '@/lib/types';
import { Async, Button, Empty, Field, LoadMore, Modal, Notice, PageHead } from '@/components/ui';

const TARGET: Record<Report['targetType'], string> = { POST: 'Post', COMMENT: 'Izoh', CHAT_MESSAGE: 'Chat xabari' };
const RESULT: Record<Report['status'], string> = { OPEN: 'Ko‘rib chiqilmoqda', ACTIONED: 'Kontent yashirildi', DISMISSED: 'Rad etildi' };

export default function ReportsPage() {
  const [tab, setTab] = useState<'OPEN' | ''>('OPEN');
  const list = usePaged<Report>(`/admin/reports${tab ? `?status=${tab}` : ''}`);
  const [dlg, setDlg] = useState<{ kind: 'hide' | 'dismiss'; r: Report } | null>(null);
  const act = useAction();
  const close = () => (setDlg(null), act.reset());

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!dlg) return;
    const json = compact(formValues(e.currentTarget));
    if (await act.run(() => api<unknown>(`/admin/reports/${dlg.r.id}/${dlg.kind}`, { json }).then(() => true))) {
      close();
      list.reload();
    }
  }

  return (
    <>
      <PageHead title="Shikoyatlar" sub="Post, izoh va chat xabarlari ustidan">
        <div className="tabs" role="group" aria-label="Filtr">
          <button type="button" aria-pressed={tab === 'OPEN'} onClick={() => setTab('OPEN')}>Ochiq</button>
          <button type="button" aria-pressed={tab === ''} onClick={() => setTab('')}>Barchasi</button>
        </div>
      </PageHead>
      <Async q={list} isEmpty={(d) => d.items.length === 0} empty={<Empty title={tab ? 'Ochiq shikoyat yo‘q' : 'Shikoyat yo‘q'} />}>
        {(d) => (
          <div className="stack" style={{ gap: 12 }}>
            {d.items.map((r) => (
              <article key={r.id} className="card stack">
                <div className="spread">
                  <span className="tag">{TARGET[r.targetType]}{r.contentHidden && ' · yashirilgan'}</span>
                  <span className="muted small">{r.reporterName} · {fmtDateTime(r.createdAt)}</span>
                </div>
                <blockquote className="pre" style={{ margin: 0, padding: '10px 14px', background: 'var(--surface-2)', borderRadius: 'var(--r-sm)' }}>
                  {r.contentPreview}
                </blockquote>
                <p className="small">Shikoyat sababi: <b>{r.reason}</b></p>
                {r.targetType === 'POST' && <Link href={`/issues/${r.targetId}`} className="small">Postni ochish</Link>}
                {r.status === 'OPEN' ? (
                  <div className="row">
                    <Button size="sm" variant="danger" icon={EyeOff} onClick={() => setDlg({ kind: 'hide', r })}>Kontentni yashirish</Button>
                    <Button size="sm" icon={Check} onClick={() => setDlg({ kind: 'dismiss', r })}>Qoidabuzarlik yo‘q</Button>
                  </div>
                ) : (
                  <p className="small"><b>{RESULT[r.status]}</b>{r.resolution && ` — ${r.resolution}`}</p>
                )}
              </article>
            ))}
          </div>
        )}
      </Async>
      <LoadMore q={list} />

      <Modal open={!!dlg} onClose={close} title={dlg?.kind === 'hide' ? 'Kontentni yashirish' : 'Shikoyatni yopish'}>
        <form className="stack" noValidate onSubmit={submit}>
          {act.error && !act.error.fields.reason && <Notice kind="error">{act.error.message}</Notice>}
          {dlg?.kind === 'hide' && <p>Kontent va uning media fayllari aholiga ko‘rinmaydi. Chat xabari lentadan chiqadi. Amal jurnalga yoziladi.</p>}
          <Field label={dlg?.kind === 'hide' ? 'Sabab' : 'Izoh (ixtiyoriy)'} name="reason" textarea error={act.error?.fields.reason} required={dlg?.kind === 'hide'} />
          <div className="row" style={{ justifyContent: 'flex-end' }}>
            <Button onClick={close}>Bekor qilish</Button>
            <Button type="submit" variant={dlg?.kind === 'hide' ? 'danger' : 'primary'} loading={act.pending}>{dlg?.kind === 'hide' ? 'Yashirish' : 'Yopish'}</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
