import { useLocalSearchParams } from 'expo-router';
import { Card } from '@/components/Card';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';

// API: GET /announcements/:id
export default function AnnouncementDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <Screen>
      <Text variant="muted">#{id}</Text>
      <Card>
        <Text variant="muted">E&apos;lon matni yuklanmagan.</Text>
      </Card>
    </Screen>
  );
}
