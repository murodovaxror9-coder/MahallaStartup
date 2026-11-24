// Backend tayyor bo'lguncha ishlatiladigan xotiradagi mock. docs/api-contract.md ga mos.
// shortcut: ma'lumot server qayta ishga tushganda yo'qoladi, faqat demo/UI ishlab chiqish uchun.
import type {
  Announcement,
  AuditEvent,
  EventItem,
  IssueDetail,
  IssueStatus,
  Media,
  Me,
  Report,
  Round,
  UserRow,
} from '@/lib/types';

const now = () => new Date().toISOString();
const daysFrom = (d: number) => new Date(Date.now() + d * 86_400_000).toISOString();
let seq = 1000;
export const nextId = (p: string) => `${p}_${++seq}`;

function monthBounds(offset = 0) {
  // Asia/Tashkent = UTC+5, DST yo'q: oy boshi 00:00 = oldingi kun 19:00 UTC
  const t = new Date(Date.now() + 5 * 3_600_000);
  const y = t.getUTCFullYear();
  const m = t.getUTCMonth() + offset;
  const start = new Date(Date.UTC(y, m, 1) - 5 * 3_600_000);
  const end = new Date(Date.UTC(y, m + 1, 1) - 5 * 3_600_000);
  const month = `${new Date(Date.UTC(y, m, 1)).getUTCFullYear()}-${String(new Date(Date.UTC(y, m, 1)).getUTCMonth() + 1).padStart(2, '0')}`;
  return { start: start.toISOString(), end: end.toISOString(), month };
}

function svg(label: string, hue: number) {
  const s = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="420"><rect width="640" height="420" fill="hsl(${hue} 30% 86%)"/><circle cx="320" cy="180" r="70" fill="hsl(${hue} 40% 60%)"/><text x="320" y="330" font-family="sans-serif" font-size="28" text-anchor="middle" fill="hsl(${hue} 30% 25%)">${label}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(s)}`;
}

const img = (label: string, hue: number): Media => ({ id: nextId('m'), kind: 'IMAGE', url: svg(label, hue), mime: 'image/svg+xml', size: 2048 });

export interface Session {
  token: string;
  csrf: string;
  userId: string;
}

interface Db {
  mahalla: { id: string; name: string };
  users: (UserRow & { password: string })[];
  sessions: Session[];
  issues: IssueDetail[];
  rounds: (Round & { entries: string[]; votes: { issueId: string; userId: string }[] })[];
  events: EventItem[];
  announcements: Announcement[];
  reports: Report[];
  audit: AuditEvent[];
  files: Map<string, { type: string; data: ArrayBuffer }>;
}

function seed(): Db {
  const mahalla = { id: 'mh_navruz', name: 'Navro‘z mahallasi' };
  const user = (id: string, displayName: string, login: string, role: UserRow['role'], extra: Partial<UserRow> = {}) => ({
    id,
    displayName,
    login,
    phone: null,
    role,
    status: 'ACTIVE' as const,
    mustChangePassword: false,
    tempPasswordExpiresAt: null,
    createdAt: daysFrom(-40),
    lastLoginAt: daysFrom(-1),
    password: 'Demo-2026',
    ...extra,
  });
  const users = [
    user('u_admin', 'Dilnoza Karimova', 'admin.navruz', 'ADMIN'),
    user('u_1', 'Aziz Rahimov', 'aziz', 'RESIDENT'),
    user('u_2', 'Malika Yo‘ldosheva', 'malika', 'RESIDENT'),
    user('u_3', 'Sardor Tursunov', 'sardor', 'RESIDENT'),
    user('u_4', 'Nodira Qodirova', 'nodira', 'RESIDENT', { mustChangePassword: true, tempPasswordExpiresAt: daysFrom(2), lastLoginAt: null }),
    user('u_5', 'Jasur Aliyev', 'jasur', 'RESIDENT', { status: 'BLOCKED' }),
  ];
  const ref = (id: string) => ({ id, displayName: users.find((u) => u.id === id)!.displayName });

  const issue = (id: string, o: Partial<IssueDetail> & Pick<IssueDetail, 'title' | 'category' | 'status' | 'locationText'>): IssueDetail => ({
    id,
    description: '',
    author: ref('u_1'),
    voteCount: 0,
    inCurrentRound: false,
    createdAt: daysFrom(-10),
    publishedAt: daysFrom(-9),
    dueDate: null,
    thumbnailUrl: null,
    hidden: false,
    media: [],
    updates: [],
    rejectionReason: null,
    primaryIssueId: null,
    responsible: null,
    nextStep: null,
    organization: null,
    referredAt: null,
    followUpAt: null,
    resolutionText: null,
    commentCount: 0,
    ...o,
  });
  const upd = (status: IssueStatus, actor: string, at: string, note: string | null = null, reason: string | null = null) => ({
    id: nextId('upd'),
    kind: 'STATUS' as const,
    status,
    at,
    actor: ref(actor),
    note,
    reason,
    media: [],
  });

  const light = img('Ko‘cha chirog‘i', 45);
  const issues: IssueDetail[] = [
    issue('i_1', {
      title: 'Bog‘ ko‘chasida chiroq ishlamayapti',
      description: '12-uy oldidagi ustundagi chiroq bir haftadan beri yonmayapti. Kechqurun bolalar maktabdan qorong‘ida qaytadi.',
      category: 'LIGHTING',
      status: 'PENDING_REVIEW',
      locationText: 'Bog‘ ko‘chasi, 12-uy oldidagi ustun',
      author: ref('u_1'),
      createdAt: daysFrom(-0.2),
      publishedAt: null,
      media: [light],
      thumbnailUrl: light.url,
      updates: [upd('PENDING_REVIEW', 'u_1', daysFrom(-0.2))],
    }),
    issue('i_2', {
      title: 'Ko‘chada chiroq yo‘q',
      description: 'Bog‘ ko‘chasi qorong‘i.',
      category: 'LIGHTING',
      status: 'PENDING_REVIEW',
      locationText: 'Bog‘ ko‘chasi',
      author: ref('u_3'),
      createdAt: daysFrom(-0.1),
      publishedAt: null,
      updates: [upd('PENDING_REVIEW', 'u_3', daysFrom(-0.1))],
    }),
    issue('i_3', {
      title: 'Maktab yonidagi yo‘lda chuqur',
      description: '45-maktab darvozasi oldida katta chuqur bor, yomg‘irda suv to‘ladi.',
      category: 'ROAD',
      status: 'OPEN',
      inCurrentRound: true,
      voteCount: 14,
      locationText: '45-maktab darvozasi',
      author: ref('u_2'),
      updates: [upd('PENDING_REVIEW', 'u_2', daysFrom(-10)), upd('OPEN', 'u_admin', daysFrom(-9))],
    }),
    issue('i_4', {
      title: 'Chiqindi konteyneri to‘lib ketgan',
      description: 'Bozor yonidagi konteynerlar uch kundan beri olib ketilmagan.',
      category: 'WASTE',
      status: 'OPEN',
      inCurrentRound: true,
      voteCount: 9,
      locationText: 'Mahalla bozori orqasi',
      author: ref('u_3'),
      createdAt: daysFrom(-6),
      publishedAt: daysFrom(-5),
      updates: [upd('PENDING_REVIEW', 'u_3', daysFrom(-6)), upd('OPEN', 'u_admin', daysFrom(-5))],
    }),
    issue('i_5', {
      title: 'Bolalar maydonchasida singan arg‘imchoq',
      description: 'Arg‘imchoq zanjiri uzilgan.',
      category: 'LANDSCAPING',
      status: 'OPEN',
      inCurrentRound: false,
      voteCount: 0,
      locationText: 'Markaziy bolalar maydonchasi',
      author: ref('u_2'),
      createdAt: daysFrom(-45),
      publishedAt: daysFrom(-44),
      updates: [upd('PENDING_REVIEW', 'u_2', daysFrom(-45)), upd('OPEN', 'u_admin', daysFrom(-44))],
    }),
    issue('i_6', {
      title: 'Ichimlik suvi bosimi past',
      description: 'Ertalab 7–9 da 3-qavatdan yuqoriga suv chiqmaydi.',
      category: 'WATER',
      status: 'IN_PROGRESS',
      voteCount: 21,
      locationText: 'Navro‘z ko‘chasi, ko‘p qavatli uylar',
      author: ref('u_1'),
      createdAt: daysFrom(-50),
      publishedAt: daysFrom(-49),
      responsible: 'Suvoqova tuman bo‘limi',
      nextStep: 'Nasos stansiyasini tekshirish',
      dueDate: daysFrom(-3),
      updates: [
        upd('PENDING_REVIEW', 'u_1', daysFrom(-50)),
        upd('OPEN', 'u_admin', daysFrom(-49)),
        upd('SELECTED', 'u_admin', daysFrom(-24), 'Oktyabr ovozida 21 ovoz bilan g‘olib'),
        upd('IN_PROGRESS', 'u_admin', daysFrom(-23), 'Mas’ul: Suvoqova tuman bo‘limi. Keyingi qadam: nasos stansiyasini tekshirish.'),
      ],
    }),
    // Demo: hal qilingan, lekin muallif «muammo davom etmoqda» degan → admin qayta jarayonga qaytaradi
    issue('i_8', {
      title: 'Ariqdagi ko‘prikcha singan',
      description: 'Maktabga boradigan yo‘ldagi yog‘och ko‘prikchaning ikki taxtasi singan.',
      category: 'LANDSCAPING',
      status: 'RESOLVED',
      voteCount: 17,
      locationText: 'Ariq bo‘yi, maktab yo‘li',
      author: ref('u_2'),
      createdAt: daysFrom(-80),
      publishedAt: daysFrom(-79),
      responsible: 'Mahalla obodonlashtirish guruhi',
      nextStep: 'Taxtalarni almashtirish',
      dueDate: daysFrom(-20),
      resolutionText: 'Ikki taxta almashtirildi.',
      updates: [
        upd('OPEN', 'u_admin', daysFrom(-79)),
        upd('SELECTED', 'u_admin', daysFrom(-54), 'Sentabr ovozida 17 ovoz bilan g‘olib'),
        upd('IN_PROGRESS', 'u_admin', daysFrom(-53), 'Mas’ul: Mahalla obodonlashtirish guruhi.'),
        upd('RESOLVED', 'u_admin', daysFrom(-22), 'Ikki taxta almashtirildi.'),
        { ...upd('RESOLVED', 'u_2', daysFrom(-21), 'Uchinchi taxta ham chirigan, bolalar qo‘rqib o‘tishyapti.'), kind: 'AUTHOR_DISPUTED' as const },
      ],
    }),
    issue('i_7', {
      title: 'Spam: arzon kredit',
      description: 'Telefon qiling...',
      category: 'OTHER',
      status: 'OPEN',
      inCurrentRound: true,
      locationText: '—',
      author: ref('u_5'),
      createdAt: daysFrom(-2),
      publishedAt: daysFrom(-2),
    }),
  ];

  const cur = monthBounds(0);
  const prev = monthBounds(-1);
  const rounds: Db['rounds'] = [
    {
      id: 'r_cur',
      month: cur.month,
      startsAt: cur.start,
      endsAt: cur.end,
      status: 'OPEN',
      entryCount: 3,
      voterCount: 0,
      result: null,
      entries: ['i_3', 'i_4', 'i_7'],
      // seed_* — demo uchun boshqa aholi ovozlari
      votes: [
        ...Array.from({ length: 14 }, (_, k) => ({ issueId: 'i_3', userId: ['u_1', 'u_2', 'u_3'][k] ?? `seed_${k}` })),
        ...Array.from({ length: 9 }, (_, k) => ({ issueId: 'i_4', userId: ['u_1', 'u_2'][k] ?? `seed_${k}` })),
      ],
    },
    {
      id: 'r_prev',
      month: prev.month,
      startsAt: prev.start,
      endsAt: prev.end,
      status: 'CLOSED',
      entryCount: 2,
      voterCount: 34,
      result: null,
      entries: [],
      votes: [],
    },
  ];
  rounds[1].result = {
    closedAt: prev.end,
    winner: issues[5],
    tally: [
      { issueId: 'i_6', title: issues[5].title, votes: 21 },
      { issueId: 'i_5', title: issues[4].title, votes: 7 },
    ],
  };

  const events: EventItem[] = [
    {
      id: 'e_1',
      title: 'Shanbalik hashar',
      description: 'Mahalla bog‘ini tozalaymiz va daraxt ekamiz. Qo‘lqop va belkurak beriladi.',
      startsAt: daysFrom(4),
      location: 'Mahalla bog‘i',
      organizer: 'Mahalla fuqarolar yig‘ini',
      status: 'PUBLISHED',
      rsvpCount: 18,
      cancelReason: null,
      resultText: null,
      resultMedia: [],
    },
    {
      id: 'e_2',
      title: 'Oylik yig‘ilish',
      description: 'G‘olib muammo bo‘yicha hisobot.',
      startsAt: daysFrom(12),
      location: 'Mahalla idorasi',
      organizer: 'Dilnoza Karimova',
      status: 'DRAFT',
      rsvpCount: 0,
      cancelReason: null,
      resultText: null,
      resultMedia: [],
    },
  ];

  const announcements: Announcement[] = [
    { id: 'a_1', title: 'Suv o‘chirilishi', body: 'Ertaga 10:00–14:00 da Navro‘z ko‘chasida suv bo‘lmaydi.', important: true, status: 'PUBLISHED', createdAt: daysFrom(-1), publishedAt: daysFrom(-1) },
    { id: 'a_2', title: 'Mustaqillik bayrami bilan!', body: 'Barcha mahalladoshlarni bayram bilan tabriklaymiz.', important: false, status: 'DRAFT', createdAt: daysFrom(-0.5), publishedAt: null },
  ];

  const reports: Report[] = [
    { id: 'rep_1', targetType: 'ISSUE', targetId: 'i_7', targetPreview: 'Spam: arzon kredit — Telefon qiling...', targetAuthor: ref('u_5'), reason: 'Reklama', reporter: ref('u_2'), status: 'OPEN', createdAt: daysFrom(-1), resolutionNote: null },
    { id: 'rep_2', targetType: 'CHAT_MESSAGE', targetId: 'c_44', targetPreview: 'Hammangiz ahmoqsiz', targetAuthor: ref('u_5'), reason: 'Haqorat', reporter: ref('u_1'), status: 'OPEN', createdAt: daysFrom(-0.3), resolutionNote: null },
  ];

  return { mahalla, users, sessions: [], issues, rounds, events, announcements, reports, audit: [], files: new Map() };
}

const g = globalThis as unknown as { __mdDb?: Db };
export const db = (g.__mdDb ??= seed());

export function me(userId: string): Me {
  const u = db.users.find((x) => x.id === userId)!;
  return { id: u.id, displayName: u.displayName, login: u.login, role: u.role, mahalla: db.mahalla, mustChangePassword: u.mustChangePassword };
}

export function publicUser(u: Db['users'][number]): UserRow {
  const { password: _p, ...rest } = u;
  void _p;
  return rest;
}

export function currentRound() {
  return db.rounds.find((r) => r.id === 'r_cur')!;
}

export function refreshRound() {
  const r = currentRound();
  r.entryCount = r.entries.length;
  r.voterCount = new Set(r.votes.map((v) => v.userId)).size;
  for (const i of db.issues) {
    i.inCurrentRound = r.entries.includes(i.id);
    if (i.inCurrentRound) i.voteCount = r.votes.filter((v) => v.issueId === i.id).length;
  }
  return r;
}
refreshRound();

export function log(actorId: string, action: string, targetType: string, targetId: string, reason: string | null = null) {
  const u = db.users.find((x) => x.id === actorId)!;
  db.audit.unshift({ id: nextId('au'), at: now(), actor: { id: u.id, displayName: u.displayName }, action, targetType, targetId, reason });
}

export function randomPassword() {
  const a = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  return Array.from(crypto.getRandomValues(new Uint8Array(10)), (b) => a[b % a.length]).join('');
}

export { now, daysFrom };
