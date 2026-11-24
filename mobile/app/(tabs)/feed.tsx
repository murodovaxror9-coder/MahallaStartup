import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Button } from '@/components/Button';
import { Chips } from '@/components/Chips';
import { EmptyState } from '@/components/EmptyState';
import { Screen } from '@/components/Screen';
import { CATEGORIES } from '@/lib/labels';

const SORTS = [
  { value: 'newest', label: 'Yangi' },
  { value: 'top', label: 'Eng ko‘p ovoz' },
];

// API: GET /issues?category&status&period=current&sort=newest|top&cursor
export default function FeedScreen() {
  const router = useRouter();
  const [sort, setSort] = useState<string | null>('newest');
  const [category, setCategory] = useState<string | null>(null);

  return (
    <Screen>
      <Chips options={SORTS} value={sort} onChange={setSort} allowAll={false} />
      <Chips options={CATEGORIES} value={category} onChange={setCategory} />
      <EmptyState
        title="Hozircha muammolar yo'q"
        hint="Mahalladagi muammolar shu yerda ko'rinadi."
      />
      <Button title="Muammo yuborish" onPress={() => router.push('/issues/new')} />
    </Screen>
  );
}
