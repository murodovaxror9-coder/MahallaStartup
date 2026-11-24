import {
  GolosText_400Regular,
  GolosText_500Medium,
  GolosText_600SemiBold,
  GolosText_700Bold,
  useFonts,
} from '@expo-google-fonts/golos-text';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useStackScreenOptions } from '@/lib/navigation';
import { SessionProvider, useSession } from '@/lib/session';
import { C } from '@/theme';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

function RootStack({ fontsReady }: { fontsReady: boolean }) {
  const { status, mustChangePassword } = useSession();
  const screenOptions = useStackScreenOptions();
  const signedIn = status === 'signedIn';

  useEffect(() => {
    if (status !== 'loading' && fontsReady) SplashScreen.hideAsync().catch(() => undefined);
  }, [status, fontsReady]);

  if (!fontsReady) return null;

  return (
    <Stack screenOptions={screenOptions}>
      {/* Parol almashtirish: vaqtinchalik parol bilan kirganda majburiy, keyin profil orqali ixtiyoriy */}
      <Stack.Protected guard={signedIn}>
        <Stack.Screen name="change-password" />
      </Stack.Protected>

      <Stack.Protected guard={signedIn && !mustChangePassword}>
        <Stack.Screen name="(tabs)" options={{ animation: 'none' }} />
        <Stack.Screen name="issues" />
        <Stack.Screen name="rounds" />
        <Stack.Screen name="events" />
        <Stack.Screen name="announcements" />
        <Stack.Screen name="notifications" />
      </Stack.Protected>

      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="login" options={{ animation: 'fade' }} />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  const [loaded, fontError] = useFonts({
    GolosText_400Regular,
    GolosText_500Medium,
    GolosText_600SemiBold,
    GolosText_700Bold,
  });

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: C.bg }}>
      <SafeAreaProvider>
        <KeyboardProvider>
        <SessionProvider>
          <StatusBar style="dark" />
          {/* Shrift yuklanmasa ham ilova ochiladi (tizim shrifti bilan) */}
          <RootStack fontsReady={loaded || !!fontError} />
        </SessionProvider>
        </KeyboardProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
