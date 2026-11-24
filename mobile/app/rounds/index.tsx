import { useRouter } from 'expo-router';
import { ActivityIndicator, Pressable } from 'react-native';
import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { Text } from '@/components/Text';
import { Header } from '@/components/ui';
import { Screen } from '@/components/Screen';
import { formatDate } from '@/lib/format';
import { usePagedList } from '@/lib/hooks';
import type { RoundSummary } from '@/lib/types';
import { useTheme } from '@/theme';

// API: GET /rounds?cursor
export default function RoundsScreen() {
  const router = useRouter();
  const { colors, spacing, radius } = useTheme();
  const { items, loading, loadingMore, error, hasMore, reload, loadMore } = usePagedList<RoundSummary>('/rounds');

  return (
    <Screen nav="profile" header={<Header back title="Ovoz natijalari" />} refreshing={false} onRefresh={reload}>
      {error ? (
        <Text style={{ color: colors.danger }}>{error}</Text>
      ) : loading ? (
        <ActivityIndicator color={colors.primary} />
      ) : items.length === 0 ? (
        <EmptyState title="Davrlar yo'q" hint="Yopilgan oylik davrlar va g'oliblar shu yerda ko'rinadi." />
      ) : (
        items.map((r) => (
          <Pressable
            key={r.id}
            onPress={() => router.push(`/rounds/${r.id}`)}
            style={({ pressed }) => ({
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderWidth: 1,
              borderRadius: radius.md,
              padding: spacing.md,
              gap: 2,
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Text variant="heading">
              {formatDate(r.periodStart)} – {formatDate(r.periodEnd)}
            </Text>
            <Text variant="muted">
              {r.status === 'OPEN' ? 'Ochiq' : r.winner ? `G'olib: ${r.winner.title}` : "G'olib aniqlanmadi"}
            </Text>
          </Pressable>
        ))
      )}

      {hasMore && !loading ? (
        <Button title="Yana ko'rsatish" variant="secondary" onPress={loadMore} loading={loadingMore} />
      ) : null}
    </Screen>
  );
}
