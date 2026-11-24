import { useLocalSearchParams } from 'expo-router';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';

// API: GET /events/:id   PUT|DELETE /events/:id/rsvp (idempotent; faqat PUBLISHED va kelajakdagi tadbir)
export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <Screen>
      <Text variant="title">Tadbir</Text>
      <Text variant="muted">#{id}</Text>

      <Card title="Ma'lumot">
        <Text variant="muted">Vaqt: —</Text>
        <Text variant="muted">Joy: —</Text>
        <Text variant="muted">Tashkilotchi: —</Text>
      </Card>

      <Card title="Tavsif">
        <Text variant="muted">Ma&apos;lumot yuklanmagan.</Text>
      </Card>

      <Button title="Qatnashaman" disabled />
    </Screen>
  );
}
