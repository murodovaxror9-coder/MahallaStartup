import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomNav } from '@/components/BottomNav';
import { EmptyState, ErrorState } from '@/components/EmptyState';
import { Text } from '@/components/Text';
import { Header, Skeleton } from '@/components/ui';
import { api } from '@/lib/api';
import { formatRelative } from '@/lib/format';
import { usePagedList } from '@/lib/hooks';
import type { NotificationItem } from '@/lib/types';
import { C, F } from '@/theme';

const ENTITY_PATH: Record<string, string> = {
  ISSUE: '/issues',
  EVENT: '/events',
  ANNOUNCEMENT: '/announcements',
  ROUND: '/rounds',
};

// API: GET /notifications?cursor   POST /notifications/:id/read   POST /notifications/read-all
export default function NotificationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { items, setItems, loading, loadingMore, error, hasMore, reload, loadMore } =
    usePagedList<NotificationItem>('/notifications');
  const [refreshing, setRefreshing] = useState(false);

  const unread = items.filter((n) => !n.read).length;

  async function markAllRead() {
    const before = items;
    setItems((prev) => prev.map((n) => ({ ...n, read: true, readAt: n.readAt ?? new Date().toISOString() })));
    try {
      await api('/notifications/read-all', { method: 'POST' });
    } catch {
      setItems(before);
    }
  }

  function open(n: NotificationItem) {
    if (!n.read) {
      setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
      api(`/notifications/${n.id}/read`, { method: 'POST' }).catch(() => undefined);
    }
    const base = ENTITY_PATH[n.entityType];
    if (base) router.push(`${base}/${n.entityId}` as never);
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top }}>
      <Header back title="Bildirishnomalar" />
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 16,
          paddingVertical: 10,
          borderBottomWidth: 1,
          borderBottomColor: C.lineSoft,
        }}
      >
        <Text variant="small" style={{ color: C.ink2 }}>
          {unread > 0 ? `${unread} ta o‘qilmagan` : 'Hammasi o‘qilgan'}
        </Text>
        {unread > 0 ? (
          <Pressable onPress={markAllRead} hitSlop={8}>
            <Text style={{ fontSize: 13, fontFamily: F.semibold, color: C.primary }}>Hammasini o‘qildi deb belgilash</Text>
          </Pressable>
        ) : null}
      </View>

      {error && items.length === 0 ? (
        <ErrorState message={error} onRetry={reload} />
      ) : loading && items.length === 0 ? (
        <View style={{ padding: 16 }}>
          <Skeleton count={4} height={76} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(n) => n.id}
          contentContainerStyle={{ flexGrow: 1 }}
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
            <EmptyState icon="Bell" title="Bildirishnomalar yo‘q" hint="Muammo holati, tadbir va e’lonlar haqida xabarlar shu yerda." />
          }
          ListFooterComponent={loadingMore ? <ActivityIndicator color={C.primary} style={{ marginVertical: 12 }} /> : undefined}
          renderItem={({ item: n }) => (
            <Pressable
              onPress={() => open(n)}
              style={({ pressed }) => ({
                flexDirection: 'row',
                gap: 10,
                paddingHorizontal: 16,
                paddingVertical: 14,
                borderBottomWidth: 1,
                borderBottomColor: C.lineSoft,
                backgroundColor: pressed ? C.surface2 : n.read ? C.surface : C.primaryTint,
              })}
            >
              <View style={{ width: 8, paddingTop: 7 }}>
                {!n.read ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: C.primary }} /> : null}
              </View>
              <View style={{ flex: 1, gap: 3 }}>
                <Text style={{ fontSize: 15, lineHeight: 20, fontFamily: n.read ? F.medium : F.bold, color: C.ink }}>{n.title}</Text>
                <Text style={{ fontSize: 14, lineHeight: 20, color: C.ink2 }}>{n.body}</Text>
                <Text variant="small" style={{ fontSize: 12 }}>
                  {formatRelative(n.createdAt)}
                </Text>
              </View>
            </Pressable>
          )}
        />
      )}
      <BottomNav active="home" />
    </View>
  );
}
