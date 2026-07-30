import { QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import * as Notifications from 'expo-notifications';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import * as SystemUI from 'expo-system-ui';
import { useEffect, useState } from 'react';

import { AppReadyContext } from '@/lib/app-ready';
import { prefetchAppData } from '@/lib/bootstrap';
import { resyncReminder } from '@/lib/daily-reminder';
import { Colors, LibertinusSerif, LibertinusSerifBold } from '@/constants/theme';
import { queryClient } from '@/lib/query';
import { SessionProvider, useSession } from '@/lib/session';
import { useWeightingSync } from '@/state/weighting-sync';
import { ThemePreferenceProvider, useThemePreference } from '@/lib/theme-preference';

SplashScreen.preventAutoHideAsync();

/**
 * How the daily reminder behaves when it fires with the app already open.
 *
 * A banner, and nothing else. No sound and no badge: the reminder's whole job is
 * to say "there is one card to look at", and a badge would still be sitting on
 * the icon after the card had been read — the app has no unread count to be
 * right about. Set at module scope because the handler has to be registered
 * before a notification can arrive, which can be before the first render.
 */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});
// Without this the splash is swapped out on a single frame, which reads as a
// jump cut now that it sits over an already-populated screen.
SplashScreen.setOptions({ fade: true, duration: 350 });

/** When the JS bundle came up, i.e. roughly when the splash became ours to hold. */
const startedAt = Date.now();

/**
 * Floor on the splash, so a warm cache doesn't reduce it to a flicker on the
 * way past. Short enough that it never feels like a wait of its own.
 */
const MIN_SPLASH_MS = 900;

/**
 * Ceiling on the warm-up. A slow or dead connection must not strand the user
 * on the splash — past this we show the app and let each screen handle its own
 * loading and error states, which is what they were built to do anyway.
 */
const PREFETCH_TIMEOUT_MS = 6000;

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemePreferenceProvider>
        <SessionProvider>
          <RootNavigator />
        </SessionProvider>
      </ThemePreferenceProvider>
    </QueryClientProvider>
  );
}

function RootNavigator() {
  const { session, isLoading } = useSession();
  const { isDark } = useThemePreference();
  const palette = isDark ? Colors.dark : Colors.light;

  // Reconciles the device's category weighting with the server's copy, so a
  // reinstall or a second device does not silently fall back to the research
  // defaults. Mounted here because it needs the session and should run once for
  // the whole app rather than per screen. Never blocks: it is a background sync
  // around storage that already works offline.
  useWeightingSync();

  /**
   * The root view sits outside the React tree, so no screen's `backgroundColor`
   * reaches it. `app.json`'s `backgroundColor` covers it from launch, but the
   * app config has no dark variant — a single build-time value cannot follow
   * the scheme, and the light one flashes white behind every push transition
   * and rotation in dark mode. Setting it at runtime is the only way to track
   * the preference, including the in-app override, which the system doesn't
   * know about at all.
   */
  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(palette.background);
  }, [palette.background]);

  /**
   * The OS schedule and the stored reminder preference drift apart on their own —
   * a reinstall clears scheduled notifications, and permission can be revoked
   * from system settings while the app is closed. Re-asserting it once per launch
   * is cheaper than detecting either case.
   */
  useEffect(() => {
    void resyncReminder();
  }, []);

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

  // Warm every cache the first screens read, while the splash is still up.
  // Signed out there is nothing to fetch, so this settles immediately.
  const userId = session?.user.id;
  // Tracked per user rather than as a bare flag, so the state is only ever set
  // from a callback — and so a different account signing in later can't inherit
  // the previous one's "already warm".
  const [warmedFor, setWarmedFor] = useState<string | null>(null);
  const isWarm = !userId || warmedFor === userId;

  useEffect(() => {
    if (isLoading || !userId) return;

    let active = true;
    const settle = () => {
      if (active) setWarmedFor(userId);
    };

    void prefetchAppData(userId).then(settle, settle);
    const timeout = setTimeout(settle, PREFETCH_TIMEOUT_MS);

    return () => {
      active = false;
      clearTimeout(timeout);
    };
  }, [isLoading, userId]);

  // Hold the splash until we know whether a session was restored — otherwise
  // the sign-in screen flashes for a frame before the tabs mount — and until
  // the warm-up lands, so what's underneath is finished rather than filling in.
  const isReady = !isLoading && fontsSettled && isWarm;

  const [isRevealed, setIsRevealed] = useState(false);

  useEffect(() => {
    if (!isReady) return;

    let frame = 0;
    const timeout = setTimeout(
      () => {
        // Two frames: the first lets the cache writes flush into the mounted
        // screens, the second lets that render actually reach the glass. Hiding
        // any earlier uncovers the spinner we just spent the splash avoiding.
        frame = requestAnimationFrame(() => {
          frame = requestAnimationFrame(() => {
            void SplashScreen.hideAsync();
            // Released with the fade rather than after it, so the charts fill
            // as the splash dissolves instead of starting on a still frame.
            setIsRevealed(true);
          });
        });
      },
      Math.max(0, MIN_SPLASH_MS - (Date.now() - startedAt)),
    );

    return () => {
      clearTimeout(timeout);
      cancelAnimationFrame(frame);
    };
  }, [isReady]);

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

  // Deliberately not gated on `isWarm`: the navigator mounts as soon as it can
  // and does its first render underneath the splash, so the warm-up and the
  // layout pass overlap instead of queuing.
  if (isLoading || !fontsSettled) return null;

  return (
    <ThemeProvider value={navigationTheme}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <AppReadyContext value={isRevealed}>
        <Stack screenOptions={{ headerShadowVisible: false }}>
          <Stack.Protected guard={!!session}>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen
              name="story/[id]"
              options={{ title: '', headerBackButtonDisplayMode: 'minimal' }}
            />
            {/* `transparentModal`, not `modal`: the screen draws its own scrim
                over a still-visible Today, which a sheet presentation would
                cover with an opaque page. Faded rather than slid up, because
                what animates is the panel inside it. */}
            <Stack.Screen
              name="card"
              options={{
                presentation: 'transparentModal',
                headerShown: false,
                animation: 'fade',
                // Otherwise the navigator paints its own background colour
                // behind the "transparent" screen and the scrim has nothing to
                // be transparent against.
                contentStyle: { backgroundColor: 'transparent' },
              }}
            />
            <Stack.Screen
              name="settings"
              options={{
                title: 'Settings',
                headerBackButtonDisplayMode: 'minimal',
                // iOS already pushes from the right edge; this is what gets
                // Android to do the same instead of its default fade upward.
                animation: 'slide_from_right',
              }}
            />
            <Stack.Screen
              name="weighting"
              options={{
                title: 'What matters to you',
                headerBackButtonDisplayMode: 'minimal',
                animation: 'slide_from_right',
              }}
            />
          </Stack.Protected>

          <Stack.Protected guard={!session}>
            <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          </Stack.Protected>
        </Stack>
      </AppReadyContext>
    </ThemeProvider>
  );
}
