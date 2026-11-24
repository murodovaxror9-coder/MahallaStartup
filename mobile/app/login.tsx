import { useState } from 'react';
import { View } from 'react-native';
import { Button } from '@/components/Button';
import { Field } from '@/components/Field';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { ApiError, api } from '@/lib/api';
import { useSession } from '@/lib/session';

// API: POST /auth/login { login, password, client: "mobile" } -> { token, user, mustChangePassword }
export default function LoginScreen() {
  const { signIn } = useSession();
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit() {
    setPending(true);
    setError(null);
    try {
      const res = await api<{ token: string; mustChangePassword: boolean }>('/auth/login', {
        method: 'POST',
        json: { login: login.trim().toLowerCase(), password, client: 'mobile' },
      });
      await signIn(res.token, res.mustChangePassword);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Kutilmagan xato yuz berdi');
    } finally {
      setPending(false);
    }
  }

  return (
    <Screen edges={['top', 'left', 'right', 'bottom']}>
      <View style={{ flex: 1, justifyContent: 'center', gap: 16 }}>
        <View style={{ gap: 4 }}>
          <Text variant="title">Mahalladosh</Text>
          <Text variant="muted">Mahalla admini bergan login va parol bilan kiring</Text>
        </View>
        <Field
          label="Login"
          value={login}
          onChangeText={setLogin}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="username"
        />
        <Field
          label="Parol"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="current-password"
          error={error}
        />
        <Button title="Kirish" onPress={submit} loading={pending} disabled={!login || !password} />
      </View>
    </Screen>
  );
}
