import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable } from 'react-native';
import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { Pill } from '@/components/Pill';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { api } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import { usePagedList } from '@/lib/hooks';
import type { NotificationItem } from '@/lib/types';
import { useTheme } from '@/theme';

const ENTITY_PATH: Record<string, string> = {
  ISSUE: '/issues',
  EVENT: '/events',
  ANNOUNCEMENT: '/announcements',
};

// API: GET /notifications?cursor   GET /notifications/unread-count
//      POST /notifications/:id/read   POST /notifications/read-all
// Push `data`: { notificationId, type, entityType, entityId } -> deep link (docs/FOR_CLIENTS.md)
export default function NotificationsScreen() {
  const router = useRouter();
  const { colors, spacing, radius } = useTheme();
  const { items, setItems, loading, loadingMore, error, hasMore, reload, loadMore } = usePagedList<NotificationItem>(
    '/notifications',
  );
  const [markingAll, setMarkingAll] = useState(false);

  async function markAllRead() {
    setMarkingAll(true);
    try {
      await api('/notifications/read-all', { method: 'POST' });
      setItems((prev) => prev.map((n) => ({ ...n, read: true, readAt: new Date().toISOString() })));
    } catch {
      // jim ignore qilinadi — ro'yxat baribir yangilanadi
    } finally {
      setMarkingAll(false);
    }
  }

  async function openNotification(n: NotificationItem) {
    if (!n.read) {
      setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
      api(`/notifications/${n.id}/read`, { method: 'POST' }).catch(() => undefined);
    }
    const base = ENTITY_PATH[n.entityType];
    if (base) router.push(`${base}/${n.entityId}`);
  }

  const anyUnread = items.some((n) => !n.read);

  return (
    <Screen refreshing={loading} onRefresh={reload}>
      <Button
        title="Hammasini o'qilgan deb belgilash"
        variant="secondary"
        onPress={markAllRead}
        loading={markingAll}
        disabled={!anyUnread}
      />

      {error ? (
        <Text style={{ color: colors.danger }}>{error}</Text>
      ) : loading ? (
        <ActivityIndicator color={colors.primary} />
      ) : items.length === 0 ? (
        <EmptyState
          title="Bildirishnomalar yo'q"
          hint="Muammo holati, tadbir va e'lonlar haqida xabarlar shu yerda."
        />
      ) : (
        items.map((n) => (
          <Pressable
            key={n.id}
            onPress={() => openNotification(n)}
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
            {!n.read ? <Pill label="Yangi" tone="info" /> : null}
            <Text variant="heading">{n.title}</Text>
            <Text variant="muted">{n.body}</Text>
            <Text variant="muted">{formatDateTime(n.createdAt)}</Text>
          </Pressable>
        ))
      )}

      {hasMore && !loading ? (
        <Button title="Yana ko'rsatish" variant="secondary" onPress={loadMore} loading={loadingMore} />
      ) : null}
    </Screen>
  );
}
