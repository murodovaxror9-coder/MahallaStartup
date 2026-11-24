// O'zbekcha yorliqlar: TZ 4-bo'lim jadvali («Aholi ko'radigan yozuv»).

export const ISSUE_STATUS_LABELS: Record<string, string> = {
  PENDING_REVIEW: 'Moderatsiyada',
  OPEN: 'Ovoz berilmoqda',
  REJECTED: 'Tuzatish kerak',
  MERGED: 'Birlashtirilgan',
  SELECTED: 'Oylik ovozda tanlandi',
  IN_PROGRESS: 'Jarayonda',
  REFERRED: 'Tashkilotdan javob kutilmoqda',
  RESOLVED: 'Hal qilingan',
};

export const CATEGORY_LABELS: Record<string, string> = {
  ROAD: "Yo'l",
  LIGHTING: 'Yoritish',
  WASTE: 'Chiqindi',
  WATER: 'Suv',
  LANDSCAPING: 'Obodonlashtirish',
  OTHER: 'Boshqa',
};

export const EVENT_STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Qoralama',
  PUBLISHED: 'Nashr qilingan',
  CANCELLED: 'Bekor qilingan',
  COMPLETED: 'Yakunlangan',
};

export const REPORT_STATUS_LABELS: Record<string, string> = {
  OPEN: 'Ochiq',
  ACTIONED: "Choralar ko'rilgan",
  DISMISSED: 'Rad etilgan',
};

export const REPORT_TARGET_LABELS: Record<string, string> = {
  POST: 'Muammo',
  COMMENT: 'Izoh',
  CHAT_MESSAGE: 'Chat xabari',
};
