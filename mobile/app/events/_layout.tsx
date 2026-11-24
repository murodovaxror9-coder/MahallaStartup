import { Stack } from 'expo-router';
import { useStackScreenOptions } from '@/lib/navigation';

export default function EventsLayout() {
  return <Stack screenOptions={useStackScreenOptions()} />;
}
