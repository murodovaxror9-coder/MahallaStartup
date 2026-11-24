import { useRouter } from 'expo-router';
import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { Screen } from '@/components/Screen';

// API: GET /issues/mine?cursor  (statusLabel, rejectedReason, duplicateOf bilan)
export default function MyIssuesScreen() {
  const router = useRouter();

  return (
    <Screen>
      <EmptyState
        title="Siz hali muammo yubormagansiz"
        hint="Yuborgan muammolaringiz va ularning holati shu yerda ko'rinadi."
        actionTitle="Muammo yuborish"
        onAction={() => router.push('/issues/new')}
      />
      <Button title="Orqaga" variant="secondary" onPress={() => router.back()} />
    </Screen>
  );
}
