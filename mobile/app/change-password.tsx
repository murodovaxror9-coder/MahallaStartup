import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Button } from '@/components/Button';
import { Field } from '@/components/Field';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { ApiError, api } from '@/lib/api';
import { useSession } from '@/lib/session';

// API: POST /auth/change-password { currentPassword, newPassword }
export default function ChangePasswordScreen() {
  const router = useRouter();
  const { mustChangePassword, passwordChanged } = useSession();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit() {
    if (next.length < 8) return setError("Yangi parol kamida 8 belgidan iborat bo'lsin");
    if (next !== confirm) return setError('Parollar mos kelmadi');
    if (next === current) return setError('Yangi parol eskisidan farq qilsin');

    setPending(true);
    setError(null);
    try {
      await api('/auth/change-password', {
        method: 'POST',
        json: { currentPassword: current, newPassword: next },
      });
      passwordChanged();
      if (router.canGoBack()) router.back();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Kutilmagan xato yuz berdi');
    } finally {
      setPending(false);
    }
  }

  return (
    <Screen>
      {mustChangePassword ? (
        <Text variant="muted">
          Vaqtinchalik parol bilan kirdingiz. Davom etish uchun yangi parol o&apos;rnating.
        </Text>
      ) : null}
      <Field label="Joriy parol" value={current} onChangeText={setCurrent} secureTextEntry />
      <Field
        label="Yangi parol"
        hint="Kamida 8 belgi"
        value={next}
        onChangeText={setNext}
        secureTextEntry
      />
      <Field label="Yangi parolni takrorlang" value={confirm} onChangeText={setConfirm} secureTextEntry />
      {error ? <Text variant="muted">{error}</Text> : null}
      <Button title="Parolni saqlash" onPress={submit} loading={pending} />
    </Screen>
  );
}
