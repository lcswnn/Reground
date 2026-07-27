import { QueryClientProvider } from '@tanstack/react-query';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { queryClient } from '@/lib/query';
import { SessionProvider, useSession } from '@/lib/session';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <RootNavigator />
      </SessionProvider>
    </QueryClientProvider>
  );
}

function RootNavigator() {
  const { session, isLoading } = useSession();
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const palette = isDark ? Colors.dark : Colors.light;

  // Hold the splash until we know whether a session was restored, otherwise the
  // sign-in screen flashes for a frame before the tabs mount.
  useEffect(() => {
    if (!isLoading) {
      void SplashScreen.hideAsync();
    }
  }, [isLoading]);

  const base = isDark ? DarkTheme : DefaultTheme;
  const navigationTheme = {
    ...base,
    colors: {
      ...base.colors,
      primary: palette.brandStrong,
      background: palette.background,
      card: palette.background,
      text: palette.text,
      border: palette.border,
    },
  };

  if (isLoading) return null;

  return (
    <ThemeProvider value={navigationTheme}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShadowVisible: false }}>
        <Stack.Protected guard={!!session}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="story/[id]"
            options={{ title: '', headerBackButtonDisplayMode: 'minimal' }}
          />
        </Stack.Protected>

        <Stack.Protected guard={!session}>
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        </Stack.Protected>
      </Stack>
    </ThemeProvider>
  );
}
