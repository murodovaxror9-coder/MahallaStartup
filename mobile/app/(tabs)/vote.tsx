import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator } from 'react-native';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { IssueRow } from '@/components/IssueRow';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { ApiError, api } from '@/lib/api';
import { countdown } from '@/lib/format';
import { useApi, usePagedList } from '@/lib/hooks';
import type { CurrentRoundData, IssueListItem } from '@/lib/types';
import { useTheme } from '@/theme';

// API: GET /rounds/current -> { round, periodStart, periodEnd, votesUsed, votesLeft, myVotes[] }
//      GET /issues?period=current&sort=top
//      PUT|DELETE /issues/:id/vote   (idempotent; 4-ovoz -> 409 VOTE_LIMIT_REACHED)
export default function VoteScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { data: round, reload: reloadRound } = useApi<CurrentRoundData>('/rounds/current');
  const { items, setItems, loading, error, reload, loadingMore, hasMore, loadMore } = usePagedList<IssueListItem>(
    '/issues?period=current&sort=top',
  );
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  async function toggleVote(item: IssueListItem) {
    setPendingId(item.id);
    setActionError(null);
    try {
      if (item.myVote) await api(`/issues/${item.id}/vote`, { method: 'DELETE' });
      else await api(`/issues/${item.id}/vote`, { method: 'PUT' });
      setItems((prev) =>
        prev.map((i) =>
          i.id === item.id
            ? { ...i, myVote: !i.myVote, voteCount: (i.voteCount ?? 0) + (i.myVote ? -1 : 1) }
            : i,
        ),
      );
      await reloadRound();
    } catch (e) {
      setActionError(e instanceof ApiError ? e.message : 'Kutilmagan xato yuz berdi');
    } finally {
      setPendingId(null);
    }
  }

  async function refreshAll() {
    await Promise.all([reload(), reloadRound()]);
  }

  return (
    <Screen refreshing={loading} onRefresh={refreshAll}>
      <Card title="Sizning ovozlaringiz">
        <Text variant="title">{round ? `${round.votesUsed} / 3` : '— / 3'}</Text>
        <Text variant="muted">
          Har oy 3 ta ovoz berasiz. Bitta muammoga bitta ovoz; ovozni qaytarib olish mumkin.
        </Text>
        <Text variant="muted">{round ? countdown(round.periodEnd) : 'Davr tugashiga: —'}</Text>
      </Card>

      {actionError ? <Text style={{ color: colors.danger }}>{actionError}</Text> : null}

      {error ? (
        <Text style={{ color: colors.danger }}>{error}</Text>
      ) : loading ? (
        <ActivityIndicator color={colors.primary} />
      ) : items.length === 0 ? (
        <EmptyState title="Ovoz berish uchun muammolar yo'q" hint="Tasdiqlangan muammolar shu yerda ko'rinadi." />
      ) : (
        items.map((item) => (
          <Card key={item.id}>
            <IssueRow item={item} onPress={() => router.push(`/issues/${item.id}`)} />
            <Button
              title={item.myVote ? 'Ovozni qaytarib olish' : 'Ovoz berish'}
              variant={item.myVote ? 'secondary' : 'primary'}
              loading={pendingId === item.id}
              disabled={!item.myVote && (round?.votesLeft ?? 0) <= 0}
              onPress={() => toggleVote(item)}
            />
          </Card>
        ))
      )}

      {hasMore && !loading ? (
        <Button title="Yana ko'rsatish" variant="secondary" onPress={loadMore} loading={loadingMore} />
      ) : null}

      <Button title="Oldingi davrlar" variant="secondary" onPress={() => router.push('/rounds')} />
    </Screen>
  );
}
