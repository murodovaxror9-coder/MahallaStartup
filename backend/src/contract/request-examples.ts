type Named = Record<string, { summary: string; value: unknown }>;

const ex = (summary: string, value: unknown) => ({ summary, value });

const UUID = '01a20ce9-f91f-76bf-82d6-6130350cba13';

/** Swagger'da «Try it out» da tanlanadigan tayyor so'rov misollari. Kalit: `METHOD /yo'l`. */
export const requestExamples: Record<string, Named> = {
  'POST /auth/login': {
    aholi: ex('Aholi (mobil)', { login: 'ali.yunusobod', password: 'Demo12345!', client: 'mobile' }),
    admin: ex('Admin (mobil token)', { login: 'admin.yunusobod', password: 'Demo12345!', client: 'mobile' }),
    veb: ex('Veb (cookie + CSRF)', { login: 'admin.yunusobod', password: 'Demo12345!', client: 'web' }),
    birinchi: ex('Birinchi kirish (vaqtinchalik parol → mustChangePassword: true)', { login: 'dilnoza.yunusobod', password: 'Temp12345!', client: 'mobile' }),
  },
  'POST /auth/change-password': { oddiy: ex('Yangi parol (kamida 8 belgi)', { currentPassword: 'Temp12345!', newPassword: 'YangiParol2026' }) },
  'PUT /devices': { expo: ex('Expo push token', { expoPushToken: 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]', platform: 'android' }) },
  'POST /issues': {
    chiroq: ex("Foto bilan post (avval POST /media, so'ng mediaIds)", {
      title: "Ko'cha chirog'i ishlamayapti",
      description: "Navoiy ko'chasi 12-uy yonidagi chiroq ikki haftadan beri yonmayapti, kechasi juda qorong'i.",
      category: 'LIGHTING',
      locationText: 'Navoiy ko‘chasi, 12-uy yonida',
      mediaIds: [],
    }),
  },
  'PATCH /issues/:id': { tahrir: ex('Rad etilgan postni tahrirlash', { title: 'Aniqroq sarlavha', locationText: 'Aniq manzil: Navoiy 12' }) },
  'POST /issues/:id/feedback': {
    tasdiq: ex('Natijani tasdiqlayman', { type: 'CONFIRMED', comment: 'Rahmat, chiroq ishlayapti', mediaIds: [] }),
    davom: ex('Muammo davom etmoqda', { type: 'STILL_ONGOING', comment: 'Chiroq yana o‘chib qoldi', mediaIds: [] }),
  },
  'POST /issues/:id/comments': { izoh: ex('Izoh (1–1000 belgi)', { text: "Men ham har kuni shu yerdan o'taman, juda qorong'i" }) },
  'POST /chat/messages': { xabar: ex('Xabar (idempotent: clientMessageId)', { text: "Assalomu alaykum, qo'shnilar!", clientMessageId: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d' }) },
  'POST /reports': {
    chat: ex('Chat xabariga shikoyat', { targetType: 'CHAT_MESSAGE', targetId: UUID, reason: 'Reklama xarakteridagi xabar' }),
    post: ex('Postga shikoyat', { targetType: 'POST', targetId: UUID, reason: "Yolg'on ma'lumot" }),
  },
  'POST /admin/residents': { yangi: ex('Aholi akkaunti (parol javobda BIR MARTA)', { displayName: 'Ali Valiyev', login: 'ali.valiyev', phone: '+998901234567' }) },
  'POST /admin/residents/:id/block': { blok: ex('Bloklash (sabab majburiy)', { reason: 'Qoidabuzarlik' }) },
  'POST /admin/issues/:id/reject': { rad: ex('Rad etish (sabab muallifga ko‘rinadi)', { reason: "Aniq manzil ko'rsatilmagan" }) },
  'POST /admin/issues/:id/merge': { dublikat: ex('Asosiy postga birlashtirish', { targetIssueId: UUID }) },
  'POST /admin/issues/:id/transition': {
    jarayon: ex('SELECTED → IN_PROGRESS', { toStatus: 'IN_PROGRESS', responsible: 'Elektr tarmoqlari xodimi Karimov', nextStep: 'Yangi lampochka olib kelish', dueDate: '2026-12-10' }),
    yuborildi: ex('IN_PROGRESS → REFERRED', { toStatus: 'REFERRED', referredOrg: 'Hokimlik', referredAt: '2026-12-02', followUpAt: '2026-12-09' }),
    hal: ex('→ RESOLVED (yakun matni + foto)', { toStatus: 'RESOLVED', resolutionText: 'Chiroq almashtirildi, hozir yonib turibdi', mediaIds: [] }),
    qayta: ex('RESOLVED → IN_PROGRESS (sabab majburiy)', { toStatus: 'IN_PROGRESS', reason: 'Muallif: muammo hali davom etmoqda' }),
  },
  'PATCH /admin/issues/:id/work': { muddat: ex("Mas'ul/muddat o'zgarishi (holat o'zgarmaydi)", { responsible: 'Vali Aliyev', dueDate: '2026-12-15', reason: "Mas'ul almashdi" }) },
  'POST /admin/reports/:id/hide': { yashir: ex('Kontentni yashirish', { reason: 'Qoidabuzarlik' }) },
  'POST /admin/reports/:id/dismiss': { rad: ex('Shikoyatni rad etish', { reason: 'Asossiz' }) },
  'POST /admin/content/:type/:id/hide': { yashir: ex('type: post | comment | chat_message', { reason: 'Nomaqbul kontent' }) },
  'POST /admin/events': {
    hashar: ex('Tadbir (DRAFT)', { title: 'Hashar: hovli tozalash', description: 'Mahalla hovlisini birgalikda tozalaymiz', startsAt: '2026-12-10T18:00:00+05:00', location: 'Markaziy hovli', organizer: 'Mahalla qo‘mitasi' }),
  },
  'PATCH /admin/events/:id': { vaqt: ex("Vaqt o'zgarishi (qatnashchilarga bildirishnoma)", { startsAt: '2026-12-11T18:00:00+05:00' }) },
  'POST /admin/events/:id/cancel': { bekor: ex('Bekor qilish', { reason: 'Ob-havo yomon' }) },
  'POST /admin/events/:id/complete': { yakun: ex('Natija matni va foto', { resultText: '25 kishi qatnashdi, hovli tozalandi', mediaIds: [] }) },
  'POST /admin/announcements': { muhim: ex("Muhim e'lon (nashrda push)", { title: "Ertaga suv o'chadi", body: "Ertaga soat 9 dan 14 gacha suv o'chiriladi", isImportant: true }) },
  'PATCH /admin/announcements/:id': { tahrir: ex('Tahrirlash', { title: "Yangilangan sarlavha" }) },
};
