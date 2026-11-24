import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { useStackScreenOptions } from '@/lib/navigation';
import { SessionProvider, useSession } from '@/lib/session';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

function RootStack() {
  const { status, mustChangePassword } = useSession();
  const screenOptions = useStackScreenOptions();
  const signedIn = status === 'signedIn';

  useEffect(() => {
    if (status !== 'loading') SplashScreen.hideAsync().catch(() => undefined);
  }, [status]);

  return (
    <Stack screenOptions={screenOptions}>
      {/* Parol almashtirish: vaqtinchalik parol bilan kirganda majburiy, keyin profil orqali ixtiyoriy */}
      <Stack.Protected guard={signedIn}>
        <Stack.Screen name="change-password" options={{ title: 'Parolni almashtirish' }} />
      </Stack.Protected>

      <Stack.Protected guard={signedIn && !mustChangePassword}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="issues" options={{ headerShown: false }} />
        <Stack.Screen name="rounds" options={{ headerShown: false }} />
        <Stack.Screen name="events" options={{ headerShown: false }} />
        <Stack.Screen name="announcements" options={{ headerShown: false }} />
        <Stack.Screen name="notifications" options={{ title: 'Bildirishnomalar' }} />
      </Stack.Protected>

      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="login" options={{ headerShown: false }} />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SessionProvider>
      <StatusBar style="auto" />
      <RootStack />
    </SessionProvider>
  );
}
