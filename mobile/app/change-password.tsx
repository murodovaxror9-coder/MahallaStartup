import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { Button } from '@/components/Button';
import { Field } from '@/components/Field';
import { Icon } from '@/components/Icon';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { Header, Notice } from '@/components/ui';
import { api } from '@/lib/api';
import { errorText } from '@/lib/errors';
import { useSession } from '@/lib/session';
import { C } from '@/theme';

// API: POST /auth/change-password { currentPassword, newPassword }
export default function ChangePasswordScreen() {
  const router = useRouter();
  const { mustChangePassword, passwordChanged } = useSession();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const nextError = next.length > 0 && next.length < 8 ? 'Kamida 8 belgi bo‘lsin' : null;
  const confirmError = touched && confirm.length > 0 && confirm !== next ? 'Parollar mos kelmadi' : null;
  const valid = current.length > 0 && next.length >= 8 && confirm === next && next !== current;

  async function submit() {
    setTouched(true);
    if (next === current) return setError('Yangi parol eskisidan farq qilsin');
    if (!valid) return;
    setPending(true);
    setError(null);
    try {
      await api('/auth/change-password', { method: 'POST', json: { currentPassword: current, newPassword: next } });
      passwordChanged();
      if (router.canGoBack()) router.back();
      else router.replace('/');
    } catch (e) {
      setError(errorText(e));
    } finally {
      setPending(false);
    }
  }

  return (
    <Screen
      header={mustChangePassword ? null : <Header back />}
      footer={
        <>
          <Text variant="small" style={{ fontSize: 12 }}>
            Parol almashganda boshqa qurilmalardagi sessiyalar yopiladi.
          </Text>
          <Button title="Saqlash va davom etish" onPress={submit} loading={pending} disabled={!valid} />
        </>
      }
    >
      <View style={{ gap: 6, marginTop: mustChangePassword ? 32 : 4, marginBottom: 6 }}>
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            backgroundColor: C.primarySoft,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 10,
          }}
        >
          <Icon name="KeyRound" size={22} color={C.primary} />
        </View>
        <Text variant="h2" style={{ fontSize: 20 }}>
          {mustChangePassword ? 'Yangi parol o‘rnating' : 'Parolni almashtirish'}
        </Text>
        <Text style={{ fontSize: 14, color: C.ink2 }}>
          {mustChangePassword
            ? 'Bu birinchi kirish. Ilovaning boshqa bo‘limlari parol almashtirilgandan keyin ochiladi.'
            : 'Joriy parolingizni kiriting va yangisini o‘rnating.'}
        </Text>
      </View>

      <Field
        label={mustChangePassword ? 'Vaqtinchalik parol' : 'Joriy parol'}
        value={current}
        onChangeText={setCurrent}
        secureTextEntry
        autoComplete="current-password"
      />
      <Field
        label="Yangi parol"
        value={next}
        onChangeText={setNext}
        secureTextEntry
        autoComplete="new-password"
        error={nextError}
      />
      <Field
        label="Yangi parolni takrorlang"
        value={confirm}
        onChangeText={(v) => {
          setConfirm(v);
          setTouched(true);
        }}
        secureTextEntry
        autoComplete="new-password"
        error={confirmError}
      />
      {error ? <Notice tone="error">{error}</Notice> : null}
    </Screen>
  );
}
