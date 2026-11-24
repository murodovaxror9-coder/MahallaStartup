# Mahalladosh: admin veb-panel (`apps/admin`)

Next.js 16 va TypeScript asosida qurilgan, mahalla admini uchun panel. Backend tayyor bo‘lmasa, ichki mock API bilan ishlaydi.

## Ishga tushirish

```bash
cd apps/admin
npm install
npm run dev          # http://localhost:3001
```

- `API_URL` bo‘sh bo‘lsa, `src/app/api/v1/[...path]/route.ts` dagi **mock API** ishlaydi. Ma’lumotlar xotirada saqlanadi va server qayta ishga tushganda seed holatiga qaytadi.
- Haqiqiy backend bilan ishlash uchun `.env.local` faylga `API_URL=http://localhost:3000` yozing. Shunda `/api/v1/*` so‘rovlari backendga proksi qilinadi va `HttpOnly` cookie bitta origin’da qoladi.

Mock demo akkauntlari `src/mock/db.ts` dagi `seed()` ichida. Admin logini — `admin.navruz`, parol shu faylda.

## Tekshiruvlar

```bash
npm run typecheck
npm run lint
npm test             # node:test, src/lib/rules.test.ts
npm run build
```

## Tuzilma

| Yo‘l | Vazifa |
| --- | --- |
| `src/lib/types.ts` | API turlari (`docs/api-contract.md` ga mos) |
| `src/lib/api.ts` | `fetch` o‘rami: CSRF sarlavhasi, xato formati, `useApi` va `useAction` hooklari |
| `src/lib/rules.ts` | holat matnlari, ruxsat etilgan admin amallari, Toshkent vaqtidagi sana formati |
| `src/components/ui.tsx` | Button, StatusBadge, Field, Modal, Loading, Empty va Error holatlari |
| `src/app/(panel)/*` | Umumiy ko‘rsatkichlar, Moderatsiya, Muammolar (+ tafsilot), Ovoz natijalari, Aholi, Tadbirlar, E’lonlar, Shikoyatlar, Amallar jurnali |
| `src/mock/db.ts`, `src/app/api/v1/[...path]` | Backend tayyor bo‘lguncha ishlatiladigan mock |

## Backend bilan kelishilishi kerak

- Mock’da sahifalash yo‘q (`nextCursor: null`), haqiqiy API’da esa cursor bo‘ladi. Ro‘yxatlarga «Yana yuklash» tugmasi hali qo‘shilmagan.
- Veb uchun CSRF: login `md_csrf` cookie qo‘yadi, panel esa uni `X-CSRF-Token` sarlavhasida qaytarib yuboradi.
- Davrni yopish faqat server buyrug‘i orqali bajariladi. Panelda bunday tugma yo‘q va bo‘lmasligi kerak.
