/** Swagger/OpenAPI matnlari (o'zbek lotin). Manba: MAHALLADOSH_TZ_CLAUDE.md. */

export const API_DESCRIPTION = `
Mahalla aholisi (mobil ilova) va mahalla adminlari (veb-panel) uchun **yagona REST API**. Sana, ovozlar va holatlar bo'yicha manba — backend.

## Tez boshlash
1. **\`POST /auth/login\`** (\`client: "mobile"\`) — «Try it out» da tayyor misollar bor. Demo: aholi \`ali.yunusobod\`, admin \`admin.yunusobod\`, parol \`Demo12345!\` (\`pnpm db:seed:demo\`).
2. Javobdagi **\`token\`** ni sahifa tepasidagi **Authorize** tugmasiga kiriting.
3. Istalgan so'rovni sinang. Veb (cookie) rejimi brauzer ilovasi uchun: \`client: "web"\` + \`X-CSRF-Token\`.

## Rollar (TZ 2)
| Belgi | Ma'no |
| --- | --- |
| ochiq | kirish talab qilinmaydi |
| har qanday kirgan | aholi ham, admin ham |
| aholi | \`RESIDENT\` — o'z mahallasida post yuboradi, ovoz beradi, izoh/shikoyat qoldiradi, tadbirga yoziladi |
| admin | \`MAHALLA_ADMIN\` — faqat o'z mahallasida: akkaunt, moderatsiya, ish yuritish, tadbir va e'lon |

**Mahalla ID so'rovda yuborilmaydi** — sessiyadan olinadi. Boshqa mahalla obyekti (post, media, chat, tadbir, bildirishnoma, admin amali) ID orqali ham **\`404\`**.
Birinchi kirishda (vaqtinchalik parol) faqat \`GET /me\`, \`POST /auth/change-password\`, \`POST /auth/logout\` ishlaydi; qolgani \`403 PASSWORD_CHANGE_REQUIRED\`.

## Post holatlari (TZ 4)
| Tizim holati | Aholi ko'radigan yozuv (\`statusLabel\`) | Keyingi holat |
| --- | --- | --- |
| \`PENDING_REVIEW\` | Moderatsiyada | admin: \`OPEN\` / \`REJECTED\` / \`MERGED\` |
| \`REJECTED\` | Tuzatish kerak | muallif tahrirlab qayta yuboradi → \`PENDING_REVIEW\` |
| \`OPEN\` | Ochiq; joriy davrda bo'lsa **Ovoz berilmoqda** | faqat oy yakuni → \`SELECTED\` |
| \`SELECTED\` | Oylik ovozda tanlandi | admin → \`IN_PROGRESS\` (mas'ul, qadam, muddat majburiy) |
| \`IN_PROGRESS\` | Jarayonda | admin → \`REFERRED\` (tashkilot, sana, keyingi tekshiruv) yoki \`RESOLVED\` (yakun matni) |
| \`REFERRED\` | Tashkilotdan javob kutilmoqda | admin → \`IN_PROGRESS\` / \`RESOLVED\` |
| \`RESOLVED\` | Hal qilindi | admin → \`IN_PROGRESS\` (sabab majburiy); muallif fikr bildiradi |

\`MERGED\` — dublikat (asosiy postga bog'langan). Yashirish **status emas**: \`hidden\` belgisi. Ruxsat etilmagan o'tish → \`409 INVALID_STATUS_TRANSITION\`.

## Oylik ovoz (TZ 4)
- Davr — Toshkent (UTC+5) bo'yicha kalendar oy; vaqtlar UTC (ISO 8601). Har oy **3 ovoz**, postga **1 ovoz**; davr yopilguncha ovozni qaytarib olish mumkin.
- Xatolar: \`ROUND_CLOSED\`, \`ISSUE_NOT_VOTABLE\`, \`VOTE_LIMIT_REACHED\`. Takroriy so'rov ovozni ikki marta sanamaydi; parallel so'rovlar limitni buzmaydi.
- Oy yakuni **avtomatik** (idempotent): eng ko'p ovoz → \`SELECTED\`; teng bo'lsa ertaroq nashr qilingani, keyin kichik ID; ovoz yo'q → «Bu oy g'olib aniqlanmadi». Admin g'olibni almashtira olmaydi; davrni erta yopish API'da **yo'q**.

## Media (TZ 3, 8)
\`POST /media\` (multipart) → \`mediaId\`, keyin \`POST /issues { mediaIds }\`. Rasm JPEG/PNG/WebP ≤ 5 MB (HEIC → JPEG qilib yuboring), video MP4/QuickTime ≤ 25 MB; postga ≤ 3 rasm va ≤ 1 video. Server EXIF/GPS'ni o'chiradi. O'qish URL'lari **5 daqiqa** amal qiladi, yashirilgan post media'si oddiy foydalanuvchiga berilmaydi.

## Umumiy qoidalar
- **Xato formati**: \`{ "error": { "code", "message", "details" } }\`; \`message\` — o'zbek lotin; validatsiyada \`details.fields\`.
- **Sahifalash**: \`?cursor=&limit=\` (standart 20, ko'pi 50) → \`{ items, nextCursor }\` (\`null\` — tugagan).
- **Idempotentlik**: \`POST /issues\` — \`Idempotency-Key\` header; media — \`clientUploadId\`; chat — \`clientMessageId\`.
- **Tezlik chegaralari**: login IP bo'yicha 20/10 daq, bitta login 5 xato → 15 daq blok; umumiy 300/daq; post 10/soat; chat 30/daq; shikoyat 20/soat (\`429\` + \`Retry-After\`).
- **Realtime chat**: Socket.IO \`/chat\` (\`message:new\`, \`message:hidden\`); xabar yuborish REST orqali.
- **Push**: \`PUT /devices\`; \`data = { notificationId, type, entityType, entityId }\`.
`.trim();

export const TAG_DESCRIPTIONS: Record<string, string> = {
  Auth: 'TZ 2. Kirish (mobil token / veb cookie), vaqtinchalik parol, parol almashtirish, sessiya, qurilma tokeni.',
  'Bosh sahifa': 'TZ 6. Mobil bosh sahifa: ovoz muddati, g\'olib yoki jarayondagi muammo, navbatdagi tadbir, muhim e\'lon — bitta so\'rovda.',
  Muammolar: 'TZ 3. Post yuborish, lenta (toifa, holat, joriy oy, saralash), post sahifasi, izohlar, kuzatish, muallif fikri.',
  Ovoz: 'TZ 4. Oylik davr, 3 ovoz, ovozni qaytarish, davrlar tarixi va natija.',
  Media: 'TZ 3, 8. Rasm/video yuklash va qisqa muddatli o\'qish URL\'i.',
  Chat: 'TZ 5. Mahallaning bitta umumiy matnli chati (tarix, kursor, idempotent yuborish).',
  Shikoyatlar: 'TZ 3, 5. Aholi post, izoh yoki chat xabari ustidan shikoyat yuboradi.',
  Tadbirlar: 'TZ 5. Tadbirlar ro\'yxati, tafsiloti, «Qatnashaman».',
  "E'lonlar": 'TZ 5. E\'lonlar (nashr qilinganlar).',
  Bildirishnomalar: 'TZ 5. Ilova ichidagi bildirishnomalar, o\'qilmaganlar soni, o\'qilgan deb belgilash.',
  'Admin: aholi': 'TZ 2. Akkaunt yaratish (vaqtinchalik parol bir marta ko\'rsatiladi), parolni qayta chiqarish, bloklash.',
  'Admin: moderatsiya': 'TZ 3. Moderatsiya navbati, tasdiqlash/rad etish/birlashtirish, shikoyatlar, kontentni yashirish.',
  'Admin: muammolar': 'TZ 4. Ish yuritish: IN_PROGRESS → REFERRED → RESOLVED, mas\'ul/muddat o\'zgarishi, keyingi davrga o\'tkazish.',
  'Admin: davrlar': 'TZ 4. Davrlar va natijalar (g\'olibni qo\'lda almashtirish endpointi yo\'q).',
  'Admin: tadbirlar': 'TZ 5. Tadbir yaratish, nashr, tahrir, bekor qilish, yakunlash, qatnashchilar.',
  "Admin: e'lonlar": 'TZ 5. Qoralama, nashr (muhim e\'lon → bildirishnoma/push), o\'chirish.',
  Admin: 'TZ 6. Dashboard va amallar jurnali (audit).',
  Tizim: 'Liveness va readiness (prefikssiz).',
};

export const ROLE_TEXT: Record<string, string> = {
  public: 'ochiq (kirish shart emas)',
  user: 'har qanday kirgan foydalanuvchi (aholi yoki admin)',
  resident: 'aholi (`RESIDENT`)',
  admin: 'mahalla admini (`MAHALLA_ADMIN`)',
};
