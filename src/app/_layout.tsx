import { QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';

import { Colors, LibertinusSerif, LibertinusSerifBold } from '@/constants/theme';
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

  // Loaded at runtime rather than through the expo-font config plugin, which
  // would need a native rebuild to pick up.
  // One family name per file: RN can't synthesize weights for a custom family,
  // so the bold face is registered under its own name and used directly.
  const [fontsLoaded, fontError] = useFonts({
    [LibertinusSerif]: require('../../assets/fonts/LibertinusSerif-Regular.otf'),
    [LibertinusSerifBold]: require('../../assets/fonts/LibertinusSerif-Bold.otf'),
  });

  // A font that fails to decode shouldn't hold the app hostage — fall through
  // to system text instead.
  const fontsSettled = fontsLoaded || !!fontError;

  // Hold the splash until we know whether a session was restored, otherwise the
  // sign-in screen flashes for a frame before the tabs mount.
  useEffect(() => {
    if (!isLoading && fontsSettled) {
      void SplashScreen.hideAsync();
    }
  }, [isLoading, fontsSettled]);

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

  if (isLoading || !fontsSettled) return null;

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
