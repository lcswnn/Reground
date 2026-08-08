// Imported per weight rather than from the package root. The root re-exports
// all eight cuts, and Metro follows every one of them into the bundle — 6MB of
// fonts for the two the app actually asks for.
import { PlaypenSans_400Regular } from '@expo-google-fonts/playpen-sans/400Regular';
import { PlaypenSans_600SemiBold } from '@expo-google-fonts/playpen-sans/600SemiBold';
import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import * as SystemUI from 'expo-system-ui';
import { useEffect } from 'react';

import { Colors } from '@/constants/theme';
import { SPLASH } from '@/config/session';
import { splashHoldsForMs } from '@/lib/splash';
import { SessionFlowProvider } from '@/session/session-context';
import { ThemePreferenceProvider, useThemePreference } from '@/lib/theme-preference';

SplashScreen.preventAutoHideAsync();

// Without this the splash is swapped out on a single frame, which reads as a
// jump cut.
SplashScreen.setOptions({ fade: true, duration: SPLASH.hideMs });

/**
 * The app is the session and nothing else.
 *
 * There is no tab bar, no home screen and no route that isn't a step in the
 * flow: the first screen out of the splash is the question, and the last one
 * tells you to put the phone down. Anything else to navigate to would be an
 * invitation to stay.
 *
 * The previous app — tabs, stories, the humanity data — was parked under
 * `src/legacy/` through the pivot and has now been deleted rather than left to
 * rot beside code it no longer resembles. It is in git: `git show ab1efc0` is
 * the last commit that has it, and `git checkout ab1efc0 -- src/legacy` brings
 * any of it back. Take that route rather than trusting the old screens to
 * still compile — they link to routes that no longer exist.
 *
 * Gone with it: the Supabase client, react-query, notifications and the account.
 * The session holds no identity and writes nothing to disk, so there is nothing
 * left for any of them to do.
 *
 * ## It does make exactly one network call
 *
 * That was not true for a while and is again. `/calibration` shows the real
 * series behind whatever the user said they were frightened of, and those come
 * off the published artifact — one GET of one public static file, started at
 * `/topic` and read five screens later. See `src/api/humanity.ts` for why it is
 * fetched rather than bundled, and `calibration.tsx` for the rule that keeps it
 * from costing anything when it fails.
 *
 * It stays a single unauthenticated GET of a public URL. No client, no session,
 * no key, nothing sent. If a second call ever appears here, that is the thing
 * worth arguing about.
 *
 * The data layer itself is untouched and still running daily — see
 * `.github/workflows/data-refresh.yml`. It now has two consumers: the WidgetKit
 * extension in `targets/widget/`, and this app again.
 */
export default function RootLayout() {
  return (
    <ThemePreferenceProvider>
      <SessionFlowProvider>
        <RootNavigator />
      </SessionFlowProvider>
    </ThemePreferenceProvider>
  );
}

function RootNavigator() {
  const { isDark } = useThemePreference();
  const palette = isDark ? Colors.dark : Colors.light;

  /**
   * The root view sits outside the React tree, so no screen's `backgroundColor`
   * reaches it. `app.json`'s `backgroundColor` covers it from launch, but the
   * app config has no dark variant — a single build-time value cannot follow
   * the scheme, and the light one flashes white behind every push transition
   * and rotation in dark mode.
   */
  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(palette.background);
  }, [palette.background]);

  // Loaded at runtime rather than through the expo-font config plugin, which
  // would need a native rebuild to pick up.
  //
  // Two cuts, because Playpen Sans actually has them — see the note on `Fonts`
  // in `constants/theme.ts` for why the previous face made this a single file.
  const [fontsLoaded, fontError] = useFonts({
    PlaypenSans_400Regular,
    PlaypenSans_600SemiBold,
  });

  // A font that fails to decode shouldn't hold the app hostage — fall through
  // to system text instead.
  const fontsSettled = fontsLoaded || !!fontError;

  /**
   * Two conditions, and the splash waits for both: the fonts have to be ready,
   * or the first screen renders in the system face and then reflows into
   * Playpen Sans — and the splash has to have been up for `SPLASH.minimumMs`.
   *
   * The wait is measured from launch rather than from here, so the two overlap
   * instead of stacking. Fonts that take a second to decode spend that second
   * inside the minimum, and by the time they land there is nothing left to
   * wait for.
   *
   * `index.tsx` schedules its line off the very same call, so the line starts
   * fading up as this fires rather than after the fade it kicks off has
   * finished. It depends on this effect being where the wait begins — see
   * `splashHoldsForMs`.
   */
  useEffect(() => {
    if (!fontsSettled) return;

    const timer = setTimeout(() => void SplashScreen.hideAsync(), splashHoldsForMs());

    return () => clearTimeout(timer);
  }, [fontsSettled]);

  if (!fontsSettled) return null;

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

  return (
    <ThemeProvider value={navigationTheme}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      {/*
        No native header, and the swipe-back gesture stays off. Every screen
        navigates with `router.replace`, so there is never a stack to walk
        backwards into by accident — which is the point: stepping back into the
        reactivation cue, or into the thing that upset you, should take a
        deliberate tap and nothing less.

        That tap is the back button `SessionScreen` draws top-left. It is a
        route change like any other rather than a stack pop, and `previousRoute`
        in `session/routing.ts` is the single place that says where each screen
        goes and which two have nowhere to go at all.

        `fade` rather than a push, because nothing here is a level deeper than
        the last screen. It is the next moment of one continuous thing.
      */}
      <Stack
        screenOptions={{
          headerShown: false,
          gestureEnabled: false,
          animation: 'fade',
        }}
      />
    </ThemeProvider>
  );
}
