import { useRouter } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ListRow } from '@/components/ListRow';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { countdown, formatDateTime } from '@/lib/format';
import { useApi } from '@/lib/hooks';
import type { HomeData } from '@/lib/types';
import { useTheme } from '@/theme';

// API: GET /home -> { round: { periodEnd, votesLeft }, featuredIssue, nextEvent,
//                     latestImportantAnnouncement, unreadNotifications }  (bitta so'rov)
export default function HomeScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { data, loading, error, reload } = useApi<HomeData>('/home');

  return (
    <Screen refreshing={loading} onRefresh={reload}>
      {error ? (
        <Card>
          <Text style={{ color: colors.danger }}>{error}</Text>
          <Button title="Qayta urinish" variant="secondary" onPress={reload} />
        </Card>
      ) : !data ? (
        <ActivityIndicator color={colors.primary} />
      ) : (
        <>
          <Card title="Joriy ovoz berish davri">
            <Text variant="muted">{countdown(data.round.periodEnd)}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
              <Text variant="title">{data.round.votesLeft}</Text>
              <Text variant="muted">ta ovoz qoldi</Text>
            </View>
            <Button title="Ovoz berish" onPress={() => router.push('/vote')} />
          </Card>

          <Card title="Oy muammosi">
            {data.featuredIssue ? (
              <>
                <Text>{data.featuredIssue.title}</Text>
                <Text variant="muted">{data.featuredIssue.statusLabel}</Text>
                <Button
                  title="Ko'rish"
                  variant="secondary"
                  onPress={() => router.push(`/issues/${data.featuredIssue?.id}`)}
                />
              </>
            ) : (
              <Text variant="muted">G&apos;olib yoki jarayondagi muammo hali yo&apos;q.</Text>
            )}
          </Card>

          <Card title="Yaqin tadbir">
            {data.nextEvent ? (
              <>
                <Text>{data.nextEvent.title}</Text>
                <Text variant="muted">
                  {formatDateTime(data.nextEvent.startsAt)} • {data.nextEvent.location}
                </Text>
              </>
            ) : (
              <Text variant="muted">Rejalashtirilgan tadbir yo&apos;q.</Text>
            )}
            <Button title="Barcha tadbirlar" variant="secondary" onPress={() => router.push('/events')} />
          </Card>

          <Card title="Muhim e'lon">
            {data.latestImportantAnnouncement ? (
              <>
                <Text>{data.latestImportantAnnouncement.title}</Text>
                <Button
                  title="O'qish"
                  variant="secondary"
                  onPress={() => router.push(`/announcements/${data.latestImportantAnnouncement?.id}`)}
                />
              </>
            ) : (
              <Text variant="muted">Yangi muhim e&apos;lon yo&apos;q.</Text>
            )}
          </Card>

          <Card>
            <ListRow title="Muammo yuborish" onPress={() => router.push('/issues/new')} />
            <ListRow title="E'lonlar" onPress={() => router.push('/announcements')} />
            <ListRow
              title="Bildirishnomalar"
              subtitle={data.unreadNotifications > 0 ? `${data.unreadNotifications} ta yangi` : undefined}
              onPress={() => router.push('/notifications')}
            />
          </Card>
        </>
      )}
    </Screen>
  );
}
