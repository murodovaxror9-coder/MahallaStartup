import { useLocalSearchParams } from 'expo-router';
import { AnnouncementCard } from '@/components/AnnouncementCard';
import { ErrorState } from '@/components/EmptyState';
import { Screen } from '@/components/Screen';
import { Header, Skeleton } from '@/components/ui';
import { useApi } from '@/lib/hooks';
import type { AnnouncementItem } from '@/lib/types';

// API: GET /announcements/:id
export default function AnnouncementDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, loading, error, reload } = useApi<AnnouncementItem>(`/announcements/${id}`);

  return (
    <Screen nav="home" header={<Header back title="E’lon" />} refreshing={false} onRefresh={reload}>
      {error && !data ? (
        <ErrorState message={error} onRetry={reload} />
      ) : !data ? (
        loading ? <Skeleton count={1} height={200} /> : null
      ) : (
        <AnnouncementCard item={data} />
      )}
    </Screen>
  );
}
