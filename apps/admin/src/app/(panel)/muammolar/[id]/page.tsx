'use client';
import { ArrowLeft, CheckCircle2, CornerDownRight, Send, Wrench } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { api, formValues, useAction, useApi } from '@/lib/api';
import { adminActions, CATEGORY_LABEL, fmtDate, fmtDateTime, isOverdue, statusLabel } from '@/lib/rules';
import type { IssueDetail, IssueStatus } from '@/lib/types';
import { MediaGrid, PhotoUpload } from '@/components/issue';
import { Async, Button, Field, Modal, Notice, PageHead, StatusBadge } from '@/components/ui';

type Target = 'IN_PROGRESS' | 'REFERRED' | 'RESOLVED';
const ACTION_LABEL: Record<Target, string> = { IN_PROGRESS: 'Jarayonga o‘tkazish', REFERRED: 'Tashkilotga yuborish', RESOLVED: 'Hal qilindi deb belgilash' };
const today = () => new Date().toISOString().slice(0, 10);

export default function IssueDetailPage() {
  const { id } = useParams<{ id: string }>();
  const q = useApi<IssueDetail>(`/issues/${id}`);
  const [dlg, setDlg] = useState<Target | null>(null);
  const act = useAction();
  const close = () => (setDlg(null), act.reset());

  async function post(path: string, body?: object) {
    const r = await act.run(() => api<IssueDetail>(`/admin/issues/${id}/${path}`, { method: 'POST', body }));
    if (r) { q.setData(r); close(); }
  }

  return (
    <>
      <Link href="/muammolar" className="row small" style={{ marginBottom: 12, width: 'fit-content' }}>
        <ArrowLeft size={16} aria-hidden /> Muammolar
      </Link>
      <Async q={q} rows={4}>
        {(i) => {
          const actions = adminActions(i.status, i.inCurrentRound);
          return (
            <>
              <PageHead title={i.title} sub={`${CATEGORY_LABEL[i.category]} · ${i.locationText}`}>
                <StatusBadge status={i.status} inCurrentRound={i.inCurrentRound} />
              </PageHead>
              {act.error && !dlg && <Notice kind="error">{act.error.message}</Notice>}
              {i.hidden && <Notice kind="warn">Bu post shikoyat bo‘yicha yashirilgan. Aholiga ko‘rinmaydi.</Notice>}
              {i.status === 'REJECTED' && i.rejectionReason && <Notice kind="info">Rad etish sababi: {i.rejectionReason}</Notice>}

              <div className="split">
                <div className="stack" style={{ gap: 16 }}>
                  <section className="card stack">
                    <p className="pre">{i.description}</p>
                    <MediaGrid media={i.media} />
                    <p className="muted small">{i.author.displayName} · {fmtDateTime(i.createdAt)} · {i.commentCount} izoh</p>
                  </section>
                  <section className="card stack" aria-labelledby="hist">
                    <h2 id="hist">Holat tarixi</h2>
                    <ol className="timeline">
                      {[...i.updates].reverse().map((u) => (
                        <li key={u.id}>
                          <span className="dot" aria-hidden style={u.kind === 'AUTHOR_DISPUTED' ? { borderColor: 'var(--danger)' } : undefined} />
                          <div className="spread">
                            <b>{u.kind === 'AUTHOR_DISPUTED' ? 'Muallif: muammo davom etmoqda' : u.kind === 'AUTHOR_CONFIRMED' ? 'Muallif natijani tasdiqladi' : statusLabel(u.status as IssueStatus)}</b>
                            <span className="muted small">{fmtDateTime(u.at)}</span>
                          </div>
                          <div className="small muted">{u.actor.displayName}</div>
                          {u.note && <p className="pre" style={{ marginTop: 4 }}>{u.note}</p>}
                          {u.reason && <p className="pre small" style={{ marginTop: 4 }}><b>Sabab:</b> {u.reason}</p>}
                          {u.media.length > 0 && <div style={{ marginTop: 8 }}><MediaGrid media={u.media} /></div>}
                        </li>
                      ))}
                    </ol>
                  </section>
                </div>

                <aside className="stack" style={{ gap: 16 }}>
                  <section className="card stack" aria-labelledby="work">
                    <h2 id="work">Ish yuritish</h2>
                    <dl className="stack" style={{ gap: 8, margin: 0 }}>
                      <Row k="Ovozlar">{i.inCurrentRound ? `${i.voteCount} (joriy davr)` : i.voteCount}</Row>
                      <Row k="Mas’ul">{i.responsible}</Row>
                      <Row k="Keyingi qadam">{i.nextStep}</Row>
                      <Row k="Muddat">
                        {i.dueDate && <span style={isOverdue(i.dueDate, i.status) ? { color: 'var(--danger)', fontWeight: 600 } : undefined}>{fmtDate(i.dueDate)}{isOverdue(i.dueDate, i.status) && ' · muddat o‘tgan'}</span>}
                      </Row>
                      <Row k="Tashkilot">{i.organization}</Row>
                      <Row k="Yuborilgan">{i.referredAt && fmtDate(i.referredAt)}</Row>
                      <Row k="Keyingi tekshiruv">{i.followUpAt && fmtDate(i.followUpAt)}</Row>
                      <Row k="Bajarilgan ish">{i.resolutionText}</Row>
                    </dl>
                    {actions.length > 0 && (
                      <div className="stack" style={{ gap: 8 }}>
                        {actions.includes('IN_PROGRESS') && <Button variant={i.status === 'SELECTED' ? 'primary' : 'secondary'} icon={Wrench} onClick={() => setDlg('IN_PROGRESS')}>{i.status === 'IN_PROGRESS' ? 'Muddat yoki qadamni yangilash' : i.status === 'RESOLVED' ? 'Qayta jarayonga qaytarish' : ACTION_LABEL.IN_PROGRESS}</Button>}
                        {actions.includes('REFERRED') && <Button icon={Send} onClick={() => setDlg('REFERRED')}>{ACTION_LABEL.REFERRED}</Button>}
                        {actions.includes('RESOLVED') && <Button variant="primary" icon={CheckCircle2} onClick={() => setDlg('RESOLVED')}>{ACTION_LABEL.RESOLVED}</Button>}
                        {actions.includes('carryOver') && (
                          <Button icon={CornerDownRight} loading={act.pending} onClick={() => post('carry-over')}>Joriy ovoz davriga kiritish</Button>
                        )}
                      </div>
                    )}
                    {actions.includes('carryOver') && <p className="small muted">Post yangi davrda nol ovozdan boshlaydi.</p>}
                    {(i.status === 'PENDING_REVIEW') && <Link href="/moderatsiya">Moderatsiya navbatida ko‘rib chiqish</Link>}
                  </section>
                </aside>
              </div>

              <Modal open={!!dlg} onClose={close} title={dlg ? ACTION_LABEL[dlg] : ''}>
                {dlg && <StatusForm target={dlg} issue={i} pending={act.pending} error={act.error} onCancel={close} onSubmit={(b) => post('status', b)} />}
              </Modal>
            </>
          );
        }}
      </Async>
    </>
  );
}

function Row({ k, children }: { k: string; children: React.ReactNode }) {
  if (!children) return null;
  return (
    <div>
      <dt className="small muted">{k}</dt>
      <dd style={{ margin: 0 }} className="pre">{children}</dd>
    </div>
  );
}

function StatusForm({
  target,
  issue,
  pending,
  error,
  onCancel,
  onSubmit,
}: {
  target: Target;
  issue: IssueDetail;
  pending: boolean;
  error: ReturnType<typeof useAction>['error'];
  onCancel: () => void;
  onSubmit: (body: object) => void;
}) {
  const [mediaIds, setMediaIds] = useState<string[]>([]);
  const fe = error?.fields ?? {};
  // Muddat o'zgarsa yoki hal qilingan masala qaytarilsa, sabab tarixga yoziladi
  const reasonNeeded = issue.status === 'RESOLVED' || issue.status === 'IN_PROGRESS' || issue.status === 'REFERRED';

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const v = formValues(e.currentTarget);
    onSubmit(target === 'RESOLVED' ? { status: target, resolutionText: v.resolutionText, mediaIds } : { status: target, ...v });
  }

  return (
    <form className="stack" onSubmit={submit} noValidate>
      {error && !Object.keys(fe).length && <Notice kind="error">{error.message}</Notice>}
      {target === 'IN_PROGRESS' && (
        <>
          <Field label="Mas’ul shaxs yoki bo‘lim" name="responsible" defaultValue={issue.responsible ?? ''} error={fe.responsible} required autoFocus />
          <Field label="Keyingi qadam" name="nextStep" defaultValue={issue.nextStep ?? ''} error={fe.nextStep} required />
          <Field label="Kutilayotgan muddat" name="dueDate" type="date" min={today()} defaultValue={issue.dueDate?.slice(0, 10) ?? ''} error={fe.dueDate} required />
        </>
      )}
      {target === 'REFERRED' && (
        <>
          <Field label="Tashkilot nomi" name="organization" defaultValue={issue.organization ?? ''} error={fe.organization} required autoFocus />
          <Field label="Yuborilgan sana" name="referredAt" type="date" defaultValue={today()} error={fe.referredAt} required />
          <Field label="Keyingi tekshiruv sanasi" name="followUpAt" type="date" min={today()} error={fe.followUpAt} required />
        </>
      )}
      {target !== 'RESOLVED' && reasonNeeded && (
        <Field label={issue.status === 'RESOLVED' ? 'Qaytarish sababi' : 'O‘zgartirish sababi'} name="reason" textarea hint="Holat tarixida aholiga ko‘rinadi" error={fe.reason} required={issue.status === 'RESOLVED'} />
      )}
      {target === 'RESOLVED' && (
        <>
          <Field label="Bajarilgan ish" name="resolutionText" textarea error={fe.resolutionText} placeholder="Masalan: ustunga yangi LED chiroq o‘rnatildi" required autoFocus />
          <PhotoUpload onChange={setMediaIds} />
          <p className="small muted">Kuzatuvchilarga bildirishnoma boradi. Muallif natijani tasdiqlashi yoki e’tiroz bildirishi mumkin.</p>
        </>
      )}
      <div className="row" style={{ justifyContent: 'flex-end' }}>
        <Button onClick={onCancel}>Bekor qilish</Button>
        <Button type="submit" variant="primary" loading={pending}>Saqlash</Button>
      </div>
    </form>
  );
}
