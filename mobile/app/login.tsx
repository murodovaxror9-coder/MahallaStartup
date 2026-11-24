import { useRef, useState } from 'react';
import { TextInput, View } from 'react-native';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Field } from '@/components/Field';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { Notice } from '@/components/ui';
import { api } from '@/lib/api';
import { errorText } from '@/lib/errors';
import { useSession } from '@/lib/session';
import { C, F } from '@/theme';

// API: POST /auth/login { login, password, client: "mobile" } -> { token, user, mustChangePassword }
export default function LoginScreen() {
  const { signIn } = useSession();
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const passRef = useRef<React.ComponentRef<typeof TextInput>>(null);

  async function submit() {
    if (!login.trim() || !password || pending) return;
    setPending(true);
    setError(null);
    try {
      const res = await api<{ token: string; mustChangePassword: boolean }>('/auth/login', {
        method: 'POST',
        json: { login: login.trim().toLowerCase(), password, client: 'mobile' },
      });
      await signIn(res.token, res.mustChangePassword);
    } catch (e) {
      setError(errorText(e));
      setPending(false);
    }
  }

  return (
    <Screen
      footer={
        <Text variant="small" style={{ textAlign: 'center', fontSize: 12, paddingBottom: 6 }}>
          Akkauntni mahalla admini ochadi. Login va vaqtinchalik parolni admindan oling.
        </Text>
      }
    >
      <View style={{ gap: 6, marginTop: 40, marginBottom: 14 }}>
        <View
          style={{
            width: 52,
            height: 52,
            borderRadius: 14,
            backgroundColor: C.primary,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 12,
          }}
        >
          <Text style={{ color: C.onPrimary, fontFamily: F.bold, fontSize: 24, lineHeight: 28 }}>M</Text>
        </View>
        <Text variant="display">Mahalladosh</Text>
        <Text style={{ fontSize: 15, color: C.ink2 }}>Mahallangizdagi muammolarni birga hal qilamiz</Text>
      </View>

      <Card style={{ gap: 14, padding: 16 }}>
        <Field
          label="Login"
          value={login}
          onChangeText={setLogin}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="username"
          returnKeyType="next"
          onSubmitEditing={() => passRef.current?.focus()}
          placeholder="Loginingiz"
        />
        <Field
          ref={passRef}
          label="Parol"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="current-password"
          returnKeyType="go"
          onSubmitEditing={submit}
          placeholder="Parolingiz"
        />
        <Button title="Kirish" onPress={submit} loading={pending} disabled={!login.trim() || !password} />
      </Card>

      {error ? <Notice tone="error">{error}</Notice> : null}
    </Screen>
  );
}
