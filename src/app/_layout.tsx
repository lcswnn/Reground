import {
  Caveat_400Regular,
  Caveat_500Medium,
  Caveat_600SemiBold,
  Caveat_700Bold,
} from '@expo-google-fonts/caveat';
import { QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import * as Notifications from 'expo-notifications';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import * as SystemUI from 'expo-system-ui';
import { useEffect, useState } from 'react';

import { EntryFlow } from '@/components/entry-flow';
import { AppReadyContext } from '@/lib/app-ready';
import { prefetchAppData } from '@/lib/bootstrap';
import { resyncReminder } from '@/lib/daily-reminder';
import { Colors, Fonts } from '@/constants/theme';
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
  // so each weight is registered under its own name and used directly. The
  // names come from the package rather than being retyped — they are also what
  // `constants/theme` references, and a typo in either place is silent.
  const [fontsLoaded, fontError] = useFonts({
    Caveat_400Regular,
    Caveat_500Medium,
    Caveat_600SemiBold,
    Caveat_700Bold,
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

  /** Whether the breath-and-check-in has been done for this launch. */
  const [hasEntered, setHasEntered] = useState(false);

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
        {/* Header titles in the app's own face rather than the system's.
            "Settings" and "What matters to you" were the only headings in the
            app still rendering in system-ui, which read as somebody else's
            screen bolted onto this one.

            Set once on the navigator instead of per screen, so a stack screen
            added later inherits it rather than reintroducing the mismatch.

            24pt matches `sectionTitle`, which is where the scale had to move
            for Caveat: the face sits small for its point size, so a 20 that
            outranked the page below it in Nunito no longer does.

            `fontWeight: 'normal'` is load-bearing, not decoration. React
            Navigation's default header title is semibold, and RN cannot
            synthesize weights for a custom family — `Fonts.display` is already
            the bold file, so leaving a weight on it makes iOS fall back to the
            system face and undo the whole point. See the note on `Fonts` in
            `constants/theme.ts`. */}
        <Stack
          screenOptions={{
            headerShadowVisible: false,
            headerTitleStyle: {
              fontFamily: Fonts.display,
              fontSize: 24,
              fontWeight: 'normal',
            },
          }}>
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
            {/* The game gets a stack screen so the tab bar is gone — a paddle
                that runs along the top of three tab glyphs turns a missed ball
                into a navigation.

                No header either: a title bar over a game is chrome around a toy,
                and the screen draws its own Back so the way out sits in the same
                plane as the board. The swipe-back gesture still works. */}
            <Stack.Screen name="game" options={{ headerShown: false }} />
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
                // The one screen in the app that turns off swipe-to-go-back.
                //
                // It is full of horizontal sliders that run nearly the width of
                // the screen, so dragging one rightward from near the left edge
                // lands inside the pop gesture's hit area. That recogniser is
                // native, and a native gesture beats the JS responder the slider
                // uses — the slider cannot defend itself, so the screen popped
                // mid-drag instead of the value moving.
                //
                // iOS only, which is where the problem is: this option does
                // nothing on Android, whose back gesture belongs to the system.
                // Android's edge zone is narrower and the screen's own 24pt
                // gutter mostly clears it, so the sliders are usable there —
                // worth re-checking on a device if it ever feels sticky.
                //
                // The header back button still works, so nothing is unreachable.
                gestureEnabled: false,
              }}
            />
          </Stack.Protected>

          <Stack.Protected guard={!session}>
            <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          </Stack.Protected>
        </Stack>

        {/* The arrival ritual — a check-in, then a breath for whoever needs one
            — over the top of the mounted navigator. See `@/components/entry-flow`
            for why it is an overlay rather than a route.

            After the `Stack` rather than before it, because that is what puts
            it on top: these are siblings, and paint order decides.

            Gated on `session` so it never covers the sign-in screens, and on
            `isRevealed` so the question appears as the splash lifts rather than
            being answered underneath it. The `useState` is what makes this once
            per cold launch — it resets on a cold start and survives a
            backgrounding, which is the line we want. */}
        {!!session && isRevealed && !hasEntered ? (
          <EntryFlow onDone={() => setHasEntered(true)} />
        ) : null}
      </AppReadyContext>
    </ThemeProvider>
  );
}
