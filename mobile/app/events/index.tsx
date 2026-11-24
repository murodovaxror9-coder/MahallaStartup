import { useState } from 'react';
import { Chips } from '@/components/Chips';
import { EmptyState } from '@/components/EmptyState';
import { Screen } from '@/components/Screen';

const SCOPES = [
  { value: 'upcoming', label: 'Kelgusi' },
  { value: 'past', label: "O'tgan" },
];

// API: GET /events?scope=upcoming|past&cursor
export default function EventsScreen() {
  const [scope, setScope] = useState<string | null>('upcoming');

  return (
    <Screen>
      <Chips options={SCOPES} value={scope} onChange={setScope} allowAll={false} />
      <EmptyState title="Tadbirlar yo'q" hint="Mahalla tadbirlari shu yerda ko'rinadi." />
    </Screen>
  );
}
