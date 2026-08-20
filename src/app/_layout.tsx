// Imported per weight rather than from the package root. The root re-exports
// every cut in the family — nine of them here — and Metro follows all of them
// into the bundle, which is megabytes of fonts for the two the app asks for.
import { ElmsSans_500Medium } from '@expo-google-fonts/elms-sans/500Medium';
import { ElmsSans_700Bold } from '@expo-google-fonts/elms-sans/700Bold';
import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import * as SystemUI from 'expo-system-ui';
import { useEffect } from 'react';
import { View } from 'react-native';

import { Colors } from '@/constants/theme';
import { SPLASH } from '@/config/session';
import { SessionFlowProvider } from '@/session/session-context';
import { RegionPreferenceProvider } from '@/lib/region-preference';
import { ScorePreferenceProvider } from '@/lib/score-preference';
import { ThemePreferenceProvider, useThemePreference } from '@/lib/theme-preference';
import { LaunchVeil } from '@/session/ui/launch-veil';
import { ScreenFilm } from '@/session/ui/screen-film';

SplashScreen.preventAutoHideAsync();

// The native splash now gives way to a copy of itself rather than to the app —
// see `LaunchVeil` — so this is no longer the moment the app arrives. It stays a
// fade rather than a cut all the same: the veil is a React view and may be a
// frame behind the commit that hides this, and a fade covers that where a swap
// on a single frame would show it.
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
 * `.github/workflows/data-refresh.yml`. This app is its only consumer.
 */
export default function RootLayout() {
  return (
    <ThemePreferenceProvider>
      {/* Above the navigator, because the door asks the question it holds on
          the first launch and the crisis sheet reads it from every screen. */}
      <RegionPreferenceProvider>
        {/* Read by every game on the shelf, and by nothing else. */}
        <ScorePreferenceProvider>
          <SessionFlowProvider>
            <RootNavigator />
          </SessionFlowProvider>
        </ScorePreferenceProvider>
      </RegionPreferenceProvider>
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
  // Two cuts of Elms Sans, which ships nine weights and an italic of each.
  // Which two is a decision, not a default — see the note on `Fonts` in
  // `constants/theme.ts`, which is also where the reason each is registered as
  // its own family lives.
  const [fontsLoaded, fontError] = useFonts({
    ElmsSans_500Medium,
    ElmsSans_700Bold,
  });

  // A font that fails to decode shouldn't hold the app hostage — fall through
  // to system text instead.
  const fontsSettled = fontsLoaded || !!fontError;

  /**
   * The native splash is let go the instant the fonts are ready, and not a
   * moment of `SPLASH.minimumMs` is spent under it.
   *
   * That minimum has not gone anywhere — it is served by `LaunchVeil`, which
   * this same commit puts on screen holding the same picture, and which waits
   * out `splashHoldsForMs` and fades on its own clock. The point of the handoff
   * is the grain: it can only be drawn over a React view, so the app takes the
   * launch back as early as it has something to take it back with.
   *
   * The fonts are still what gates it, for the same reason as ever — nothing
   * renders until they settle, so the first screen never reflows out of the
   * system face into the app's own, and the veil the native splash gives way to is
   * already in the tree when it goes.
   *
   * `index.tsx` schedules its line off the far end of all this, and none of
   * those numbers moved — see `splashClearsInMs`.
   */
  useEffect(() => {
    if (!fontsSettled) return;

    void SplashScreen.hideAsync();
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
      <View style={{ flex: 1 }}>
        {/*
          No native header, and the swipe-back gesture stays off. Every screen
          navigates with `router.replace`, so there is never a stack to walk
          backwards into by accident — which is the point: stepping back into
          the reactivation cue, or into the thing that upset you, should take a
          deliberate tap and nothing less.

          That tap is the back button `SessionScreen` draws top-left. It is a
          route change like any other rather than a stack pop, and
          `previousRoute` in `session/routing.ts` is the single place that
          says where each screen goes and which two have nowhere to go at all.

          `fade` rather than a push, because nothing here is a level deeper
          than the last screen. It is the next moment of one continuous thing.
        */}
        <Stack
          screenOptions={{
            headerShown: false,
            gestureEnabled: false,
            animation: 'fade',
          }}
        />
        {/*
          The splash, continued in React so that the film below can be drawn
          over it. It takes the launch over from the native splash on the frame
          it mounts and holds the rest of it alone — see `LaunchVeil`. Above the
          `Stack`, because it is covering the app; below `ScreenFilm`, because
          it is one of the things being covered.
        */}
        <LaunchVeil />
        {/*
          Drawn once here rather than inside `SessionScreen`, so it sits above
          the fade transition as a fixed layer instead of crossfading with
          each screen — a film on the glass, not a property of what's under it.
          Over the veil as well, which is the whole reason the veil exists: the
          launch was the one part of the app the film could not reach, and it
          looked like a different material for it.
        */}
        <ScreenFilm />
      </View>
    </ThemeProvider>
  );
}
