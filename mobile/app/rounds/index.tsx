import { EmptyState } from '@/components/EmptyState';
import { Screen } from '@/components/Screen';

// API: GET /rounds?cursor
export default function RoundsScreen() {
  return (
    <Screen>
      <EmptyState title="Davrlar yo'q" hint="Yopilgan oylik davrlar va g'oliblar shu yerda ko'rinadi." />
    </Screen>
  );
}
