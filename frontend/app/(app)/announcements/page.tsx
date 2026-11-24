'use client';
import { BellRing, Megaphone, Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { api, formValues, useAction, usePaged } from '@/lib/api';
import { fmtDateTime } from '@/lib/rules';
import type { Announcement } from '@/lib/types';
import { Async, Button, Empty, Field, LoadMore, Modal, Notice, PageHead } from '@/components/ui';

type Dlg = { kind: 'edit'; a?: Announcement } | { kind: 'publish' | 'delete'; a: Announcement } | null;

export default function AnnouncementsPage() {
  const list = usePaged<Announcement>('/announcements');
  const [dlg, setDlg] = useState<Dlg>(null);
  const act = useAction();
  const close = () => (setDlg(null), act.reset());
  const fe = act.error?.fields ?? {};

  async function call(path: string, method: string, json?: object) {
    if (await act.run(() => api<unknown>(path, { method, json }).then(() => true))) {
      close();
      list.reload();
    }
  }
  function save(e: React.FormEvent<HTMLFormElement>, a?: Announcement) {
    e.preventDefault();
    const v = formValues(e.currentTarget);
    const json = { title: v.title, body: v.body, isImportant: v.isImportant === 'on' };
    return a ? call(`/admin/announcements/${a.id}`, 'PATCH', json) : call('/admin/announcements', 'POST', json);
  }

  return (
    <>
      <PageHead title="E’lonlar" sub="Yangilik, tabrik yoki muhim xabar. Avval qoralama, keyin nashr.">
        <Button variant="primary" icon={Plus} onClick={() => setDlg({ kind: 'edit' })}>E’lon yozish</Button>
      </PageHead>
      <Async q={list} isEmpty={(d) => d.items.length === 0} empty={<Empty title="Hali e’lon yo‘q" />}>
        {(d) => (
          <div className="stack" style={{ gap: 12 }}>
            {d.items.map((a) => (
              <article key={a.id} className="card stack" aria-labelledby={`an-${a.id}`}>
                <div className="spread">
                  <h2 id={`an-${a.id}`}>{a.title}</h2>
                  <div className="row">
                    {a.isImportant && <span className="badge" style={{ color: 'var(--danger)', background: 'var(--danger-bg)' }}><BellRing aria-hidden />Muhim</span>}
                    <span className="tag">{a.status === 'DRAFT' ? 'Qoralama' : `Nashr: ${fmtDateTime(a.publishedAt)}`}</span>
                  </div>
                </div>
                <p className="pre">{a.body}</p>
                {a.status === 'DRAFT' && (
                  <div className="row">
                    <Button size="sm" variant="primary" icon={Megaphone} onClick={() => setDlg({ kind: 'publish', a })}>Nashr qilish</Button>
                    <Button size="sm" icon={Pencil} onClick={() => setDlg({ kind: 'edit', a })}>Tahrirlash</Button>
                    <Button size="sm" variant="danger" icon={Trash2} onClick={() => setDlg({ kind: 'delete', a })}>O‘chirish</Button>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </Async>
      <LoadMore q={list} />

      <Modal open={dlg?.kind === 'edit'} onClose={close} title={dlg?.kind === 'edit' && dlg.a ? 'Qoralamani tahrirlash' : 'Yangi e’lon'}>
        {dlg?.kind === 'edit' && (
          <form className="stack" noValidate onSubmit={(e) => save(e, dlg.a)}>
            {act.error && !Object.keys(fe).length && <Notice kind="error">{act.error.message}</Notice>}
            <Field label="Sarlavha" name="title" defaultValue={dlg.a?.title} error={fe.title} required />
            <Field label="Matn" name="body" textarea defaultValue={dlg.a?.body} error={fe.body} required rows={6} />
            <label className="check">
              <input type="checkbox" name="isImportant" defaultChecked={dlg.a?.isImportant} />
              <span>Muhim — nashrda barcha aholiga push-bildirishnoma yuboriladi</span>
            </label>
            <div className="row" style={{ justifyContent: 'flex-end' }}>
              <Button onClick={close}>Bekor qilish</Button>
              <Button type="submit" variant="primary" loading={act.pending}>Qoralamani saqlash</Button>
            </div>
          </form>
        )}
      </Modal>

      <Modal
        open={dlg?.kind === 'publish' || dlg?.kind === 'delete'}
        onClose={close}
        title={dlg?.kind === 'delete' ? 'Qoralamani o‘chirish' : 'E’lonni nashr qilish'}
        footer={
          (dlg?.kind === 'publish' || dlg?.kind === 'delete') && (
            <>
              <Button onClick={close}>Bekor qilish</Button>
              {dlg.kind === 'publish' ? (
                <Button variant="primary" icon={Megaphone} loading={act.pending} onClick={() => call(`/admin/announcements/${dlg.a.id}/publish`, 'POST')}>Nashr qilish</Button>
              ) : (
                <Button variant="danger" icon={Trash2} loading={act.pending} onClick={() => call(`/admin/announcements/${dlg.a.id}`, 'DELETE')}>O‘chirish</Button>
              )}
            </>
          )
        }
      >
        {dlg?.kind === 'publish' && <p>«{dlg.a.title}» mahallaning barcha a’zolariga ko‘rinadi.{dlg.a.isImportant && ' Muhim deb belgilangani uchun push yuboriladi.'} Nashrdan keyin tahrirlab bo‘lmaydi.</p>}
        {dlg?.kind === 'delete' && <p>«{dlg.a.title}» qoralamasi o‘chiriladi. Buni qaytarib bo‘lmaydi.</p>}
        {act.error && <Notice kind="error">{act.error.message}</Notice>}
      </Modal>
    </>
  );
}
