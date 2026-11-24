import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EmptyState, ErrorState } from '@/components/EmptyState';
import { EventCard } from '@/components/EventCard';
import { Text } from '@/components/Text';
import { Segmented, Skeleton, Toast } from '@/components/ui';
import { api } from '@/lib/api';
import { errorText } from '@/lib/errors';
import { usePagedList } from '@/lib/hooks';
import type { EventItem } from '@/lib/types';
import { C } from '@/theme';

type Scope = 'upcoming' | 'past';

// API: GET /events?scope=upcoming|past&cursor   PUT|DELETE /events/:id/rsvp
export default function EventsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [scope, setScope] = useState<Scope>('upcoming');
  const { items, setItems, loading, loadingMore, error, hasMore, reload, loadMore } = usePagedList<EventItem>(
    `/events?scope=${scope}`,
  );
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const firstFocus = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (firstFocus.current) {
        firstFocus.current = false;
        return;
      }
      void reload();
    }, [reload]),
  );

  async function toggle(e: EventItem) {
    setPendingId(e.id);
    // Optimistik: son va holat darhol o'zgaradi, xato bo'lsa qaytadi
    const flip = (x: EventItem) =>
      x.id === e.id ? { ...x, myRsvp: !e.myRsvp, rsvpCount: Math.max(0, e.rsvpCount + (e.myRsvp ? -1 : 1)) } : x;
    setItems((prev) => prev.map(flip));
    try {
      await api(`/events/${e.id}/rsvp`, { method: e.myRsvp ? 'DELETE' : 'PUT' });
    } catch (err) {
      setItems((prev) => prev.map((x) => (x.id === e.id ? e : x)));
      setToast(errorText(err));
    } finally {
      setPendingId(null);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top }}>
      <View style={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: 12, gap: 12 }}>
        <Text variant="h1">Tadbirlar</Text>
        <Segmented<Scope>
          options={[
            { value: 'upcoming', label: 'Kelayotgan' },
            { value: 'past', label: 'O‘tgan' },
          ]}
          value={scope}
          onChange={setScope}
        />
      </View>

      {error && items.length === 0 ? (
        <ErrorState message={error} onRetry={reload} />
      ) : loading && items.length === 0 ? (
        <View style={{ padding: 16, paddingTop: 0 }}>
          <Skeleton count={3} height={120} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(e) => e.id}
          contentContainerStyle={{ padding: 16, paddingTop: 0, gap: 10, flexGrow: 1 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={async () => {
                setRefreshing(true);
                await reload();
                setRefreshing(false);
              }}
              tintColor={C.primary}
              colors={[C.primary]}
            />
          }
          onEndReached={hasMore ? loadMore : undefined}
          onEndReachedThreshold={0.4}
          ListEmptyComponent={
            <EmptyState
              icon="CalendarDays"
              title={scope === 'upcoming' ? 'Yaqin kunlarda tadbir yo‘q' : 'O‘tgan tadbirlar yo‘q'}
              hint="Mahalla tadbirlari shu yerda ko‘rinadi."
            />
          }
          ListFooterComponent={loadingMore ? <ActivityIndicator color={C.primary} style={{ marginVertical: 12 }} /> : undefined}
          renderItem={({ item }) => (
            <EventCard
              event={item}
              onPress={() => router.push(`/events/${item.id}`)}
              onToggle={() => toggle(item)}
              pending={pendingId === item.id}
            />
          )}
        />
      )}
      <Toast message={toast} tone="error" onHide={() => setToast(null)} />
    </View>
  );
}
