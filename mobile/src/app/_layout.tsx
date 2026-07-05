// Root layout: query cache + auth session + active group providers around the
// navigation stack. The splash screen stays up until the persisted session has
// been read, so the auth guard in (tabs)/_layout never flashes the wrong screen.
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';

import { ActiveGroupProvider } from '@/lib/active-group';
import { SessionProvider, useSession } from '@/lib/session';

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1
    }
  }
});

function SplashController() {
  const { initialized } = useSession();
  useEffect(() => {
    if (initialized) {
      SplashScreen.hideAsync();
    }
  }, [initialized]);
  return null;
}

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <ActiveGroupProvider>
          <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
            <SplashController />
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="sign-in" />
            </Stack>
            <StatusBar style="auto" />
          </ThemeProvider>
        </ActiveGroupProvider>
      </SessionProvider>
    </QueryClientProvider>
  );
}
