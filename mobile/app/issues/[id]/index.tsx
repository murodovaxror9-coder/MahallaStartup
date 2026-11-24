import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Field } from '@/components/Field';
import { ListRow } from '@/components/ListRow';
import { Pill } from '@/components/Pill';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';

// API: GET  /issues/:id -> media URL'lar, voteCount, myVote, isFollowing, statusLabel, tarix, duplicateOf, canVote
//      PUT|DELETE /issues/:id/vote        PUT|DELETE /issues/:id/follow
//      GET|POST   /issues/:id/comments    POST /issues/:id/feedback { type: CONFIRMED|STILL_ONGOING, comment, mediaIds[] }
//      POST /reports { targetType, targetId, reason }
export default function IssueDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [comment, setComment] = useState('');

  return (
    <Screen>
      <Text variant="title">Muammo</Text>
      <Pill label="—" />
      <Text variant="muted">#{id}</Text>

      <Card title="Tavsif">
        <Text variant="muted">Ma&apos;lumot yuklanmagan.</Text>
      </Card>

      <Card title="Foto va video">
        <Text variant="muted">Biriktirilgan media yo&apos;q.</Text>
      </Card>

      <Card title="Ovoz">
        <Text variant="muted">Ovozlar: —</Text>
        <Button title="Ovoz berish" disabled />
        <Button title="Kuzatish" variant="secondary" disabled />
      </Card>

      <Card title="Holat tarixi">
        <Text variant="muted">Hozircha yozuv yo&apos;q.</Text>
      </Card>

      <Card title="Muallif fikri">
        <Text variant="muted">
          Muammo hal qilingach, muallif natijani tasdiqlashi yoki hali davom etayotganini aytishi mumkin.
        </Text>
        <Button title="Tasdiqlayman" variant="secondary" disabled />
        <Button title="Hali davom etmoqda" variant="secondary" disabled />
      </Card>

      <Card title="Izohlar">
        <Text variant="muted">Izohlar yo&apos;q.</Text>
        <Field label="Izoh" value={comment} onChangeText={setComment} maxLength={1000} multiline />
        <Button title="Yuborish" disabled={!comment.trim()} />
      </Card>

      <Card>
        <ListRow title="Tahrirlash" onPress={() => router.push(`/issues/${id}/edit`)} />
        <ListRow title="Shikoyat qilish" destructive />
      </Card>
    </Screen>
  );
}
