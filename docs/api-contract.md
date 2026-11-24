# Mahalladosh API shartnomasi — frontend taklifi (qoralama)

> Shartnoma egasi — backend (2-kishi). Bu hujjatni admin panel va mobil ilova qaysi so‘rovlarga tayanayotganini kelishib olish uchun frontend yozdi. Backend OpenAPI chiqargach, manba o‘sha bo‘ladi. Maydonlar turlari: `apps/admin/src/lib/types.ts`.

## Umumiy qoidalar

| Mavzu | Kelishuv |
| --- | --- |
| Asosiy yo‘l | `/api/v1` |
| Vaqt | ISO 8601, UTC (`2026-11-30T19:00:00.000Z`). Ko‘rsatishda `Asia/Tashkent`. |
| Veb sessiya | `POST /auth/login` `md_session` cookie qo‘yadi (`HttpOnly`, `SameSite=Lax`, prod’da `Secure`). |
| CSRF (veb) | Login `md_csrf` cookie qo‘yadi (HttpOnly emas). Veb klient GET’dan boshqa har so‘rovda `X-CSRF-Token: <md_csrf>` yuboradi. |
| Mobil sessiya | `client: "mobile"` bilan login javobida `token` keladi, keyin `Authorization: Bearer <token>`. |
| Mahalla | URL’da mahalla ID yo‘q. Mahalla sessiyadan olinadi. Boshqa mahalla obyekti → `404`. |
| Sahifalash | `?cursor=&limit=20` → `{ "items": [...], "nextCursor": "..." \| null }` |
| Idempotentlik | Post yaratish, ovoz va media yuklashda `Idempotency-Key: <uuid>` sarlavhasi. Bir xil kalit bilan qayta yuborilgan so‘rov o‘sha natijani qaytaradi. |
| Xato | `{ "error": { "code": "VOTE_LIMIT", "message": "Bu oy uchun ovozlar tugadi", "fields": { "title": "Majburiy" } } }` |

Xato kodlari: `UNAUTHENTICATED` 401, `PASSWORD_CHANGE_REQUIRED` 403, `FORBIDDEN` 403, `NOT_FOUND` 404, `VALIDATION` 422, `CONFLICT` 409, `INVALID_STATE` 409, `VOTE_LIMIT` 409, `ROUND_CLOSED` 409, `RATE_LIMITED` 429, `FILE_TOO_LARGE` 413, `UNSUPPORTED_MEDIA` 415.

`mustChangePassword: true` bo‘lsa, `/auth/*` va `GET /me` dan boshqa so‘rovlar `403 PASSWORD_CHANGE_REQUIRED` qaytaradi.

## Auth va akkauntlar

| So‘rov | Rol | Kirish | Javob |
| --- | --- | --- | --- |
| `POST /auth/login` | — | `{ login, password, client: "web"\|"mobile" }` | `{ me: Me, token? }` · 401 `INVALID_CREDENTIALS`, 403 `BLOCKED`, 429 |
| `POST /auth/change-password` | har kim | `{ currentPassword, newPassword }` (≥ 8 belgi) | `{ me: Me }`. Boshqa sessiyalar bekor qilinadi. |
| `POST /auth/logout` | har kim | — | `204` |
| `GET /me` | har kim | — | `Me` |
| `GET /admin/users?q=&status=` | ADMIN | — | `Page<UserRow>` |
| `POST /admin/users` | ADMIN | `{ displayName, login, phone? }` | `TempPassword` (parol faqat shu javobda) · 409 `LOGIN_TAKEN` |
| `POST /admin/users/:id/reset-password` | ADMIN | — | `TempPassword`. Faol sessiyalar bekor. |
| `POST /admin/users/:id/block` | ADMIN | `{ reason }` | `UserRow`. Faol sessiyalar bekor. |
| `POST /admin/users/:id/unblock` | ADMIN | — | `UserRow` |

## Muammolar va media

| So‘rov | Rol | Kirish | Javob |
| --- | --- | --- | --- |
| `POST /media` | RESIDENT, ADMIN | multipart `file`; rasm ≤ 5 MB (jpeg/png/webp/heic), video ≤ 25 MB (mp4/mov) | `Media` (EXIF GPS olib tashlangan) |
| `GET /issues?status=&category=&period=current&sort=new\|votes` | har kim | — | `Page<IssueSummary>` (yashirinlar faqat ADMIN’ga) |
| `GET /issues/:id` | har kim | — | `IssueDetail` (+ mobil uchun `myVote`, `following`) |
| `POST /issues` | RESIDENT | `{ title, description, category, locationText, mediaIds[] }` + `Idempotency-Key` | `IssueDetail` (`PENDING_REVIEW`) |
| `PATCH /issues/:id` | muallif | `REJECTED` holatda tahrir va qayta yuborish | `IssueDetail` |
| `POST /issues/:id/feedback` | muallif | `{ confirmed: boolean, note?, mediaIds[] }` (`RESOLVED` da) | `IssueDetail` |
| `GET /admin/moderation` | ADMIN | — | `Page<IssueDetail>` (`PENDING_REVIEW`, eskisi birinchi) |
| `POST /admin/issues/:id/approve` | ADMIN | — | `IssueDetail` → `OPEN` + joriy davr |
| `POST /admin/issues/:id/reject` | ADMIN | `{ reason }` | `IssueDetail` → `REJECTED` |
| `POST /admin/issues/:id/merge` | ADMIN | `{ primaryIssueId }` | faqat `PENDING_REVIEW` da |
| `POST /admin/issues/:id/status` | ADMIN | `StatusChange` (pastda) | `IssueDetail` · 409 `INVALID_STATE` |
| `POST /admin/issues/:id/carry-over` | ADMIN | — | `OPEN` va joriy davrda bo‘lmasa, 0 ovoz bilan joriy davrga |

`StatusChange`:
- `{ status: "IN_PROGRESS", responsible, nextStep, dueDate, reason? }` — muddat o‘zgarsa yoki `RESOLVED`dan qaytarilsa `reason` majburiy.
- `{ status: "REFERRED", organization, referredAt, followUpAt, reason? }`
- `{ status: "RESOLVED", resolutionText, mediaIds[] }`

Ruxsat etilgan o‘tishlar: `SELECTED → IN_PROGRESS | REFERRED`, `IN_PROGRESS → IN_PROGRESS | REFERRED | RESOLVED`, `REFERRED → IN_PROGRESS | RESOLVED`, `RESOLVED → IN_PROGRESS`.

## Ovoz davrlari

| So‘rov | Rol | Javob |
| --- | --- | --- |
| `GET /rounds/current` | har kim | `Round` (+ RESIDENT uchun `votesLeft`) |
| `GET /rounds` | har kim | `Page<Round>` (yangi birinchi, yopilganlarda `result`) |
| `POST /issues/:id/vote` | RESIDENT | `{ voteCount, votesLeft }` · 409 `VOTE_LIMIT` / `ROUND_CLOSED` / `INVALID_STATE`. Takroriy so‘rov — o‘sha javob. |
| `DELETE /issues/:id/vote` | RESIDENT | `{ voteCount, votesLeft }` |

Davrni yopish faqat server buyrug‘i/vazifasi. Admin va aholi API’sida yopish so‘rovi yo‘q.

## Izoh, chat, shikoyat

| So‘rov | Rol | Kirish / javob |
| --- | --- | --- |
| `GET /issues/:id/comments`, `POST` | har kim | `{ body }` |
| `GET /chat/messages?after=<id>` / `?before=<id>` | har kim | `Page<ChatMessage>` |
| `POST /chat/messages` | har kim | `{ body, clientId }`. `clientId` dublikatdan saqlaydi. |
| `POST /reports` | RESIDENT | `{ targetType, targetId, reason }` |
| `GET /admin/reports?status=OPEN` | ADMIN | `Page<Report>` |
| `POST /admin/reports/:id/hide` | ADMIN | `{ reason }` — kontent va media yashiriladi |
| `POST /admin/reports/:id/dismiss` | ADMIN | `{ reason? }` |

## Tadbirlar va e’lonlar

| So‘rov | Rol | Kirish / javob |
| --- | --- | --- |
| `GET /events` | har kim | `Page<EventItem>` (ADMIN qoralamalarni ham ko‘radi) |
| `POST /admin/events` | ADMIN | `{ title, description, startsAt, location, organizer, publish }` |
| `PATCH /admin/events/:id` | ADMIN | o‘sha maydonlar; vaqt/joy o‘zgarsa qatnashchilarga xabar |
| `POST /admin/events/:id/cancel` | ADMIN | `{ reason }` → qatnashchilarga xabar |
| `POST /admin/events/:id/result` | ADMIN | `{ resultText, mediaIds[] }` → `COMPLETED` |
| `POST /events/:id/rsvp`, `DELETE` | RESIDENT | `{ rsvpCount, going }` |
| `GET /admin/announcements` | ADMIN | `Page<Announcement>` |
| `POST /admin/announcements` | ADMIN | `{ title, body, important }` → `DRAFT` |
| `PATCH /admin/announcements/:id` | ADMIN | faqat `DRAFT` |
| `POST /admin/announcements/:id/publish` | ADMIN | `important` bo‘lsa push |
| `GET /announcements` | har kim | `Page<Announcement>` (faqat nashr qilinganlar) |

## Bildirishnomalar

| So‘rov | Kirish / javob |
| --- | --- |
| `GET /notifications` | `Page<{ id, type, title, body, target: { type: "ISSUE"\|"EVENT"\|"ANNOUNCEMENT", id }, readAt, createdAt }>` + `unreadCount` |
| `POST /notifications/:id/read`, `POST /notifications/read-all` | `204` |
| `POST /devices` | `{ expoPushToken, platform }` |

## Admin dashboard va jurnal

| So‘rov | Javob |
| --- | --- |
| `GET /admin/dashboard` | `Dashboard` |
| `GET /admin/audit?action=` | `Page<AuditEvent>` |
