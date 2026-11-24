import { useRouter } from 'expo-router';
import { ActivityIndicator } from 'react-native';
import { Card } from '@/components/Card';
import { ListRow } from '@/components/ListRow';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { useMe } from '@/lib/hooks';
import { useSession } from '@/lib/session';
import { useTheme } from '@/theme';

// API: GET /me -> user, mahalla, rol, unreadNotifications
export default function ProfileScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { signOut } = useSession();
  const { data: me, loading, error, reload } = useMe();

  return (
    <Screen refreshing={loading} onRefresh={reload}>
      <Card>
        {error ? (
          <Text style={{ color: colors.danger }}>{error}</Text>
        ) : loading && !me ? (
          <ActivityIndicator color={colors.primary} />
        ) : me ? (
          <>
            <Text variant="heading">{me.user.displayName}</Text>
            <Text variant="muted">Mahalla: {me.mahalla.name}</Text>
            {me.user.phone ? <Text variant="muted">Telefon: {me.user.phone}</Text> : null}
          </>
        ) : null}
      </Card>

      <Card>
        <ListRow title="Mening muammolarim" onPress={() => router.push('/issues/mine')} />
        <ListRow title="Tadbirlar" onPress={() => router.push('/events')} />
        <ListRow title="E'lonlar" onPress={() => router.push('/announcements')} />
        <ListRow title="Oldingi ovoz davrlari" onPress={() => router.push('/rounds')} />
        <ListRow
          title="Bildirishnomalar"
          subtitle={me && me.unreadNotifications > 0 ? `${me.unreadNotifications} ta yangi` : undefined}
          onPress={() => router.push('/notifications')}
        />
      </Card>

      <Card>
        <ListRow title="Parolni almashtirish" onPress={() => router.push('/change-password')} />
        <ListRow title="Chiqish" destructive onPress={() => void signOut()} />
      </Card>
    </Screen>
  );
}
