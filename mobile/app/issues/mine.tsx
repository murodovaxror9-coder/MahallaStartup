import { useRouter } from 'expo-router';
import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { IssueRow } from '@/components/IssueRow';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { Header, Skeleton } from '@/components/ui';
import { usePagedList } from '@/lib/hooks';
import type { IssueListItem } from '@/lib/types';
import { useTheme } from '@/theme';

// API: GET /issues/mine?cursor  (statusLabel, rejectedReason, duplicateOf bilan)
export default function MyIssuesScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { items, loading, loadingMore, error, hasMore, reload, loadMore } = usePagedList<IssueListItem>(
    '/issues/mine',
  );

  return (
    <Screen nav="profile" header={<Header back title="Mening postlarim" />} refreshing={false} onRefresh={reload}>
      {error ? (
        <Text style={{ color: colors.danger }}>{error}</Text>
      ) : loading && items.length === 0 ? (
        <Skeleton count={3} />
      ) : items.length === 0 ? (
        <EmptyState
          title="Siz hali muammo yubormagansiz"
          hint="Yuborgan muammolaringiz va ularning holati shu yerda ko'rinadi."
          actionTitle="Muammo yuborish"
          onAction={() => router.push('/issues/new')}
        />
      ) : (
        items.map((item) => (
          <IssueRow key={item.id} item={item} onPress={() => router.push(`/issues/${item.id}`)} />
        ))
      )}

      {hasMore && !loading ? (
        <Button title="Yana ko‘rsatish" variant="secondary" onPress={loadMore} loading={loadingMore} />
      ) : null}
    </Screen>
  );
}
