import { Link } from 'expo-router';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { Header } from '@/components/ui';

export default function NotFoundScreen() {
  return (
    <Screen header={<Header back title="Topilmadi" />}>
      <Text variant="heading">Sahifa topilmadi</Text>
      <Link href="/">
        <Text variant="label">Bosh sahifaga qaytish</Text>
      </Link>
    </Screen>
  );
}
