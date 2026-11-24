'use client';
import { Ban, Copy, KeyRound, Search, Unlock, UserPlus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { api, formValues, useAction, usePaged } from '@/lib/api';
import { fmtDate, fmtDateTime } from '@/lib/rules';
import type { TempPassword, UserRow } from '@/lib/types';
import { Async, LoadMore, Button, Empty, Field, Modal, Notice, PageHead } from '@/components/ui';

type Dlg = { kind: 'create' } | { kind: 'block'; user: UserRow } | { kind: 'reset'; user: UserRow } | { kind: 'secret'; data: TempPassword } | null;

export default function ResidentsPage() {
  const [q, setQ] = useState('');
  const [query, setQuery] = useState(''); // har harfga so'rov yubormaslik uchun 300 ms kechikish
  useEffect(() => {
    const t = setTimeout(() => setQuery(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);
  const [status, setStatus] = useState('');
  const list = usePaged<UserRow>(`/admin/users?q=${encodeURIComponent(query)}&status=${status}`);
  const [dlg, setDlg] = useState<Dlg>(null);
  const act = useAction();
  const close = () => (setDlg(null), act.reset());
  const done = () => (close(), list.reload());

  async function create(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const r = await act.run(() => api<TempPassword>('/admin/users', { body: formValues(e.currentTarget) }));
    if (r) { list.reload(); setDlg({ kind: 'secret', data: r }); }
  }
  async function reset(user: UserRow) {
    const r = await act.run(() => api<TempPassword>(`/admin/users/${user.id}/reset-password`, { method: 'POST' }));
    if (r) { list.reload(); setDlg({ kind: 'secret', data: r }); }
  }
  async function block(e: React.FormEvent<HTMLFormElement>, user: UserRow) {
    e.preventDefault();
    if (await act.run(() => api(`/admin/users/${user.id}/block`, { body: formValues(e.currentTarget) }))) done();
  }
  async function unblock(user: UserRow) {
    if (await act.run(() => api(`/admin/users/${user.id}/unblock`, { method: 'POST' }))) list.reload();
  }

  return (
    <>
      <PageHead title="Aholi" sub="Akkauntni faqat shaxsni tekshirgandan keyin oching">
        <Button variant="primary" icon={UserPlus} onClick={() => setDlg({ kind: 'create' })}>
          Akkaunt ochish
        </Button>
      </PageHead>

      <div className="row" style={{ marginBottom: 16 }}>
        <div className="field" style={{ flex: '1 1 260px' }}>
          <label htmlFor="q" className="sr-only">Qidirish</label>
          <div style={{ position: 'relative' }}>
            <Search size={18} aria-hidden style={{ position: 'absolute', left: 12, top: 13, color: 'var(--muted)' }} />
            <input id="q" className="input" style={{ paddingLeft: 38 }} placeholder="Ism yoki login" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        </div>
        <label htmlFor="st" className="sr-only">Holat</label>
        <select id="st" className="select" style={{ width: 180 }} value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Barcha holatlar</option>
          <option value="ACTIVE">Faol</option>
          <option value="BLOCKED">Bloklangan</option>
        </select>
      </div>
      {act.error && !dlg && <Notice kind="error">{act.error.message}</Notice>}

      <Async q={list} isEmpty={(d) => d.items.length === 0} empty={<Empty title="Hech kim topilmadi" />}>
        {(d) => (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Ism</th>
                  <th>Holat</th>
                  <th>Oxirgi kirish</th>
                  <th><span className="sr-only">Amallar</span></th>
                </tr>
              </thead>
              <tbody>
                {d.items.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <b>{u.displayName}</b>
                      <span className="sub">{u.login}{u.role === 'ADMIN' && ' · admin'}</span>
                    </td>
                    <td>
                      {u.status === 'BLOCKED' ? (
                        <span className="badge" style={{ color: 'var(--danger)', background: 'var(--danger-bg)' }}><Ban aria-hidden />Bloklangan</span>
                      ) : u.mustChangePassword ? (
                        <span className="badge" style={{ color: 'var(--s-voting)', background: 'var(--s-voting-bg)' }}><KeyRound aria-hidden />Parol kutilmoqda</span>
                      ) : (
                        <span className="tag">Faol</span>
                      )}
                      {u.mustChangePassword && u.tempPasswordExpiresAt && <span className="sub">Vaqtinchalik parol {fmtDate(u.tempPasswordExpiresAt)} gacha</span>}
                    </td>
                    <td>{fmtDateTime(u.lastLoginAt)}</td>
                    <td>
                      {u.role === 'RESIDENT' && (
                        <div className="row" style={{ justifyContent: 'flex-end' }}>
                          <Button size="sm" icon={KeyRound} onClick={() => setDlg({ kind: 'reset', user: u })}>Parolni tiklash</Button>
                          {u.status === 'ACTIVE' ? (
                            <Button size="sm" variant="danger" icon={Ban} onClick={() => setDlg({ kind: 'block', user: u })}>Bloklash</Button>
                          ) : (
                            <Button size="sm" icon={Unlock} onClick={() => unblock(u)}>Blokdan chiqarish</Button>
                          )}
                        </div>
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

      <Modal open={dlg?.kind === 'create'} onClose={close} title="Yangi akkaunt">
        <form className="stack" onSubmit={create} noValidate>
          {act.error && !Object.keys(act.error.fields).length && <Notice kind="error">{act.error.message}</Notice>}
          <Field label="Ko‘rsatiladigan ism" name="displayName" hint="Qo‘shnilarga faqat shu ism ko‘rinadi" error={act.error?.fields.displayName} required autoFocus />
          <Field label="Login" name="login" hint="Lotin harf, raqam, . _ - (3–32 belgi)" error={act.error?.fields.login} required autoCapitalize="none" />
          <Field label="Telefon (ixtiyoriy)" name="phone" type="tel" hint="Faqat admin ko‘radi" />
          <Notice kind="info">Uy manzili va pasport ma’lumotini kiritmang.</Notice>
          <div className="row" style={{ justifyContent: 'flex-end' }}>
            <Button onClick={close}>Bekor qilish</Button>
            <Button type="submit" variant="primary" loading={act.pending}>Akkaunt ochish</Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={dlg?.kind === 'reset'}
        onClose={close}
        title="Parolni tiklash"
        footer={
          dlg?.kind === 'reset' && (
            <>
              <Button onClick={close}>Bekor qilish</Button>
              <Button variant="primary" loading={act.pending} onClick={() => reset(dlg.user)}>Yangi parol chiqarish</Button>
            </>
          )
        }
      >
        {dlg?.kind === 'reset' && <p><b>{dlg.user.displayName}</b> uchun yangi vaqtinchalik parol chiqariladi. Uning barcha faol sessiyalari yopiladi.</p>}
        {act.error && <Notice kind="error">{act.error.message}</Notice>}
      </Modal>

      <Modal open={dlg?.kind === 'block'} onClose={close} title="Akkauntni bloklash">
        {dlg?.kind === 'block' && (
          <form className="stack" onSubmit={(e) => block(e, dlg.user)} noValidate>
            <p><b>{dlg.user.displayName}</b> tizimdan chiqariladi va qayta kira olmaydi.</p>
            <Field label="Sabab" name="reason" textarea hint="Amallar jurnaliga yoziladi" error={act.error?.fields.reason} required autoFocus />
            <div className="row" style={{ justifyContent: 'flex-end' }}>
              <Button onClick={close}>Bekor qilish</Button>
              <Button type="submit" variant="danger" icon={Ban} loading={act.pending}>Bloklash</Button>
            </div>
          </form>
        )}
      </Modal>

      <Modal open={dlg?.kind === 'secret'} onClose={close} title="Vaqtinchalik parol" footer={<Button variant="primary" onClick={close}>Parolni berdim</Button>}>
        {dlg?.kind === 'secret' && <Secret data={dlg.data} />}
      </Modal>
    </>
  );
}

function Secret({ data }: { data: TempPassword }) {
  const [copied, setCopied] = useState(false);
  return (
    <>
      <Notice kind="warn">Parol faqat hozir ko‘rsatiladi. Uni foydalanuvchiga shaxsan bering.</Notice>
      <div className="stack" style={{ gap: 4 }}>
        <span className="muted small">Login</span>
        <b>{data.user.login}</b>
      </div>
      <div className="secret" aria-label="Vaqtinchalik parol">{data.temporaryPassword}</div>
      <div className="spread">
        <span className="muted small">{fmtDateTime(data.expiresAt)} gacha amal qiladi</span>
        <Button size="sm" icon={Copy} onClick={() => navigator.clipboard.writeText(data.temporaryPassword).then(() => setCopied(true))}>
          {copied ? 'Nusxalandi' : 'Nusxalash'}
        </Button>
      </div>
    </>
  );
}
