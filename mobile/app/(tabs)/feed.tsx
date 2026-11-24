import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Chip } from '@/components/Chips';
import { EmptyState, ErrorState } from '@/components/EmptyState';
import { Icon } from '@/components/Icon';
import { IssueRow } from '@/components/IssueRow';
import { Text } from '@/components/Text';
import { OptionSheet, Skeleton } from '@/components/ui';
import { formatYmd, monthTitle } from '@/lib/format';
import { useApi, usePagedList } from '@/lib/hooks';
import type { CurrentRoundData, IssueListItem } from '@/lib/types';
import { C, CATEGORY, STATUS } from '@/theme';

const STATUS_FILTERS = ['OPEN', 'SELECTED', 'IN_PROGRESS', 'REFERRED', 'RESOLVED'] as const;

// API: GET /issues?category&status&period=current&sort=newest|top&cursor
//      GET /rounds/current (ovozlar soni)
export default function FeedScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ period?: string }>();
  const [current, setCurrent] = useState(true);
  const [sortTop, setSortTop] = useState(false);
  const [category, setCategory] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [sheet, setSheet] = useState<'category' | 'status' | null>(null);
  const listRef = useRef<FlatList<IssueListItem>>(null);

  // Bosh sahifadagi «Ovoz berish» → joriy oy filtri (har safar yangi navigatsiyada)
  const periodParam = params.period ?? '';
  const [seenPeriod, setSeenPeriod] = useState(periodParam);
  if (seenPeriod !== periodParam) {
    setSeenPeriod(periodParam);
    if (periodParam === 'current') {
      setCurrent(true);
      setStatus(null);
    }
  }

  const path = useMemo(() => {
    const q = new URLSearchParams({ sort: sortTop ? 'top' : 'newest' });
    if (current) q.set('period', 'current');
    if (category) q.set('category', category);
    if (status) q.set('status', status);
    return `/issues?${q.toString()}`;
  }, [sortTop, current, category, status]);

  const { items, loading, loadingMore, error, hasMore, reload, loadMore } = usePagedList<IssueListItem>(path);
  const { data: round, reload: reloadRound } = useApi<CurrentRoundData>('/rounds/current');
  const [refreshing, setRefreshing] = useState(false);

  const firstFocus = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (firstFocus.current) {
        firstFocus.current = false;
        return;
      }
      void reload();
      void reloadRound();
    }, [reload, reloadRound]),
  );

  async function refresh() {
    setRefreshing(true);
    await Promise.all([reload(), reloadRound()]);
    setRefreshing(false);
  }

  const summary =
    current && round
      ? `${monthTitle(round.periodEnd)} ovozi: ${items.length}${hasMore ? '+' : ''} ta post · sizda ${round.votesLeft} ta ovoz qoldi`
      : null;

  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 10, paddingBottom: 12 }}>
        <Text variant="h1" style={{ flex: 1 }}>
          Muammolar
        </Text>
        <Pressable
          onPress={() => router.push('/issues/new')}
          accessibilityRole="button"
          accessibilityLabel="Muammo yuborish"
          style={({ pressed }) => ({
            width: 48,
            height: 48,
            borderRadius: 24,
            backgroundColor: pressed ? C.primaryPressed : C.primary,
            alignItems: 'center',
            justifyContent: 'center',
            elevation: 3,
            shadowColor: C.primary,
            shadowOpacity: 0.3,
            shadowRadius: 6,
            shadowOffset: { width: 0, height: 2 },
          })}
        >
          <Icon name="Plus" size={24} color={C.onPrimary} strokeWidth={2.4} />
        </Pressable>
      </View>

      <View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}>
          <Chip label="Joriy oy" selected={current} onPress={() => setCurrent((v) => !v)} />
          <Chip
            label={category ? CATEGORY[category as keyof typeof CATEGORY].label : 'Toifa'}
            selected={!!category}
            dropdown
            onPress={() => setSheet('category')}
          />
          <Chip
            label={status ? STATUS[status as keyof typeof STATUS].label : 'Holat'}
            selected={!!status}
            dropdown
            onPress={() => setSheet('status')}
          />
          <Chip label="Ko‘p ovoz" selected={sortTop} onPress={() => setSortTop((v) => !v)} />
        </ScrollView>
      </View>

      {summary ? (
        <Text variant="small" style={{ color: C.ink2, paddingHorizontal: 16, paddingTop: 12 }}>
          {summary}
        </Text>
      ) : null}

      {error && items.length === 0 ? (
        <ErrorState message={error} onRetry={reload} />
      ) : loading && items.length === 0 ? (
        <View style={{ padding: 16 }}>
          <Skeleton count={4} />
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={items}
          keyExtractor={(i) => i.id}
          contentContainerStyle={{ padding: 16, paddingTop: 10, gap: 10, flexGrow: 1 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={C.primary} colors={[C.primary]} />}
          onEndReached={hasMore ? loadMore : undefined}
          onEndReachedThreshold={0.4}
          ListEmptyComponent={
            <EmptyState
              title={current ? 'Bu oy hali muammo yo‘q' : 'Muammolar topilmadi'}
              hint="Mahallangizdagi muammoni birinchi bo‘lib yuboring."
              actionTitle="Muammo yuborish"
              onAction={() => router.push('/issues/new')}
            />
          }
          ListFooterComponent={loadingMore ? <ActivityIndicator color={C.primary} style={{ marginVertical: 12 }} /> : undefined}
          renderItem={({ item }) => (
            <IssueRow
              item={item}
              onPress={() => router.push(`/issues/${item.id}`)}
              rightNote={
                item.status === 'IN_PROGRESS' || item.status === 'REFERRED'
                  ? item.dueDate
                    ? `Muddat: ${formatYmd(item.dueDate)}`
                    : undefined
                  : undefined
              }
            />
          )}
        />
      )}

      <OptionSheet
        visible={sheet === 'category'}
        title="Toifa"
        value={category}
        options={[
          { value: null, label: 'Hammasi' },
          ...Object.entries(CATEGORY).map(([k, v]) => ({ value: k, label: v.label, icon: v.icon })),
        ]}
        onSelect={(v) => setCategory(v)}
        onClose={() => setSheet(null)}
      />
      <OptionSheet
        visible={sheet === 'status'}
        title="Holat"
        value={status}
        options={[
          { value: null, label: 'Hammasi' },
          ...STATUS_FILTERS.map((k) => ({ value: k, label: STATUS[k].label, icon: STATUS[k].icon })),
        ]}
        onSelect={(v) => {
          setStatus(v);
          if (v && v !== 'OPEN') setCurrent(false);
        }}
        onClose={() => setSheet(null)}
      />
    </View>
  );
}
