// O'zbekcha yorliqlar. TZ 4-bo'lim jadvali bilan solishtirib yakuniy matnlarni tasdiqlang.

export const ISSUE_STATUS_LABELS: Record<string, string> = {
  PENDING_REVIEW: "Ko'rib chiqilmoqda",
  OPEN: 'Ovoz berilmoqda',
  REJECTED: 'Rad etilgan',
  MERGED: 'Birlashtirilgan',
  SELECTED: 'Tanlangan',
  IN_PROGRESS: 'Jarayonda',
  REFERRED: 'Tashkilotga yuborilgan',
  RESOLVED: 'Hal qilingan',
};

export const CATEGORIES: Array<{ value: string; label: string }> = [
  { value: 'ROAD', label: "Yo'l" },
  { value: 'LIGHTING', label: 'Yoritish' },
  { value: 'WASTE', label: 'Chiqindi' },
  { value: 'WATER', label: 'Suv' },
  { value: 'LANDSCAPING', label: 'Obodonlashtirish' },
  { value: 'OTHER', label: 'Boshqa' },
];
