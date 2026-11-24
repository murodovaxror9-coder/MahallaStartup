'use client';
import { ArrowLeft, CheckCircle2, CornerDownRight, Eye, EyeOff, Pencil, Send, Wrench } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { api, compact, formValues, useAction, useApi } from '@/lib/api';
import { adminActions, fmtDate, fmtDateTime, isOverdue, STATUS_LABEL, todayTashkent } from '@/lib/rules';
import type { HistoryItem, IssueDetail } from '@/lib/types';
import { MediaGrid, PhotoUpload } from '@/components/issue';
import { Async, Button, Field, Modal, Notice, PageHead, StatusBadge } from '@/components/ui';

type Dlg = 'IN_PROGRESS' | 'REFERRED' | 'RESOLVED' | 'work' | 'hide';
const TITLE: Record<Dlg, string> = {
  IN_PROGRESS: 'Jarayonga o‘tkazish',
  REFERRED: 'Tashkilotga yuborish',
  RESOLVED: 'Hal qilindi deb belgilash',
  work: 'Mas’ul, qadam yoki muddatni o‘zgartirish',
  hide: 'Postni yashirish',
};

export default function IssueDetailPage() {
  const { id } = useParams<{ id: string }>();
  const q = useApi<IssueDetail>(`/admin/issues/${id}`);
  const current = useApi<{ round: { id: string } | null }>('/rounds/current');
  const [dlg, setDlg] = useState<Dlg | null>(null);
  const act = useAction();
  const close = () => (setDlg(null), act.reset());

  // Har amaldan keyin tafsilotni qayta o'qiymiz: tarix va imzoli media havolalari yangilanadi
  async function send(path: string, method: string, json?: object) {
    const ok = await act.run(() => api<unknown>(`/admin/${path}`, { method, json }).then(() => true));
    if (ok) {
      close();
      q.reload();
    }
  }

  return (
    <>
      <Link href="/issues" className="row small" style={{ marginBottom: 12, width: 'fit-content' }}>
        <ArrowLeft size={16} aria-hidden /> Muammolar
      </Link>
      <Async q={q} rows={4}>
        {(i) => {
          const inCurrentRound = !!i.roundId && i.roundId === current.data?.round?.id;
          const actions = adminActions(i.status, inCurrentRound);
          const overdue = isOverdue(i.dueDate, i.status);
          return (
            <>
              <PageHead title={i.title} sub={`${i.categoryLabel} · ${i.locationText}`}>
                <StatusBadge status={i.status} label={i.statusLabel} />
              </PageHead>
              {act.error && !dlg && <Notice kind="error">{act.error.message}</Notice>}
              {i.hidden && <Notice kind="warn">Post yashirilgan{i.hiddenReason && `: ${i.hiddenReason}`}. Aholiga va uning media fayllari ko‘rinmaydi.</Notice>}
              {i.rejectedReason && i.status === 'REJECTED' && <Notice kind="info">Rad etish sababi: {i.rejectedReason}</Notice>}
              {i.duplicateOf && (
                <Notice kind="info">
                  Asosiy postga bog‘langan: <Link href={`/issues/${i.duplicateOf.id}`}>{i.duplicateOf.title}</Link>
                </Notice>
              )}

              <div className="split">
                <div className="stack" style={{ gap: 16 }}>
                  <section className="card stack">
                    <p className="pre">{i.description}</p>
                    <MediaGrid media={i.media} />
                    <p className="muted small">{i.author.displayName} · {fmtDateTime(i.createdAt)} · {i.commentCount} izoh</p>
                  </section>
                  <section className="card stack" aria-labelledby="hist">
                    <h2 id="hist">Holat tarixi</h2>
                    {i.history.length === 0 ? (
                      <p className="muted">Hali o‘zgarish yo‘q.</p>
                    ) : (
                      <ol className="timeline">
                        {[...i.history].reverse().map((h) => (
                          <li key={h.id}>
                            <span className="dot" aria-hidden style={disputed(h) ? { borderColor: 'var(--danger)' } : undefined} />
                            <div className="spread">
                              <b>{historyTitle(h)}</b>
                              <span className="muted small">{fmtDateTime(h.createdAt)}</span>
                            </div>
                            {h.actorName && <div className="small muted">{h.actorName}</div>}
                            {h.reason && <p className="pre" style={{ marginTop: 4 }}>{h.reason}</p>}
                            {h.media.length > 0 && <div style={{ marginTop: 8 }}><MediaGrid media={h.media} /></div>}
                          </li>
                        ))}
                      </ol>
                    )}
                  </section>
                </div>

                <aside className="stack" style={{ gap: 16 }}>
                  <section className="card stack" aria-labelledby="work">
                    <h2 id="work">Ish yuritish</h2>
                    <dl className="stack" style={{ gap: 8, margin: 0 }}>
                      <Row k="Ovozlar">{i.voteCount !== null && `${i.voteCount}${inCurrentRound ? ' (joriy davr)' : ''}`}</Row>
                      <Row k="Mas’ul">{i.responsible}</Row>
                      <Row k="Keyingi qadam">{i.nextStep}</Row>
                      <Row k="Muddat">
                        {i.dueDate && <span style={overdue ? { color: 'var(--danger)', fontWeight: 600 } : undefined}>{fmtDate(i.dueDate)}{overdue && ' · muddat o‘tgan'}</span>}
                      </Row>
                      <Row k="Tashkilot">{i.referredOrg}</Row>
                      <Row k="Yuborilgan">{i.referredAt && fmtDate(i.referredAt)}</Row>
                      <Row k="Keyingi tekshiruv">{i.followUpAt && fmtDate(i.followUpAt)}</Row>
                      <Row k="Bajarilgan ish">{i.resolutionText}</Row>
                    </dl>
                    <div className="stack" style={{ gap: 8 }}>
                      {actions.includes('IN_PROGRESS') && (
                        <Button variant={i.status === 'SELECTED' ? 'primary' : 'secondary'} icon={Wrench} onClick={() => setDlg('IN_PROGRESS')}>
                          {i.status === 'RESOLVED' ? 'Qayta jarayonga qaytarish' : TITLE.IN_PROGRESS}
                        </Button>
                      )}
                      {actions.includes('work') && <Button icon={Pencil} onClick={() => setDlg('work')}>Muddat yoki qadamni o‘zgartirish</Button>}
                      {actions.includes('REFERRED') && <Button icon={Send} onClick={() => setDlg('REFERRED')}>{TITLE.REFERRED}</Button>}
                      {actions.includes('RESOLVED') && <Button variant="primary" icon={CheckCircle2} onClick={() => setDlg('RESOLVED')}>{TITLE.RESOLVED}</Button>}
                      {actions.includes('carryOver') && (
                        <>
                          <Button icon={CornerDownRight} loading={act.pending} onClick={() => send(`issues/${i.id}/carry-over`, 'POST')}>Joriy ovoz davriga kiritish</Button>
                          <p className="small muted">Post yangi davrda nol ovozdan boshlaydi.</p>
                        </>
                      )}
                      {i.status === 'PENDING_REVIEW' && <Link href="/moderation">Moderatsiya navbatida ko‘rib chiqish</Link>}
                    </div>
                  </section>
                  <section className="card stack" aria-label="Moderatsiya">
                    {i.hidden ? (
                      <Button icon={Eye} loading={act.pending} onClick={() => send(`content/post/${i.id}/unhide`, 'POST')}>Postni qaytarish</Button>
                    ) : (
                      <Button variant="danger" icon={EyeOff} onClick={() => setDlg('hide')}>Postni yashirish</Button>
                    )}
                  </section>
                </aside>
              </div>

              <Modal open={!!dlg} onClose={close} title={dlg ? TITLE[dlg] : ''}>
                {dlg === 'hide' && (
                  <form className="stack" noValidate onSubmit={(e) => (e.preventDefault(), send(`content/post/${i.id}/hide`, 'POST', formValues(e.currentTarget)))}>
                    <p>Post va uning media fayllari aholiga ko‘rinmaydi. Amal jurnalga yoziladi.</p>
                    {act.error && !act.error.fields.reason && <Notice kind="error">{act.error.message}</Notice>}
                    <Field label="Sabab" name="reason" textarea error={act.error?.fields.reason} required />
                    <div className="row" style={{ justifyContent: 'flex-end' }}>
                      <Button onClick={close}>Bekor qilish</Button>
                      <Button type="submit" variant="danger" loading={act.pending}>Yashirish</Button>
                    </div>
                  </form>
                )}
                {dlg && dlg !== 'hide' && (
                  <WorkForm
                    target={dlg}
                    issue={i}
                    pending={act.pending}
                    error={act.error}
                    onCancel={close}
                    onSubmit={(body) => (dlg === 'work' ? send(`issues/${i.id}/work`, 'PATCH', body) : send(`issues/${i.id}/transition`, 'POST', { toStatus: dlg, ...body }))}
                  />
                )}
              </Modal>
            </>
          );
        }}
      </Async>
    </>
  );
}

const disputed = (h: HistoryItem) => h.type === 'AUTHOR_FEEDBACK' && h.payload.feedback === 'STILL_ONGOING';

function historyTitle(h: HistoryItem): string {
  if (h.type === 'AUTHOR_FEEDBACK') return disputed(h) ? 'Muallif: muammo davom etmoqda' : 'Muallif natijani tasdiqladi';
  if (h.type === 'CARRY_OVER') return 'Joriy ovoz davriga o‘tkazildi';
  if (h.type === 'DETAILS_CHANGE') return 'Ish ma’lumotlari o‘zgardi';
  return h.toStatus ? STATUS_LABEL[h.toStatus] : 'Holat o‘zgardi';
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

function WorkForm({
  target,
  issue,
  pending,
  error,
  onCancel,
  onSubmit,
}: {
  target: Exclude<Dlg, 'hide'>;
  issue: IssueDetail;
  pending: boolean;
  error: ReturnType<typeof useAction>['error'];
  onCancel: () => void;
  onSubmit: (body: object) => void;
}) {
  const [mediaIds, setMediaIds] = useState<string[]>([]);
  const fe = error?.fields ?? {};
  const reasonRequired = target === 'work' || (target === 'IN_PROGRESS' && issue.status === 'RESOLVED');

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const v = compact(formValues(e.currentTarget));
    onSubmit(target === 'RESOLVED' ? { ...v, mediaIds } : v);
  }

  return (
    <form className="stack" onSubmit={submit} noValidate>
      {error && !Object.keys(fe).length && <Notice kind="error">{error.message}</Notice>}
      {(target === 'IN_PROGRESS' || target === 'work') && (
        <>
          <Field label="Mas’ul shaxs yoki bo‘lim" name="responsible" defaultValue={issue.responsible ?? ''} error={fe.responsible} required={target === 'IN_PROGRESS'} />
          <Field label="Keyingi qadam" name="nextStep" defaultValue={issue.nextStep ?? ''} error={fe.nextStep} required={target === 'IN_PROGRESS'} />
          <Field label="Kutilayotgan muddat" name="dueDate" type="date" min={todayTashkent()} defaultValue={issue.dueDate?.slice(0, 10) ?? ''} error={fe.dueDate} required={target === 'IN_PROGRESS'} />
        </>
      )}
      {target === 'REFERRED' && (
        <>
          <Field label="Tashkilot nomi" name="referredOrg" defaultValue={issue.referredOrg ?? ''} error={fe.referredOrg} required />
          <Field label="Yuborilgan sana" name="referredAt" type="date" defaultValue={todayTashkent()} error={fe.referredAt} required />
          <Field label="Keyingi tekshiruv sanasi" name="followUpAt" type="date" min={todayTashkent()} error={fe.followUpAt} required />
        </>
      )}
      {target !== 'RESOLVED' && (
        <Field
          label={issue.status === 'RESOLVED' ? 'Qaytarish sababi' : reasonRequired ? 'O‘zgartirish sababi' : 'Izoh (ixtiyoriy)'}
          name="reason"
          textarea
          hint="Holat tarixida aholiga ko‘rinadi"
          error={fe.reason}
          required={reasonRequired}
        />
      )}
      {target === 'RESOLVED' && (
        <>
          <Field label="Bajarilgan ish" name="resolutionText" textarea error={fe.resolutionText} placeholder="Masalan: ustunga yangi LED chiroq o‘rnatildi" required />
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
