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
 * is square here: the asset is 1024×1024, so contained at 120 wide it is 120
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

/**
 * The same file `expo.splash.image` names in `app.json`, and it has to stay
 * that way. This view is a copy of the native splash drawn in React so the
 * grain can sit over it — see the note above — and the handoff between the two
 * is only invisible while both are showing the same picture at the same size.
 */
const mark = require("../../../assets/Tully-wave.png");

/**
 * `expo.splash.backgroundColor` in `app.json`, written out rather than read from
 * `Colors.light.background`, because it is the *splash* this has to match — that
 * is the thing this view is a copy of and the thing it takes over from.
 *
 * The two used to be a shade apart, and this was the wrong shade for a while
 * after the page moved: it sat at `#F3F0E7`, the original paper, against a page
 * that had gone to `#EDE6D6`. A stale value here is a visible step in colour at
 * the handoff — the one moment in the app where two surfaces have to be
 * indistinguishable. They are the same value today; if either moves, both move.
 */
const BACKGROUND = "#EDE6D6";

/**
 * `expo.splash.imageWidth` in `app.json`, on a square asset, and the two have to
 * be the same number: this view is a copy of the native splash and the handoff
 * between them is only invisible while both draw the mark at one size.
 *
 * It came down from 260 to 180 — Tully at that width filled a third of a phone
 * and read as a character being introduced, where the splash is a held breath
 * before the app rather than a title card — went back up to 220 as the middle of
 * that argument, and is now 120, matching `app.json`. This value drifted from
 * the plugin's once, and the symptom is worth recording because it does not look
 * like a mismatch: the plugin was at 120 while this was left at 180, so the mark
 * grew at the handoff and the launch read as *two* splashes, a small Tully and
 * then a big one, rather than one plate held and released. There is no size that
 * is right here independent of `app.json`; there is only the same number twice.
 */
const MARK_SIZE = 120;

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
