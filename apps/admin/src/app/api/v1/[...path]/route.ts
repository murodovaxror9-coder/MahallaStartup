// Mock API (API_URL berilmaganda). Haqiqiy backend bilan bir xil yo'llar va xato formati.
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { adminActions } from '@/lib/rules';
import type { IssueDetail, Media, StatusChange } from '@/lib/types';
import { currentRound, daysFrom, db, log, me, nextId, now, publicUser, randomPassword, refreshRound } from '@/mock/db';

type Ctx = { userId: string; body: Record<string, unknown>; params: string[]; req: Request; url: URL };
type Handler = (c: Ctx) => Response | Promise<Response>;

const ok = (data: unknown, status = 200) => (status === 204 ? new NextResponse(null, { status }) : NextResponse.json(data, { status }));
const fail = (status: number, code: string, message: string, fields?: Record<string, string>) =>
  NextResponse.json({ error: { code, message, fields } }, { status });
// Cursor = offset (mock uchun yetarli). limit standart 20.
const page = <T,>(url: URL, items: T[]) => {
  const limit = Math.min(Number(url.searchParams.get('limit')) || 20, 100);
  const from = Number(url.searchParams.get('cursor')) || 0;
  return ok({ items: items.slice(from, from + limit), nextCursor: from + limit < items.length ? String(from + limit) : null });
};

function required(body: Record<string, unknown>, keys: string[]) {
  const fields: Record<string, string> = {};
  for (const k of keys) if (typeof body[k] !== 'string' || !(body[k] as string).trim()) fields[k] = 'Majburiy maydon';
  return Object.keys(fields).length ? fail(422, 'VALIDATION', 'Maydonlarni to‘ldiring', fields) : null;
}

const mediaOf = (ids: string[] = []): Media[] =>
  ids.filter((id) => db.files.has(id)).map((id) => ({ id, kind: 'IMAGE', url: `/api/v1/media/${id}/file`, mime: db.files.get(id)!.type, size: db.files.get(id)!.data.byteLength }));

const issueOr404 =(id: string) => db.issues.find((i) => i.id === id);

function addUpdate(i: IssueDetail, actorId: string, note: string | null, reason: string | null = null, media: Media[] = []) {
  const a = me(actorId);
  i.updates.push({ id: nextId('upd'), kind: 'STATUS', status: i.status, at: now(), actor: { id: a.id, displayName: a.displayName }, note, reason, media });
}

const routes: [string, string, Handler][] = [
  ['POST', 'auth/login', async ({ body }) => {
    const u = db.users.find((x) => x.login === body.login && x.password === body.password);
    if (!u) return fail(401, 'INVALID_CREDENTIALS', 'Login yoki parol noto‘g‘ri');
    if (u.status === 'BLOCKED') return fail(403, 'BLOCKED', 'Akkaunt bloklangan');
    if (u.role !== 'ADMIN' && body.client === 'web') return fail(403, 'FORBIDDEN', 'Veb-panel faqat mahalla admini uchun');
    if (u.mustChangePassword && u.tempPasswordExpiresAt && new Date(u.tempPasswordExpiresAt) < new Date())
      return fail(401, 'TEMP_PASSWORD_EXPIRED', 'Vaqtinchalik parol muddati tugagan. Admindan yangisini so‘rang');
    const s = { token: crypto.randomUUID(), csrf: crypto.randomUUID(), userId: u.id };
    db.sessions.push(s);
    u.lastLoginAt = now();
    const jar = await cookies();
    jar.set('md_session', s.token, { httpOnly: true, sameSite: 'lax', path: '/', secure: process.env.NODE_ENV === 'production' });
    jar.set('md_csrf', s.csrf, { sameSite: 'lax', path: '/' });
    return ok({ me: me(u.id) });
  }],
  ['POST', 'auth/logout', async ({ req }) => {
    const t = tokenOf(req);
    db.sessions = db.sessions.filter((s) => s.token !== t);
    const jar = await cookies();
    jar.delete('md_session');
    jar.delete('md_csrf');
    return ok(null, 204);
  }],
  ['POST', 'auth/change-password', ({ userId, body, req }) => {
    const u = db.users.find((x) => x.id === userId)!;
    if (body.currentPassword !== u.password) return fail(422, 'VALIDATION', 'Joriy parol noto‘g‘ri', { currentPassword: 'Noto‘g‘ri' });
    if (typeof body.newPassword !== 'string' || body.newPassword.length < 8)
      return fail(422, 'VALIDATION', 'Parol kamida 8 belgi bo‘lsin', { newPassword: 'Kamida 8 belgi' });
    u.password = body.newPassword;
    u.mustChangePassword = false;
    u.tempPasswordExpiresAt = null;
    const t = tokenOf(req);
    db.sessions = db.sessions.filter((s) => s.userId !== userId || s.token === t);
    return ok({ me: me(userId) });
  }],
  ['GET', 'me', ({ userId }) => ok(me(userId))],

  ['GET', 'admin/dashboard', () => {
    const round = refreshRound();
    const overdue = db.issues.filter((i) => (i.status === 'IN_PROGRESS' || i.status === 'REFERRED') && i.dueDate && new Date(i.dueDate) < new Date());
    const next = db.events.filter((e) => e.status === 'PUBLISHED' && new Date(e.startsAt) > new Date()).sort((a, b) => a.startsAt.localeCompare(b.startsAt))[0] ?? null;
    return ok({
      round,
      activeVoters: round.voterCount,
      residents: db.users.filter((u) => u.role === 'RESIDENT' && u.status === 'ACTIVE').length,
      pendingModeration: db.issues.filter((i) => i.status === 'PENDING_REVIEW').length,
      openReports: db.reports.filter((r) => r.status === 'OPEN').length,
      overdueIssues: overdue,
      nextEvent: next,
    });
  }],

  ['GET', 'admin/users', ({ url }) => {
    const q = (url.searchParams.get('q') ?? '').toLowerCase();
    const status = url.searchParams.get('status');
    return page(url, 
      db.users
        .filter((u) => (!q || u.displayName.toLowerCase().includes(q) || u.login.includes(q)) && (!status || u.status === status))
        .map(publicUser),
    );
  }],
  ['POST', 'admin/users', ({ userId, body }) => {
    const bad = required(body, ['displayName', 'login']);
    if (bad) return bad;
    const login = String(body.login).trim().toLowerCase();
    if (!/^[a-z0-9._-]{3,32}$/.test(login)) return fail(422, 'VALIDATION', 'Login: 3–32 belgi, lotin harf, raqam, . _ -', { login: 'Noto‘g‘ri format' });
    if (db.users.some((u) => u.login === login)) return fail(409, 'LOGIN_TAKEN', 'Bu login band', { login: 'Band' });
    const pw = randomPassword();
    const u = {
      id: nextId('u'),
      displayName: String(body.displayName).trim(),
      login,
      phone: (body.phone as string) || null,
      role: 'RESIDENT' as const,
      status: 'ACTIVE' as const,
      mustChangePassword: true,
      tempPasswordExpiresAt: daysFrom(3),
      createdAt: now(),
      lastLoginAt: null,
      password: pw,
    };
    db.users.push(u);
    log(userId, 'USER_CREATED', 'User', u.id);
    return ok({ user: publicUser(u), temporaryPassword: pw, expiresAt: u.tempPasswordExpiresAt }, 201);
  }],
  ['POST', 'admin/users/:id/reset-password', ({ userId, params: [id] }) => {
    const u = db.users.find((x) => x.id === id);
    if (!u || u.role !== 'RESIDENT') return fail(404, 'NOT_FOUND', 'Topilmadi');
    u.password = randomPassword();
    u.mustChangePassword = true;
    u.tempPasswordExpiresAt = daysFrom(3);
    db.sessions = db.sessions.filter((s) => s.userId !== id);
    log(userId, 'PASSWORD_RESET', 'User', id);
    return ok({ user: publicUser(u), temporaryPassword: u.password, expiresAt: u.tempPasswordExpiresAt });
  }],
  ['POST', 'admin/users/:id/block', ({ userId, body, params: [id] }) => {
    const bad = required(body, ['reason']);
    if (bad) return bad;
    const u = db.users.find((x) => x.id === id);
    if (!u || u.role !== 'RESIDENT') return fail(404, 'NOT_FOUND', 'Topilmadi');
    u.status = 'BLOCKED';
    db.sessions = db.sessions.filter((s) => s.userId !== id);
    log(userId, 'USER_BLOCKED', 'User', id, String(body.reason));
    return ok(publicUser(u));
  }],
  ['POST', 'admin/users/:id/unblock', ({ userId, params: [id] }) => {
    const u = db.users.find((x) => x.id === id);
    if (!u || u.role !== 'RESIDENT') return fail(404, 'NOT_FOUND', 'Topilmadi');
    u.status = 'ACTIVE';
    log(userId, 'USER_UNBLOCKED', 'User', id);
    return ok(publicUser(u));
  }],

  ['GET', 'admin/moderation', ({ url }) => page(url, db.issues.filter((i) => i.status === 'PENDING_REVIEW').sort((a, b) => a.createdAt.localeCompare(b.createdAt)))],
  ['GET', 'issues', ({ url }) => {
    refreshRound();
    const p = url.searchParams;
    let list = db.issues.filter((i) => i.status !== 'PENDING_REVIEW' && i.status !== 'REJECTED');
    if (p.get('status')) list = list.filter((i) => i.status === p.get('status'));
    if (p.get('category')) list = list.filter((i) => i.category === p.get('category'));
    if (p.get('period') === 'current') list = list.filter((i) => i.inCurrentRound);
    list.sort((a, b) => (p.get('sort') === 'votes' ? b.voteCount - a.voteCount : (b.publishedAt ?? '').localeCompare(a.publishedAt ?? '')));
    return page(url, list);
  }],
  ['GET', 'issues/:id', ({ params: [id] }) => {
    refreshRound();
    const i = issueOr404(id);
    return i ? ok(i) : fail(404, 'NOT_FOUND', 'Muammo topilmadi');
  }],
  ['POST', 'admin/issues/:id/:action', ({ userId, body, params: [id, action] }) => {
    const i = issueOr404(id);
    if (!i) return fail(404, 'NOT_FOUND', 'Muammo topilmadi');
    const allowed = adminActions(i.status, i.inCurrentRound);
    const wanted = action === 'status' ? (body as StatusChange).status : action === 'carry-over' ? 'carryOver' : action;
    if (!allowed.includes(wanted as never)) return fail(409, 'INVALID_STATE', 'Bu holatda amal mumkin emas');
    const round = currentRound();

    if (action === 'approve') {
      i.status = 'OPEN';
      i.publishedAt = now();
      round.entries.push(i.id);
      addUpdate(i, userId, 'Tasdiqlandi va joriy ovoz davriga qo‘shildi');
      log(userId, 'ISSUE_APPROVED', 'Issue', id);
    } else if (action === 'reject') {
      const bad = required(body, ['reason']);
      if (bad) return bad;
      i.status = 'REJECTED';
      i.rejectionReason = String(body.reason);
      addUpdate(i, userId, null, i.rejectionReason);
      log(userId, 'ISSUE_REJECTED', 'Issue', id, i.rejectionReason);
    } else if (action === 'merge') {
      const primary = issueOr404(String(body.primaryIssueId));
      if (!primary || primary.id === id || primary.status === 'PENDING_REVIEW' || primary.status === 'REJECTED')
        return fail(422, 'VALIDATION', 'Asosiy post e’lon qilingan bo‘lishi kerak', { primaryIssueId: 'Noto‘g‘ri' });
      i.status = 'REJECTED';
      i.primaryIssueId = primary.id;
      i.rejectionReason = `Bu muammo «${primary.title}» postiga bog‘landi. O‘sha yerda ovoz bering.`;
      addUpdate(i, userId, null, i.rejectionReason);
      log(userId, 'ISSUE_MERGED', 'Issue', id, `→ ${primary.id}`);
    } else if (action === 'carry-over') {
      round.entries.push(i.id);
      addUpdate(i, userId, 'Joriy ovoz davriga kiritildi (0 ovozdan)');
      log(userId, 'ISSUE_CARRIED_OVER', 'Issue', id);
    } else if (action === 'status') {
      const s = body as StatusChange;
      if (s.status === 'IN_PROGRESS') {
        const needReason = i.status === 'RESOLVED' || (i.status === 'IN_PROGRESS' && s.dueDate !== i.dueDate?.slice(0, 10));
        const bad = required(body, ['responsible', 'nextStep', 'dueDate', ...(needReason ? ['reason'] : [])]);
        if (bad) return bad;
        Object.assign(i, { status: 'IN_PROGRESS', responsible: s.responsible, nextStep: s.nextStep, dueDate: new Date(s.dueDate).toISOString() });
        addUpdate(i, userId, `Mas’ul: ${s.responsible}. Keyingi qadam: ${s.nextStep}.`, s.reason ?? null);
      } else if (s.status === 'REFERRED') {
        const bad = required(body, ['organization', 'referredAt', 'followUpAt']);
        if (bad) return bad;
        Object.assign(i, { status: 'REFERRED', organization: s.organization, referredAt: new Date(s.referredAt).toISOString(), followUpAt: new Date(s.followUpAt).toISOString() });
        addUpdate(i, userId, `${s.organization} tashkilotiga yuborildi`, s.reason ?? null);
      } else {
        const bad = required(body, ['resolutionText']);
        if (bad) return bad;
        Object.assign(i, { status: 'RESOLVED', resolutionText: s.resolutionText });
        addUpdate(i, userId, s.resolutionText, null, mediaOf(s.mediaIds));
      }
      log(userId, `ISSUE_${s.status}`, 'Issue', id, ('reason' in s && s.reason) || null);
    } else return fail(404, 'NOT_FOUND', 'Noma’lum amal');
    refreshRound();
    return ok(i);
  }],

  ['GET', 'rounds/current', () => ok(refreshRound())],
  ['GET', 'rounds', ({ url }) => {
    refreshRound();
    return page(url, db.rounds);
  }],

  ['GET', 'admin/reports', ({ url }) => {
    const s = url.searchParams.get('status');
    return page(url, db.reports.filter((r) => !s || r.status === s));
  }],
  ['POST', 'admin/reports/:id/:action', ({ userId, body, params: [id, action] }) => {
    const r = db.reports.find((x) => x.id === id);
    if (!r) return fail(404, 'NOT_FOUND', 'Shikoyat topilmadi');
    if (r.status !== 'OPEN') return fail(409, 'INVALID_STATE', 'Shikoyat allaqachon ko‘rib chiqilgan');
    if (action === 'hide') {
      const bad = required(body, ['reason']);
      if (bad) return bad;
      r.status = 'HIDDEN';
      if (r.targetType === 'ISSUE') {
        const i = issueOr404(r.targetId);
        if (i) i.hidden = true;
      }
    } else if (action === 'dismiss') r.status = 'DISMISSED';
    else return fail(404, 'NOT_FOUND', 'Noma’lum amal');
    r.resolutionNote = (body.reason as string) || null;
    log(userId, action === 'hide' ? 'CONTENT_HIDDEN' : 'REPORT_DISMISSED', r.targetType, r.targetId, r.resolutionNote);
    return ok(r);
  }],

  ['GET', 'events', ({ url }) => page(url, [...db.events].sort((a, b) => b.startsAt.localeCompare(a.startsAt)))],
  ['POST', 'admin/events', ({ userId, body }) => {
    const bad = required(body, ['title', 'description', 'startsAt', 'location', 'organizer']);
    if (bad) return bad;
    const e = {
      id: nextId('e'),
      title: String(body.title),
      description: String(body.description),
      startsAt: new Date(String(body.startsAt)).toISOString(),
      location: String(body.location),
      organizer: String(body.organizer),
      status: body.publish ? ('PUBLISHED' as const) : ('DRAFT' as const),
      rsvpCount: 0,
      cancelReason: null,
      resultText: null,
      resultMedia: [],
    };
    db.events.push(e);
    log(userId, body.publish ? 'EVENT_PUBLISHED' : 'EVENT_CREATED', 'Event', e.id);
    return ok(e, 201);
  }],
  ['PATCH', 'admin/events/:id', ({ userId, body, params: [id] }) => {
    const e = db.events.find((x) => x.id === id);
    if (!e) return fail(404, 'NOT_FOUND', 'Tadbir topilmadi');
    if (e.status === 'CANCELLED' || e.status === 'COMPLETED') return fail(409, 'INVALID_STATE', 'Bu tadbirni tahrirlab bo‘lmaydi');
    const bad = required(body, ['title', 'description', 'startsAt', 'location', 'organizer']);
    if (bad) return bad;
    Object.assign(e, { ...body, startsAt: new Date(String(body.startsAt)).toISOString(), status: body.publish ? 'PUBLISHED' : e.status });
    delete (e as unknown as Record<string, unknown>).publish;
    log(userId, 'EVENT_UPDATED', 'Event', id);
    return ok(e);
  }],
  ['POST', 'admin/events/:id/cancel', ({ userId, body, params: [id] }) => {
    const e = db.events.find((x) => x.id === id);
    if (!e) return fail(404, 'NOT_FOUND', 'Tadbir topilmadi');
    const bad = required(body, ['reason']);
    if (bad) return bad;
    e.status = 'CANCELLED';
    e.cancelReason = String(body.reason);
    log(userId, 'EVENT_CANCELLED', 'Event', id, e.cancelReason);
    return ok(e);
  }],
  ['POST', 'admin/events/:id/result', ({ userId, body, params: [id] }) => {
    const e = db.events.find((x) => x.id === id);
    if (!e) return fail(404, 'NOT_FOUND', 'Tadbir topilmadi');
    if (new Date(e.startsAt) > new Date()) return fail(409, 'INVALID_STATE', 'Tadbir hali boshlanmagan');
    const bad = required(body, ['resultText']);
    if (bad) return bad;
    e.status = 'COMPLETED';
    e.resultText = String(body.resultText);
    e.resultMedia = mediaOf(body.mediaIds as string[]);
    log(userId, 'EVENT_COMPLETED', 'Event', id);
    return ok(e);
  }],

  ['GET', 'admin/announcements', ({ url }) => page(url, [...db.announcements].sort((a, b) => b.createdAt.localeCompare(a.createdAt)))],
  ['POST', 'admin/announcements', ({ userId, body }) => {
    const bad = required(body, ['title', 'body']);
    if (bad) return bad;
    const a = { id: nextId('a'), title: String(body.title), body: String(body.body), important: !!body.important, status: 'DRAFT' as const, createdAt: now(), publishedAt: null };
    db.announcements.push(a);
    log(userId, 'ANNOUNCEMENT_DRAFTED', 'Announcement', a.id);
    return ok(a, 201);
  }],
  ['PATCH', 'admin/announcements/:id', ({ userId, body, params: [id] }) => {
    const a = db.announcements.find((x) => x.id === id);
    if (!a) return fail(404, 'NOT_FOUND', 'E’lon topilmadi');
    if (a.status !== 'DRAFT') return fail(409, 'INVALID_STATE', 'Nashr qilingan e’lonni tahrirlab bo‘lmaydi');
    const bad = required(body, ['title', 'body']);
    if (bad) return bad;
    Object.assign(a, { title: body.title, body: body.body, important: !!body.important });
    log(userId, 'ANNOUNCEMENT_UPDATED', 'Announcement', id);
    return ok(a);
  }],
  ['POST', 'admin/announcements/:id/publish', ({ userId, params: [id] }) => {
    const a = db.announcements.find((x) => x.id === id);
    if (!a) return fail(404, 'NOT_FOUND', 'E’lon topilmadi');
    if (a.status !== 'DRAFT') return ok(a); // takroriy nashr — o'sha natija
    a.status = 'PUBLISHED';
    a.publishedAt = now();
    log(userId, 'ANNOUNCEMENT_PUBLISHED', 'Announcement', id);
    return ok(a);
  }],

  ['GET', 'admin/audit', ({ url }) => {
    const a = url.searchParams.get('action');
    return page(url, db.audit.filter((e) => !a || e.action.startsWith(a)));
  }],

  ['POST', 'media', async ({ req }) => {
    const form = await req.formData().catch(() => null);
    const file = form?.get('file');
    if (!(file instanceof File)) return fail(422, 'VALIDATION', 'Fayl tanlanmagan', { file: 'Majburiy' });
    const isImg = /^image\/(jpeg|png|webp|heic)$/.test(file.type);
    const isVid = /^video\/(mp4|quicktime)$/.test(file.type);
    if (!isImg && !isVid) return fail(415, 'UNSUPPORTED_MEDIA', 'Faqat JPG, PNG, WEBP, HEIC rasm yoki MP4, MOV video');
    if (file.size > (isImg ? 5 : 25) * 1024 * 1024) return fail(413, 'FILE_TOO_LARGE', isImg ? 'Rasm 5 MB dan oshmasin' : 'Video 25 MB dan oshmasin');
    const id = nextId('m');
    db.files.set(id, { type: file.type, data: await file.arrayBuffer() });
    return ok({ id, kind: isImg ? 'IMAGE' : 'VIDEO', url: `/api/v1/media/${id}/file`, mime: file.type, size: file.size }, 201);
  }],
  ['GET', 'media/:id/file', ({ params: [id] }) => {
    const f = db.files.get(id);
    return f ? new Response(f.data, { headers: { 'content-type': f.type, 'cache-control': 'private, max-age=300' } }) : fail(404, 'NOT_FOUND', 'Fayl topilmadi');
  }],
];

function tokenOf(req: Request) {
  return /(?:^|;\s*)md_session=([^;]+)/.exec(req.headers.get('cookie') ?? '')?.[1];
}

function match(pattern: string, path: string[]) {
  const p = pattern.split('/');
  if (p.length !== path.length) return null;
  const params: string[] = [];
  for (let i = 0; i < p.length; i++) {
    if (p[i].startsWith(':')) params.push(path[i]);
    else if (p[i] !== path[i]) return null;
  }
  return params;
}

async function handle(req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const url = new URL(req.url);
  const key = path.join('/');
  let found: [Handler, string[]] | null = null;
  for (const [m, pattern, h] of routes) {
    const ps = m === req.method && match(pattern, path);
    if (ps) {
      found = [h, ps];
      break;
    }
  }
  if (!found) return fail(404, 'NOT_FOUND', `Mock’da yo‘q: ${req.method} /${key}`);

  let userId = '';
  if (key !== 'auth/login') {
    const s = db.sessions.find((x) => x.token === tokenOf(req));
    const u = s && db.users.find((x) => x.id === s.userId);
    if (!s || !u || u.status === 'BLOCKED') return fail(401, 'UNAUTHENTICATED', 'Qaytadan kiring');
    if (req.method !== 'GET' && req.headers.get('x-csrf-token') !== s.csrf) return fail(403, 'FORBIDDEN', 'CSRF token noto‘g‘ri');
    if (u.mustChangePassword && !key.startsWith('auth/') && key !== 'me') return fail(403, 'PASSWORD_CHANGE_REQUIRED', 'Avval parolni almashtiring');
    if (key.startsWith('admin/') && u.role !== 'ADMIN') return fail(403, 'FORBIDDEN', 'Ruxsat yo‘q');
    userId = u.id;
  }
  const isJson = req.headers.get('content-type')?.includes('application/json');
  const body = isJson ? ((await req.json().catch(() => ({}))) as Record<string, unknown>) : {};
  return found[0]({ userId, body, params: found[1], req, url });
}

export { handle as GET, handle as POST, handle as PATCH, handle as DELETE };
