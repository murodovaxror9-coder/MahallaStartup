import { EmptyState } from '@/components/EmptyState';
import { Screen } from '@/components/Screen';

// API: GET /announcements?cursor
export default function AnnouncementsScreen() {
  return (
    <Screen>
      <EmptyState title="E'lonlar yo'q" hint="Mahalla e'lonlari shu yerda ko'rinadi." />
    </Screen>
  );
}
