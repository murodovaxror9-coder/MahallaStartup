import { Stack } from 'expo-router';
import { useStackScreenOptions } from '@/lib/navigation';

export default function EventsLayout() {
  return (
    <Stack screenOptions={useStackScreenOptions()}>
      <Stack.Screen name="index" options={{ title: 'Tadbirlar' }} />
      <Stack.Screen name="[id]" options={{ title: 'Tadbir' }} />
    </Stack>
  );
}
