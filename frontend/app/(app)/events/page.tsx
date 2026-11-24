'use client';
import { CalendarPlus, CircleSlash, ClipboardCheck, Megaphone, Pencil, Users } from 'lucide-react';
import { useState } from 'react';
import { api, formValues, useAction, usePaged } from '@/lib/api';
import { fmtDateTime } from '@/lib/rules';
import type { EventItem } from '@/lib/types';
import { PhotoUpload } from '@/components/issue';
import { Async, Button, Empty, Field, LoadMore, Modal, Notice, PageHead } from '@/components/ui';

const STATUS: Record<EventItem['status'], string> = { DRAFT: 'Qoralama', PUBLISHED: 'Nashr qilingan', CANCELLED: 'Bekor qilingan', COMPLETED: 'Yakunlangan' };
type Dlg = { kind: 'edit'; ev?: EventItem } | { kind: 'cancel' | 'complete'; ev: EventItem } | null;

// datetime-local qiymati Toshkent vaqtida (UTC+5, DST yo'q)
const toLocal = (iso?: string) => (iso ? new Date(new Date(iso).getTime() + 5 * 3_600_000).toISOString().slice(0, 16) : '');
const fromLocal = (v: string) => (v ? `${v}:00+05:00` : '');

export default function EventsPage() {
  const list = usePaged<EventItem>('/admin/events');
  const [dlg, setDlg] = useState<Dlg>(null);
  const [mediaIds, setMediaIds] = useState<string[]>([]);
  const act = useAction();
  const close = () => (setDlg(null), act.reset(), setMediaIds([]));
  const fe = act.error?.fields ?? {};
  const done = () => (close(), list.reload());

  async function save(e: React.FormEvent<HTMLFormElement>, ev: EventItem | undefined, publish: boolean) {
    e.preventDefault();
    const v = formValues(e.currentTarget);
    const json = { ...v, startsAt: fromLocal(v.startsAt ?? '') };
    const ok = await act.run(async () => {
      const saved = ev ? await api<EventItem>(`/admin/events/${ev.id}`, { method: 'PATCH', json }) : await api<EventItem>('/admin/events', { json });
      if (publish && saved.status === 'DRAFT') await api(`/admin/events/${saved.id}/publish`, { method: 'POST' });
      return true;
    });
    if (ok) done();
  }
  async function post(path: string, json?: object) {
    if (await act.run(() => api<unknown>(path, { method: 'POST', json }).then(() => true))) done();
  }

  const started = (ev: EventItem) => new Date(ev.startsAt) <= new Date();

  return (
    <>
      <PageHead title="Tadbirlar" sub="Hashar, daraxt ekish, yig‘ilish va bayramlar">
        <Button variant="primary" icon={CalendarPlus} onClick={() => setDlg({ kind: 'edit' })}>Tadbir yaratish</Button>
      </PageHead>
      {act.error && !dlg && <Notice kind="error">{act.error.message}</Notice>}
      <Async q={list} isEmpty={(d) => d.items.length === 0} empty={<Empty title="Hali tadbir yo‘q" />}>
        {(d) => (
          <div className="stack" style={{ gap: 12 }}>
            {d.items.map((ev) => (
              <article key={ev.id} className="card stack" aria-labelledby={`ev-${ev.id}`}>
                <div className="spread">
                  <h2 id={`ev-${ev.id}`}>{ev.title}</h2>
                  <span className="tag">{STATUS[ev.status]}</span>
                </div>
                <p className="muted">{fmtDateTime(ev.startsAt)} · {ev.location} · {ev.organizer}</p>
                <p className="pre">{ev.description}</p>
                <p className="row"><Users size={18} aria-hidden /> <b>{ev.rsvpCount}</b> kishi «Qatnashaman» degan</p>
                {ev.resultText && <Notice kind="ok">Natija: {ev.resultText}</Notice>}
                {(ev.status === 'DRAFT' || ev.status === 'PUBLISHED') && (
                  <div className="row">
                    {ev.status === 'DRAFT' && <Button size="sm" variant="primary" icon={Megaphone} loading={act.pending} onClick={() => post(`/admin/events/${ev.id}/publish`)}>Nashr qilish</Button>}
                    <Button size="sm" icon={Pencil} onClick={() => setDlg({ kind: 'edit', ev })}>Tahrirlash</Button>
                    {ev.status === 'PUBLISHED' && started(ev) && <Button size="sm" icon={ClipboardCheck} onClick={() => setDlg({ kind: 'complete', ev })}>Natija qo‘shish</Button>}
                    <Button size="sm" variant="danger" icon={CircleSlash} onClick={() => setDlg({ kind: 'cancel', ev })}>Bekor qilish</Button>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </Async>
      <LoadMore q={list} />

      <Modal open={dlg?.kind === 'edit'} onClose={close} title={dlg?.kind === 'edit' && dlg.ev ? 'Tadbirni tahrirlash' : 'Yangi tadbir'}>
        {dlg?.kind === 'edit' && (
          <EventForm ev={dlg.ev} fe={fe} error={act.error && !Object.keys(fe).length ? act.error.message : undefined} pending={act.pending} onCancel={close} onSave={(e, p) => save(e, dlg.ev, p)} />
        )}
      </Modal>

      <Modal open={dlg?.kind === 'cancel'} onClose={close} title="Tadbirni bekor qilish">
        {dlg?.kind === 'cancel' && (
          <form className="stack" noValidate onSubmit={(e) => (e.preventDefault(), post(`/admin/events/${dlg.ev.id}/cancel`, formValues(e.currentTarget)))}>
            <p><b>{dlg.ev.rsvpCount}</b> ta yozilgan qatnashchiga xabar boradi.</p>
            {act.error && !fe.reason && <Notice kind="error">{act.error.message}</Notice>}
            <Field label="Sabab" name="reason" textarea error={fe.reason} required />
            <div className="row" style={{ justifyContent: 'flex-end' }}>
              <Button onClick={close}>Ortga</Button>
              <Button type="submit" variant="danger" loading={act.pending}>Bekor qilish</Button>
            </div>
          </form>
        )}
      </Modal>

      <Modal open={dlg?.kind === 'complete'} onClose={close} title="Tadbir natijasi">
        {dlg?.kind === 'complete' && (
          <form className="stack" noValidate onSubmit={(e) => (e.preventDefault(), post(`/admin/events/${dlg.ev.id}/complete`, { ...formValues(e.currentTarget), mediaIds }))}>
            {act.error && !Object.keys(fe).length && <Notice kind="error">{act.error.message}</Notice>}
            <Field label="Natija" name="resultText" textarea placeholder="Masalan: 40 ta daraxt ekildi, 25 kishi qatnashdi" error={fe.resultText} required />
            <PhotoUpload onChange={setMediaIds} />
            <div className="row" style={{ justifyContent: 'flex-end' }}>
              <Button onClick={close}>Bekor qilish</Button>
              <Button type="submit" variant="primary" loading={act.pending}>Saqlash</Button>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}

function EventForm({ ev, fe, error, pending, onCancel, onSave }: { ev?: EventItem; fe: Record<string, string>; error?: string; pending: boolean; onCancel: () => void; onSave: (e: React.FormEvent<HTMLFormElement>, publish: boolean) => void }) {
  const [publish, setPublish] = useState(true);
  function submit(e: React.FormEvent<HTMLFormElement>) {
    const p = (e.nativeEvent as SubmitEvent).submitter?.dataset.draft !== '1';
    setPublish(p);
    onSave(e, p);
  }
  return (
    <form className="stack" noValidate onSubmit={submit}>
      {error && <Notice kind="error">{error}</Notice>}
      {ev?.status === 'PUBLISHED' && <Notice kind="info">Vaqt yoki joy o‘zgarsa, yozilgan qatnashchilarga xabar boradi.</Notice>}
      <Field label="Nomi" name="title" defaultValue={ev?.title} error={fe.title} required />
      <Field label="Tavsif" name="description" textarea defaultValue={ev?.description} error={fe.description} required />
      <Field label="Sana va vaqt (Toshkent)" name="startsAt" type="datetime-local" defaultValue={toLocal(ev?.startsAt)} error={fe.startsAt} required />
      <Field label="Joy" name="location" defaultValue={ev?.location} error={fe.location} required />
      <Field label="Tashkilotchi" name="organizer" defaultValue={ev?.organizer} error={fe.organizer} required />
      <div className="row" style={{ justifyContent: 'flex-end' }}>
        <Button onClick={onCancel}>Bekor qilish</Button>
        {ev?.status !== 'PUBLISHED' && <Button type="submit" data-draft="1" loading={pending && !publish}>Qoralama saqlash</Button>}
        <Button type="submit" variant="primary" loading={pending && publish}>{ev?.status === 'PUBLISHED' ? 'Saqlash' : 'Nashr qilish'}</Button>
      </div>
    </form>
  );
}
