import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator } from 'react-native';
import { Button } from '@/components/Button';
import { Chips } from '@/components/Chips';
import { EmptyState } from '@/components/EmptyState';
import { IssueRow } from '@/components/IssueRow';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { usePagedList } from '@/lib/hooks';
import { CATEGORIES } from '@/lib/labels';
import type { IssueListItem } from '@/lib/types';
import { useTheme } from '@/theme';

const SORTS = [
  { value: 'newest', label: 'Yangi' },
  { value: 'top', label: "Eng ko'p ovoz" },
];

// API: GET /issues?category&status&period=current&sort=newest|top&cursor
export default function FeedScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [sort, setSort] = useState<string | null>('newest');
  const [category, setCategory] = useState<string | null>(null);

  const path = useMemo(() => {
    const params = new URLSearchParams({ sort: sort ?? 'newest' });
    if (category) params.set('category', category);
    return `/issues?${params.toString()}`;
  }, [sort, category]);

  const { items, loading, loadingMore, error, hasMore, reload, loadMore } = usePagedList<IssueListItem>(path);

  return (
    <Screen refreshing={loading} onRefresh={reload}>
      <Chips options={SORTS} value={sort} onChange={setSort} allowAll={false} />
      <Chips options={CATEGORIES} value={category} onChange={setCategory} />

      {error ? (
        <Text style={{ color: colors.danger }}>{error}</Text>
      ) : loading ? (
        <ActivityIndicator color={colors.primary} />
      ) : items.length === 0 ? (
        <EmptyState title="Hozircha muammolar yo'q" hint="Mahalladagi muammolar shu yerda ko'rinadi." />
      ) : (
        items.map((item) => (
          <IssueRow key={item.id} item={item} onPress={() => router.push(`/issues/${item.id}`)} />
        ))
      )}

      {hasMore && !loading ? (
        <Button title="Yana ko'rsatish" variant="secondary" onPress={loadMore} loading={loadingMore} />
      ) : null}

      <Button title="Muammo yuborish" onPress={() => router.push('/issues/new')} />
    </Screen>
  );
}
