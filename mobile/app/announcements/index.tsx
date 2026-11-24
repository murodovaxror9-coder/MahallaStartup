import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomNav } from '@/components/BottomNav';
import { AnnouncementCard } from '@/components/AnnouncementCard';
import { EmptyState, ErrorState } from '@/components/EmptyState';
import { Header, Skeleton } from '@/components/ui';
import { usePagedList } from '@/lib/hooks';
import type { AnnouncementItem } from '@/lib/types';
import { C } from '@/theme';

// API: GET /announcements?cursor
export default function AnnouncementsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { items, loading, loadingMore, error, hasMore, reload, loadMore } = usePagedList<AnnouncementItem>('/announcements');
  const [refreshing, setRefreshing] = useState(false);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top }}>
      <Header back title="E’lonlar" />
      {error && items.length === 0 ? (
        <ErrorState message={error} onRetry={reload} />
      ) : loading && items.length === 0 ? (
        <View style={{ padding: 16 }}>
          <Skeleton count={3} height={120} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(a) => a.id}
          contentContainerStyle={{ padding: 16, paddingTop: 4, gap: 10, flexGrow: 1 }}
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
          ListEmptyComponent={<EmptyState icon="Megaphone" title="E’lonlar yo‘q" hint="Mahalla e’lonlari shu yerda ko‘rinadi." />}
          ListFooterComponent={loadingMore ? <ActivityIndicator color={C.primary} style={{ marginVertical: 12 }} /> : undefined}
          renderItem={({ item }) => (
            <AnnouncementCard item={item} onPress={() => router.push(`/announcements/${item.id}`)} preview />
          )}
        />
      )}
      <BottomNav active="home" />
    </View>
  );
}
