import { Stack } from 'expo-router';
import { useStackScreenOptions } from '@/lib/navigation';

export default function IssuesLayout() {
  return (
    <Stack screenOptions={useStackScreenOptions()}>
      <Stack.Screen name="new" options={{ title: 'Muammo yuborish' }} />
      <Stack.Screen name="mine" options={{ title: 'Mening muammolarim' }} />
      <Stack.Screen name="[id]/index" options={{ title: 'Muammo' }} />
      <Stack.Screen name="[id]/edit" options={{ title: 'Tahrirlash' }} />
    </Stack>
  );
}
