import { useRouter } from 'expo-router';
import { ActivityIndicator, Pressable } from 'react-native';
import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { Pill } from '@/components/Pill';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { formatDate } from '@/lib/format';
import { usePagedList } from '@/lib/hooks';
import type { AnnouncementItem } from '@/lib/types';
import { useTheme } from '@/theme';

// API: GET /announcements?cursor
export default function AnnouncementsScreen() {
  const router = useRouter();
  const { colors, spacing, radius } = useTheme();
  const { items, loading, loadingMore, error, hasMore, reload, loadMore } = usePagedList<AnnouncementItem>(
    '/announcements',
  );

  return (
    <Screen refreshing={loading} onRefresh={reload}>
      {error ? (
        <Text style={{ color: colors.danger }}>{error}</Text>
      ) : loading ? (
        <ActivityIndicator color={colors.primary} />
      ) : items.length === 0 ? (
        <EmptyState title="E'lonlar yo'q" hint="Mahalla e'lonlari shu yerda ko'rinadi." />
      ) : (
        items.map((a) => (
          <Pressable
            key={a.id}
            onPress={() => router.push(`/announcements/${a.id}`)}
            style={({ pressed }) => ({
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderWidth: 1,
              borderRadius: radius.md,
              padding: spacing.md,
              gap: spacing.xs,
              opacity: pressed ? 0.7 : 1,
            })}
          >
            {a.isImportant ? <Pill label="Muhim" tone="warning" /> : null}
            <Text variant="heading">{a.title}</Text>
            <Text variant="muted">{a.publishedAt ? formatDate(a.publishedAt) : 'Qoralama'}</Text>
          </Pressable>
        ))
      )}

      {hasMore && !loading ? (
        <Button title="Yana ko'rsatish" variant="secondary" onPress={loadMore} loading={loadingMore} />
      ) : null}
    </Screen>
  );
}
