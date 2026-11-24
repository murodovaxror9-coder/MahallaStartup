import { useRouter } from 'expo-router';
import { View } from 'react-native';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ListRow } from '@/components/ListRow';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';

// API: GET /home -> { round: { periodEnd, votesLeft }, featuredIssue, nextEvent,
//                     latestImportantAnnouncement, unreadNotifications }  (bitta so'rov)
export default function HomeScreen() {
  const router = useRouter();

  return (
    <Screen>
      <Card title="Joriy ovoz berish davri">
        <Text variant="muted">Davr tugashiga: —</Text>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
          <Text variant="title">3</Text>
          <Text variant="muted">ta ovoz qoldi</Text>
        </View>
        <Button title="Ovoz berish" onPress={() => router.push('/vote')} />
      </Card>

      <Card title="Oy muammosi">
        <Text variant="muted">G&apos;olib yoki jarayondagi muammo shu yerda ko&apos;rinadi.</Text>
      </Card>

      <Card title="Yaqin tadbir">
        <Text variant="muted">Rejalashtirilgan tadbir yo&apos;q.</Text>
        <Button title="Barcha tadbirlar" variant="secondary" onPress={() => router.push('/events')} />
      </Card>

      <Card title="Muhim e'lon">
        <Text variant="muted">Yangi muhim e&apos;lon yo&apos;q.</Text>
      </Card>

      <Card>
        <ListRow title="Muammo yuborish" onPress={() => router.push('/issues/new')} />
        <ListRow title="E'lonlar" onPress={() => router.push('/announcements')} />
        <ListRow title="Bildirishnomalar" onPress={() => router.push('/notifications')} />
      </Card>
    </Screen>
  );
}
