import { useRouter } from 'expo-router';
import { Card } from '@/components/Card';
import { ListRow } from '@/components/ListRow';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { useSession } from '@/lib/session';

// API: GET /me -> user, mahalla, rol, unreadNotifications
//      PUT /devices { expoPushToken, platform }  (push ruxsati berilgach)
export default function ProfileScreen() {
  const router = useRouter();
  const { signOut } = useSession();

  return (
    <Screen>
      <Card>
        <Text variant="heading">Foydalanuvchi</Text>
        <Text variant="muted">Mahalla: —</Text>
      </Card>

      <Card>
        <ListRow title="Mening muammolarim" onPress={() => router.push('/issues/mine')} />
        <ListRow title="Tadbirlar" onPress={() => router.push('/events')} />
        <ListRow title="E'lonlar" onPress={() => router.push('/announcements')} />
        <ListRow title="Oldingi ovoz davrlari" onPress={() => router.push('/rounds')} />
        <ListRow title="Bildirishnomalar" onPress={() => router.push('/notifications')} />
      </Card>

      <Card>
        <ListRow title="Parolni almashtirish" onPress={() => router.push('/change-password')} />
        <ListRow title="Chiqish" destructive onPress={() => void signOut()} />
      </Card>
    </Screen>
  );
}
