# Mahalladosh

Mahalla aholisi muammolarni e’lon qiladi, ular uchun ovoz beradi va natijani kuzatadi. Mahalla admini esa ishni veb-panel orqali yuritadi. Topshiriq: `MAHALLADOSH_TZ_CLAUDE.md`.

| Papka | Egasi | Holat |
| --- | --- | --- |
| `apps/admin` | 1-kishi (frontend va dizayn) | Next.js panel. Backend tayyor bo‘lguncha mock API bilan ishlaydi. → [apps/admin/README.md](../apps/admin/README.md) |
| `apps/api` | 2-kishi (backend) | — |
| `apps/mobile` | 3-kishi (mobil) | — |
| `docs/api-contract.md` | backend tasdiqlaydi | Frontend taklif qilgan API shartnomasi |
| [docs/design/](design/README.md) | 1-kishi | Mobil uchun tokenlar, komponentlar, ekranlar va maketlar havolasi |

## Tez ishga tushirish (admin panel)

```bash
cd apps/admin
npm install
npm run dev   # http://localhost:3001
```

Backend tayyor bo‘lgach, `apps/admin/.env.local` fayliga `API_URL=http://localhost:3000` yozing. Shunda `/api/v1/*` so‘rovlari mock o‘rniga backendga boradi.

## Integratsiya bo‘yicha kelishuvlar

- Barcha so‘rovlar `/api/v1` ostida. Xato formati: `{ error: { code, message, fields? } }`.
- Veb sessiya `HttpOnly` cookie’da saqlanadi, CSRF uchun `md_csrf` cookie va `X-CSRF-Token` sarlavhasi ishlatiladi. Mobil ilova Bearer token oladi.
- Sahifalash: `?cursor=&limit=` → `{ items, nextCursor }`.
- Ovoz limiti, ruxsatlar va holat o‘tishlari faqat backendda tekshiriladi. UI ular asosida faqat kerakli tugmalarni ko‘rsatadi yoki yashiradi.
