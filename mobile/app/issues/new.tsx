import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Chips } from '@/components/Chips';
import { Field } from '@/components/Field';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { ApiError, api, newKey } from '@/lib/api';
import { CATEGORIES } from '@/lib/labels';
import type { IssueDetail } from '@/lib/types';
import { useTheme } from '@/theme';

// API: POST /issues  (header Idempotency-Key)
//        { title 5-120, description 10-2000, category, locationText 3-200, mediaIds[] (<=3 rasm, <=1 video) }
// Rasm/video biriktirish: POST /media (multipart) — hali ulanmagan, keyingi bosqichda qo'shiladi.
export default function NewIssueScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  // Bir urinish = bitta kalit: tarmoq uzilib qayta yuborilsa dublikat yaratilmaydi
  const [idempotencyKey] = useState(newKey);

  const valid =
    title.trim().length >= 5 &&
    description.trim().length >= 10 &&
    location.trim().length >= 3 &&
    category !== null;

  async function submit() {
    if (!valid || !category) return;
    setPending(true);
    setError(null);
    try {
      await api<IssueDetail>('/issues', {
        method: 'POST',
        json: { title: title.trim(), description: description.trim(), category, locationText: location.trim(), mediaIds: [] },
        idempotencyKey,
      });
      router.replace('/issues/mine');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Kutilmagan xato yuz berdi');
    } finally {
      setPending(false);
    }
  }

  return (
    <Screen>
      <Field label="Sarlavha" value={title} onChangeText={setTitle} maxLength={120} hint="5–120 belgi" />
      <Field
        label="Tavsif"
        value={description}
        onChangeText={setDescription}
        maxLength={2000}
        multiline
        hint="10–2000 belgi"
      />
      <Field label="Joy" value={location} onChangeText={setLocation} maxLength={200} hint="Manzil yoki mo'ljal" />

      <Text variant="label">Toifa</Text>
      <Chips options={CATEGORIES} value={category} onChange={setCategory} allowAll={false} />

      <Card title="Foto va video">
        <Text variant="muted">
          Eng ko&apos;pi bilan 3 ta rasm (har biri 5 MB gacha) va 1 ta video (25 MB gacha).
        </Text>
        <Button title="Rasm qo'shish" variant="secondary" disabled />
      </Card>

      {error ? <Text style={{ color: colors.danger }}>{error}</Text> : null}
      <Text variant="muted">Muammo moderator tasdiqlagandan keyin ovoz berishga chiqadi.</Text>
      <Button title="Yuborish" onPress={submit} disabled={!valid} loading={pending} />
    </Screen>
  );
}
