import { useLocalSearchParams } from 'expo-router';
import { Card } from '@/components/Card';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';

// API: GET /rounds/:id/result -> winner, snapshot (issueId, title, votes, rank), totalVoters, totalVotes
export default function RoundResultScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <Screen>
      <Text variant="muted">#{id}</Text>
      <Card title="G'olib">
        <Text variant="muted">G&apos;olib hali aniqlanmagan.</Text>
      </Card>
      <Card title="Reyting">
        <Text variant="muted">Ma&apos;lumot yo&apos;q.</Text>
      </Card>
    </Screen>
  );
}
