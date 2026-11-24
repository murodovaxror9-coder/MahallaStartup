import { Stack } from 'expo-router';
import { useStackScreenOptions } from '@/lib/navigation';

export default function IssuesLayout() {
  return <Stack screenOptions={useStackScreenOptions()} />;
}
