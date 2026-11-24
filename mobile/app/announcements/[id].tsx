import { useLocalSearchParams } from 'expo-router';
import { ActivityIndicator } from 'react-native';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Pill } from '@/components/Pill';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { formatDate } from '@/lib/format';
import { useApi } from '@/lib/hooks';
import type { AnnouncementItem } from '@/lib/types';
import { useTheme } from '@/theme';

// API: GET /announcements/:id
export default function AnnouncementDetailScreen() {
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: announcement, loading, error, reload } = useApi<AnnouncementItem>(`/announcements/${id}`);

  if (loading && !announcement) {
    return (
      <Screen>
        <ActivityIndicator color={colors.primary} />
      </Screen>
    );
  }

  if (error || !announcement) {
    return (
      <Screen>
        <Text style={{ color: colors.danger }}>{error ?? 'Topilmadi'}</Text>
        <Button title="Qayta urinish" variant="secondary" onPress={reload} />
      </Screen>
    );
  }

  return (
    <Screen refreshing={loading} onRefresh={reload}>
      {announcement.isImportant ? <Pill label="Muhim" tone="warning" /> : null}
      <Text variant="title">{announcement.title}</Text>
      <Text variant="muted">
        {announcement.publishedAt ? formatDate(announcement.publishedAt) : 'Qoralama'}
      </Text>
      <Card>
        <Text>{announcement.body}</Text>
      </Card>
    </Screen>
  );
}
