import { Stack } from 'expo-router';
import { useStackScreenOptions } from '@/lib/navigation';

export default function NestedLayout() {
  return <Stack screenOptions={useStackScreenOptions()} />;
}
