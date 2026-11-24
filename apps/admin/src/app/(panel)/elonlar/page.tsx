'use client';
import { BellRing, Megaphone, Pencil, Plus } from 'lucide-react';
import { useState } from 'react';
import { api, formValues, useAction, usePaged } from '@/lib/api';
import { fmtDateTime } from '@/lib/rules';
import type { Announcement } from '@/lib/types';
import { Async, LoadMore, Button, Empty, Field, Modal, Notice, PageHead } from '@/components/ui';

export default function AnnouncementsPage() {
  const list = usePaged<Announcement>('/admin/announcements');
  const [edit, setEdit] = useState<{ a?: Announcement } | null>(null);
  const [confirm, setConfirm] = useState<Announcement | null>(null);
  const act = useAction();
  const close = () => (setEdit(null), setConfirm(null), act.reset());
  const fe = act.error?.fields ?? {};

  async function save(e: React.FormEvent<HTMLFormElement>, a?: Announcement) {
    e.preventDefault();
    const v = formValues(e.currentTarget);
    const body = { title: v.title, body: v.body, important: v.important === 'on' };
    const r = await act.run(() => (a ? api(`/admin/announcements/${a.id}`, { method: 'PATCH', body }) : api('/admin/announcements', { body })));
    if (r) { close(); list.reload(); }
  }
  async function publish(a: Announcement) {
    if (await act.run(() => api(`/admin/announcements/${a.id}/publish`, { method: 'POST' }))) { close(); list.reload(); }
  }

  return (
    <>
      <PageHead title="E’lonlar" sub="Yangilik, tabrik yoki muhim xabar. Avval qoralama, keyin nashr.">
        <Button variant="primary" icon={Plus} onClick={() => setEdit({})}>E’lon yozish</Button>
      </PageHead>
      <Async q={list} isEmpty={(d) => d.items.length === 0} empty={<Empty title="Hali e’lon yo‘q" />}>
        {(d) => (
          <div className="stack" style={{ gap: 12 }}>
            {d.items.map((a) => (
              <article key={a.id} className="card stack" aria-labelledby={`an-${a.id}`}>
                <div className="spread">
                  <h2 id={`an-${a.id}`}>{a.title}</h2>
                  <div className="row">
                    {a.important && <span className="badge" style={{ color: 'var(--danger)', background: 'var(--danger-bg)' }}><BellRing aria-hidden />Muhim</span>}
                    <span className="tag">{a.status === 'DRAFT' ? 'Qoralama' : `Nashr: ${fmtDateTime(a.publishedAt)}`}</span>
                  </div>
                </div>
                <p className="pre">{a.body}</p>
                {a.status === 'DRAFT' && (
                  <div className="row">
                    <Button size="sm" icon={Pencil} onClick={() => setEdit({ a })}>Tahrirlash</Button>
                    <Button size="sm" variant="primary" icon={Megaphone} onClick={() => setConfirm(a)}>Nashr qilish</Button>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </Async>
      <LoadMore q={list} />

      <Modal open={!!edit} onClose={close} title={edit?.a ? 'Qoralamani tahrirlash' : 'Yangi e’lon'}>
        {edit && (
          <form className="stack" noValidate onSubmit={(e) => save(e, edit.a)}>
            {act.error && !Object.keys(fe).length && <Notice kind="error">{act.error.message}</Notice>}
            <Field label="Sarlavha" name="title" defaultValue={edit.a?.title} error={fe.title} required autoFocus />
            <Field label="Matn" name="body" textarea defaultValue={edit.a?.body} error={fe.body} required rows={6} />
            <label className="check">
              <input type="checkbox" name="important" defaultChecked={edit.a?.important} />
              <span>Muhim — barcha aholiga push-bildirishnoma yuboriladi</span>
            </label>
            <div className="row" style={{ justifyContent: 'flex-end' }}>
              <Button onClick={close}>Bekor qilish</Button>
              <Button type="submit" variant="primary" loading={act.pending}>Qoralamani saqlash</Button>
            </div>
          </form>
        )}
      </Modal>

      <Modal
        open={!!confirm}
        onClose={close}
        title="E’lonni nashr qilish"
        footer={confirm && (
          <>
            <Button onClick={close}>Bekor qilish</Button>
            <Button variant="primary" icon={Megaphone} loading={act.pending} onClick={() => publish(confirm)}>Nashr qilish</Button>
          </>
        )}
      >
        {confirm && <p>«{confirm.title}» mahallaning barcha a’zolariga ko‘rinadi.{confirm.important && ' Muhim deb belgilangani uchun push yuboriladi.'} Nashrdan keyin tahrirlab bo‘lmaydi.</p>}
        {act.error && <Notice kind="error">{act.error.message}</Notice>}
      </Modal>
    </>
  );
}
