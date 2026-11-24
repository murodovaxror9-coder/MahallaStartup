import { useTheme } from '@/theme';

/** Barcha Stack layout'lar uchun umumiy sarlavha uslubi. */
export function useStackScreenOptions() {
  const { colors } = useTheme();
  return {
    headerStyle: { backgroundColor: colors.surface },
    headerTintColor: colors.text,
    headerShadowVisible: false,
    contentStyle: { backgroundColor: colors.bg },
  };
}
