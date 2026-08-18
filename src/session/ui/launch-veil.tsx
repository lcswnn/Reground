/**
 * The splash, redrawn in React so the grain can sit on top of it.
 *
 * The native splash is a native view above the React root, and nothing rendered
 * in JavaScript — `ScreenFilm` included — can be drawn over it. So the app stops
 * holding the native one as soon as it has something identical of its own to
 * hand off to: this. Same background, same mark, same size, and then the film
 * over it like every other screen. The only difference between the two is the
 * thing this exists for.
 *
 * ## The handoff
 *
 * `_layout.tsx` calls `hideAsync` the moment the fonts settle, which is the same
 * commit that first renders this. The native splash goes out onto a view holding
 * the same picture, so there is nothing to see in the swap.
 *
 * The wait that used to be spent under the native splash is now spent here
 * instead: this holds for `splashHoldsForMs()` and then fades over
 * `SPLASH.hideMs`, so the app still clears at `splashClearsInMs()` and the
 * welcome line's schedule is untouched.
 *
 * ## Everything here is a copy of something in `app.json`
 *
 * `backgroundColor`, `imageWidth` and the image itself are set on the
 * `expo-splash-screen` plugin, which is build-time config the bundle cannot read
 * back. They are duplicated below and have to be changed in both places or the
 * handoff shows as a jump. The plugin's `resizeMode: "contain"` is why the mark
 * is square here: the asset is 1024×1024, so contained at 260 wide it is 260
 * tall.
 *
 * ## It stays light in dark mode, deliberately
 *
 * This is a React view, so it *could* read `useThemePreference` and open dark
 * for a reader who set the app dark. It doesn't. The native splash it is
 * continuing is a fixed light plate — it is on screen before the bundle is read,
 * let alone the stored preference, so it cannot know — and a veil that switched
 * would turn the one seamless moment in the launch into a crossfade from paper
 * to ink. The launch is paper for everyone; the app picks up the scheme at the
 * first screen.
 */

import { useEffect, useState } from "react";
import { Image, StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";

import { SPLASH } from "@/config/session";
import { splashHoldsForMs } from "@/lib/splash";

const mark = require("../../../assets/icon-no-bg.png");

/**
 * `expo.splash.backgroundColor` in `app.json`, and not `Colors.light.background`
 * — the two are a shade apart (`#F3F0E7` against `#F0EBDE`) and it is the splash
 * this has to match, since that is what goes away onto it. The difference leaves
 * with the veil's own fade.
 */
const BACKGROUND = "#F3F0E7";

/** `expo.splash.imageWidth` in `app.json`, on a square asset. */
const MARK_SIZE = 260;

export function LaunchVeil() {
  const [cleared, setCleared] = useState(false);

  /**
   * Opaque from the first frame, because there is a native splash directly on
   * top of it that is about to go and expose whatever this is.
   *
   * The remaining hold is measured here rather than passed in, and measuring it
   * a beat late costs nothing: `splashHoldsForMs` counts down from launch, so a
   * slower mount shortens the wait by exactly as much as it delayed it, and the
   * veil still clears at the `splashClearsInMs` `index.tsx` is counting against.
   *
   * Reduced motion is not consulted. The fade is the splash coming off rather
   * than anything moving, and skipping it would leave the app sitting on a
   * finished launch waiting for a line scheduled off that same fade.
   */
  const opacity = useSharedValue(1);

  useEffect(() => {
    opacity.value = withDelay(
      splashHoldsForMs(),
      withTiming(
        0,
        { duration: SPLASH.hideMs, easing: Easing.inOut(Easing.quad) },
        (finished) => {
          if (finished) runOnJS(setCleared)(true);
        },
      ),
    );
  }, [opacity]);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));

  // Unmounted once it is gone: a transparent full-screen layer over every screen
  // for the rest of the session is a compositing cost with nothing left to draw.
  if (cleared) return null;

  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, styles.veil, style]}
      pointerEvents="none"
    >
      <View style={styles.centre}>
        <Image source={mark} style={styles.mark} resizeMode="contain" />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  veil: { backgroundColor: BACKGROUND },
  centre: { flex: 1, alignItems: "center", justifyContent: "center" },
  mark: { width: MARK_SIZE, height: MARK_SIZE },
});
