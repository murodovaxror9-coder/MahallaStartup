import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { Header } from '@/components/ui';
import { formatDate } from '@/lib/format';
import { useApi } from '@/lib/hooks';
import type { RoundResult } from '@/lib/types';
import { useTheme } from '@/theme';

// API: GET /rounds/:id/result -> winner, ranking (issueId, title, votes, rank), totalVoters, totalVotes
export default function RoundResultScreen() {
  const router = useRouter();
  const { colors, spacing } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: result, loading, error, reload } = useApi<RoundResult>(`/rounds/${id}/result`);

  if (loading && !result) {
    return (
      <Screen nav="profile" header={<Header back title="Ovoz natijasi" />}>
        <ActivityIndicator color={colors.primary} />
      </Screen>
    );
  }

  if (error || !result) {
    return (
      <Screen nav="profile" header={<Header back title="Ovoz natijasi" />}>
        <Text style={{ color: colors.danger }}>{error ?? 'Topilmadi'}</Text>
        <Button title="Qayta urinish" variant="secondary" onPress={reload} />
      </Screen>
    );
  }

  return (
    <Screen nav="profile" header={<Header back title="Ovoz natijasi" />} refreshing={false} onRefresh={reload}>
      <Text variant="muted">
        {formatDate(result.periodStart)} – {formatDate(result.periodEnd)}
      </Text>

      <Card title="G'olib">
        {result.winner ? (
          <>
            <Text>{result.winner.title}</Text>
            <Text variant="muted">{result.winner.votes} ta ovoz</Text>
            <Button
              title="Muammoni ko'rish"
              variant="secondary"
              onPress={() => router.push(`/issues/${result.winner?.issueId}`)}
            />
          </>
        ) : (
          <Text variant="muted">{result.message}</Text>
        )}
      </Card>

      <Card title="Reyting">
        {result.ranking.length === 0 ? (
          <Text variant="muted">Ma&apos;lumot yo&apos;q.</Text>
        ) : (
          result.ranking.map((r) => (
            <View key={r.issueId} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm }}>
              <Text>
                {r.rank}. {r.title}
              </Text>
              <Text variant="muted">{r.votes}</Text>
            </View>
          ))
        )}
        <Text variant="muted">
          Ovoz berganlar: {result.totalVoters} • Jami ovozlar: {result.totalVotes}
        </Text>
      </Card>
    </Screen>
  );
}
