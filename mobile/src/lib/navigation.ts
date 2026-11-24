import { C } from '@/theme';

/** Barcha Stack layout'lar: sarlavhani har bir ekran o'zi chizadi (maketlardagi kabi). */
export function useStackScreenOptions() {
  return {
    headerShown: false,
    contentStyle: { backgroundColor: C.bg },
    animation: 'slide_from_right' as const,
  };
}
