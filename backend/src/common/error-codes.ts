/**
 * Barqaror xato kodlari. `code` — inglizcha va o'zgarmas, `message` — o'zbek lotin.
 * Yangi kod qo'shilsa README'dagi jadval ham yangilanadi.
 */
export const ERROR_CODES = {
  VALIDATION_ERROR: { status: 400, message: "So'rov ma'lumotlari noto'g'ri" },
  UNAUTHENTICATED: { status: 401, message: 'Tizimga kirish talab qilinadi' },
  INVALID_CREDENTIALS: { status: 401, message: "Login yoki parol noto'g'ri" },
  TEMP_PASSWORD_EXPIRED: {
    status: 401,
    message: 'Vaqtinchalik parol muddati tugagan. Mahalla adminiga murojaat qiling',
  },
  FORBIDDEN: { status: 403, message: "Bu amal uchun ruxsat yo'q" },
  PASSWORD_CHANGE_REQUIRED: { status: 403, message: 'Avval parolni almashtiring' },
  CSRF_INVALID: { status: 403, message: "Xavfsizlik tekshiruvidan o'tmadi. Sahifani yangilang" },
  NOT_FOUND: { status: 404, message: 'Topilmadi' },
  CONFLICT: { status: 409, message: 'Holat ziddiyati' },
  INVALID_STATUS_TRANSITION: { status: 409, message: "Bu holatga o'tkazib bo'lmaydi" },
  ROUND_CLOSED: { status: 409, message: 'Ovoz berish davri yopilgan' },
  ISSUE_NOT_VOTABLE: { status: 409, message: "Bu muammoga ovoz berib bo'lmaydi" },
  VOTE_LIMIT_REACHED: { status: 409, message: 'Bu oy uchun 3 ta ovozingizdan foydalandingiz' },
  FILE_TOO_LARGE: { status: 413, message: 'Fayl hajmi juda katta' },
  UNSUPPORTED_MEDIA_TYPE: { status: 415, message: "Fayl turi qo'llab-quvvatlanmaydi" },
  TOO_MANY_ATTEMPTS: {
    status: 429,
    message: "Juda ko'p urinish. Birozdan keyin qayta urinib ko'ring",
  },
  RATE_LIMITED: { status: 429, message: "Juda ko'p so'rov. Birozdan keyin qayta urinib ko'ring" },
  INTERNAL_ERROR: { status: 500, message: 'Serverda kutilmagan xato yuz berdi' },
  SERVICE_UNAVAILABLE: { status: 503, message: 'Xizmat vaqtincha ishlamayapti' },
} as const satisfies Record<string, { status: number; message: string }>;

export type ErrorCode = keyof typeof ERROR_CODES;
