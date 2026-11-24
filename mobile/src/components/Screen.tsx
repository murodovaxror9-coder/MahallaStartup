import type { ReactNode } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';

interface ScreenProps {
  children: ReactNode;
  /** `false` bo'lsa ScrollView ishlatilmaydi (masalan, chat yoki FlatList uchun) */
  scroll?: boolean;
  edges?: Edge[];
  /** Tortib yangilash (pull-to-refresh) */
  refreshing?: boolean;
  onRefresh?: () => void;
}

export function Screen({
  children,
  scroll = true,
  edges = ['left', 'right', 'bottom'],
  refreshing,
  onRefresh,
}: ScreenProps) {
  const { colors, spacing } = useTheme();
  const body = <View style={{ padding: spacing.lg, gap: spacing.md, flexGrow: 1 }}>{children}</View>;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={edges}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            onRefresh ? (
              <RefreshControl refreshing={refreshing ?? false} onRefresh={onRefresh} tintColor={colors.primary} />
            ) : undefined
          }
        >
          {body}
        </ScrollView>
      ) : (
        <View style={{ flex: 1 }}>{children}</View>
      )}
    </SafeAreaView>
  );
}
