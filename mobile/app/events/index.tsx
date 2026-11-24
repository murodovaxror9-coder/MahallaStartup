import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable } from 'react-native';
import { Button } from '@/components/Button';
import { Chips } from '@/components/Chips';
import { EmptyState } from '@/components/EmptyState';
import { Pill } from '@/components/Pill';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { formatDateTime } from '@/lib/format';
import { usePagedList } from '@/lib/hooks';
import type { EventItem } from '@/lib/types';
import { useTheme } from '@/theme';

const SCOPES = [
  { value: 'upcoming', label: 'Kelgusi' },
  { value: 'past', label: "O'tgan" },
];

// API: GET /events?scope=upcoming|past&cursor
export default function EventsScreen() {
  const router = useRouter();
  const { colors, spacing, radius } = useTheme();
  const [scope, setScope] = useState<string | null>('upcoming');
  const path = useMemo(() => `/events?scope=${scope ?? 'upcoming'}`, [scope]);
  const { items, loading, loadingMore, error, hasMore, reload, loadMore } = usePagedList<EventItem>(path);

  return (
    <Screen refreshing={loading} onRefresh={reload}>
      <Chips options={SCOPES} value={scope} onChange={setScope} allowAll={false} />

      {error ? (
        <Text style={{ color: colors.danger }}>{error}</Text>
      ) : loading ? (
        <ActivityIndicator color={colors.primary} />
      ) : items.length === 0 ? (
        <EmptyState title="Tadbirlar yo'q" hint="Mahalla tadbirlari shu yerda ko'rinadi." />
      ) : (
        items.map((e) => (
          <Pressable
            key={e.id}
            onPress={() => router.push(`/events/${e.id}`)}
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
            <Text variant="heading">{e.title}</Text>
            <Text variant="muted">
              {formatDateTime(e.startsAt)} • {e.location}
            </Text>
            <Text variant="muted">{e.rsvpCount} kishi qatnashadi</Text>
            {e.myRsvp ? <Pill label="Qatnashasiz" tone="success" /> : null}
            {e.status === 'CANCELLED' ? <Pill label="Bekor qilingan" tone="danger" /> : null}
          </Pressable>
        ))
      )}

      {hasMore && !loading ? (
        <Button title="Yana ko'rsatish" variant="secondary" onPress={loadMore} loading={loadingMore} />
      ) : null}
    </Screen>
  );
}
