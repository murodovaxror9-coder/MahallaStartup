import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Field } from '@/components/Field';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';

// Faqat PENDING_REVIEW / REJECTED holatdagi o'z postini tahrirlash mumkin.
// API: PATCH /issues/:id   POST /issues/:id/resubmit   DELETE /issues/:id (soft delete)
export default function EditIssueScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');

  return (
    <Screen>
      <Text variant="muted">#{id}</Text>

      <Card title="Rad etish sababi">
        <Text variant="muted">Agar post rad etilgan bo&apos;lsa, moderator sababi shu yerda ko&apos;rinadi.</Text>
      </Card>

      <Field label="Sarlavha" value={title} onChangeText={setTitle} maxLength={120} />
      <Field label="Tavsif" value={description} onChangeText={setDescription} maxLength={2000} multiline />
      <Field label="Joy" value={location} onChangeText={setLocation} maxLength={200} />

      <Button title="Saqlash" variant="secondary" />
      <Button title="Qayta yuborish" />
      <Button title="O'chirish" variant="danger" />
    </Screen>
  );
}
