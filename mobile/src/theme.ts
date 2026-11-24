// Mahalladosh dizayn tokenlari (docs/design/tokens.ts) — maketlar bilan 1:1.

export const C = {
  bg: '#F6F3EC',
  surface: '#FFFFFF',
  surface2: '#EFEBE2',
  ink: '#1D2321',
  ink2: '#4A534F',
  muted: '#6B736F',
  line: '#DDD6C8',
  lineSoft: '#ECE6DA',
  primary: '#0E6B56',
  primaryPressed: '#0A5745',
  primarySoft: '#DCEDE6',
  primaryTint: '#EEF6F2',
  onPrimary: '#FFFFFF',
  focus: '#1D5FA8',
  danger: '#B42318',
  dangerBg: '#FBE4E1',
  warnFg: '#8A5A00',
  warnBg: '#F9EDCF',
  warnBorder: '#F1DFB0',
  heroBg: '#E9E2D0',
} as const;

export const F = {
  regular: 'GolosText_400Regular',
  medium: 'GolosText_500Medium',
  semibold: 'GolosText_600SemiBold',
  bold: 'GolosText_700Bold',
} as const;

export const STATUS = {
  PENDING_REVIEW: { fg: '#55606B', bg: '#E8EBEE', icon: 'Clock', label: 'Moderatsiyada' },
  REJECTED: { fg: '#A8321E', bg: '#F8E3DC', icon: 'PenLine', label: 'Tuzatish kerak' },
  OPEN: { fg: '#1D5FA8', bg: '#E1EBF7', icon: 'CircleDot', label: 'Ochiq' },
  VOTING: { fg: '#8A5A00', bg: '#F9EDCF', icon: 'Vote', label: 'Ovoz berilmoqda' },
  SELECTED: { fg: '#6A3FA0', bg: '#EEE5F8', icon: 'Trophy', label: 'Oylik ovozda tanlandi' },
  IN_PROGRESS: { fg: '#0E6B56', bg: '#DCEDE6', icon: 'Wrench', label: 'Jarayonda' },
  REFERRED: { fg: '#9A4A0B', bg: '#F7E6D6', icon: 'Send', label: 'Tashkilotdan javob kutilmoqda' },
  RESOLVED: { fg: '#1F6B2E', bg: '#DFF0E1', icon: 'CircleCheck', label: 'Hal qilindi' },
  MERGED: { fg: '#55606B', bg: '#E8EBEE', icon: 'Merge', label: 'Birlashtirilgan' },
} as const;

export type StatusKey = keyof typeof STATUS;

export const CATEGORY = {
  ROAD: { label: 'Yo‘l', icon: 'Construction' },
  LIGHTING: { label: 'Yoritish', icon: 'Lightbulb' },
  WASTE: { label: 'Chiqindi', icon: 'Trash2' },
  WATER: { label: 'Suv', icon: 'Droplet' },
  LANDSCAPING: { label: 'Obodonlashtirish', icon: 'Trees' },
  OTHER: { label: 'Boshqa', icon: 'CircleEllipsis' },
} as const;

export type CategoryKey = keyof typeof CATEGORY;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const radius = { sm: 6, md: 10, lg: 14, xl: 18, pill: 999 } as const;

/** Eski komponentlar bilan moslik uchun (rounds, edit va h.k.). */
const colors = {
  bg: C.bg,
  surface: C.surface,
  surfaceAlt: C.surface2,
  border: C.line,
  text: C.ink,
  muted: C.muted,
  primary: C.primary,
  primaryText: C.onPrimary,
  danger: C.danger,
  warning: C.warnFg,
  success: '#1F6B2E',
  info: C.focus,
};

export type Colors = typeof colors;

export function useTheme() {
  return { colors, spacing, radius };
}

/** API holati + joriy davr → dizayndagi badge kaliti. */
export function statusKey(status: string, statusLabel?: string): StatusKey {
  if (status === 'OPEN' && statusLabel === 'Ovoz berilmoqda') return 'VOTING';
  return (status in STATUS ? status : 'OPEN') as StatusKey;
}
