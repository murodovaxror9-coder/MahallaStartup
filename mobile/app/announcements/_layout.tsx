import { Stack } from 'expo-router';
import { useStackScreenOptions } from '@/lib/navigation';

export default function AnnouncementsLayout() {
  return (
    <Stack screenOptions={useStackScreenOptions()}>
      <Stack.Screen name="index" options={{ title: "E'lonlar" }} />
      <Stack.Screen name="[id]" options={{ title: "E'lon" }} />
    </Stack>
  );
}
