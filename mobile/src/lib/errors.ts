import { ApiError } from './api';

/** Xato kodlari → foydalanuvchi matni (docs/design/README.md). */
const MESSAGES: Record<string, string> = {
  NETWORK_ERROR: 'Tarmoq bilan aloqa yo‘q. Internetni tekshirib, qayta urining.',
  VOTE_LIMIT_REACHED: 'Bu oy uchun 3 ta ovozingiz tugadi. Boshqa postga berish uchun birini qaytarib oling.',
  ROUND_CLOSED: 'Ovoz berish davri yopilgan.',
  FILE_TOO_LARGE: 'Rasm 5 MB, video 25 MB dan oshmasin.',
  UNSUPPORTED_MEDIA_TYPE: 'Faqat JPG, PNG, WEBP rasm yoki MP4, MOV video.',
  RATE_LIMITED: 'Juda ko‘p urinish. Birozdan keyin qayta urining.',
  TOO_MANY_ATTEMPTS: 'Juda ko‘p xato urinish. 15 daqiqadan keyin qayta urining.',
  INVALID_CREDENTIALS: 'Login yoki parol noto‘g‘ri',
};

export function errorText(e: unknown): string {
  if (e instanceof ApiError) {
    if (e.code === 'FORBIDDEN' && /blok/i.test(e.message)) return 'Akkaunt bloklangan. Mahalla admini bilan bog‘laning';
    return MESSAGES[e.code] ?? e.message;
  }
  return 'Kutilmagan xato yuz berdi';
}
