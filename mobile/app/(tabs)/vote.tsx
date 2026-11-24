import { useRouter } from 'expo-router';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';

// API: GET /rounds/current -> { round, periodStart, periodEnd, votesUsed, votesLeft, myVotes[] }
//      GET /issues?period=current&sort=top
//      PUT|DELETE /issues/:id/vote   (idempotent; 4-ovoz -> 409 VOTE_LIMIT_REACHED)
export default function VoteScreen() {
  const router = useRouter();

  return (
    <Screen>
      <Card title="Sizning ovozlaringiz">
        <Text variant="title">0 / 3</Text>
        <Text variant="muted">
          Har oy 3 ta ovoz berasiz. Bitta muammoga bitta ovoz; ovozni qaytarib olish mumkin.
        </Text>
        <Text variant="muted">Davr tugashiga: —</Text>
      </Card>

      <EmptyState
        title="Ovoz berish uchun muammolar yo'q"
        hint="Tasdiqlangan muammolar shu yerda ko'rinadi."
      />

      <Button title="Oldingi davrlar" variant="secondary" onPress={() => router.push('/rounds')} />
    </Screen>
  );
}
