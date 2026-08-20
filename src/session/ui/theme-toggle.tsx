/**
 * The appearance switch, top-right on every screen: one round button holding a
 * moon in light mode and a sun in dark mode.
 *
 * The second of the two controls that sit outside the session — see
 * `back-button.tsx`, which sits opposite it. Neither is a step in the session
 * and neither should ever compete with what the screen is actually asking.
 *
 * The picture is the mode you are *not* in, which is the convention every
 * settings panel uses and the only one that works without a label: an icon of
 * the state you are already in is a status, and a status you can press is a
 * trap. See `APPEARANCE` for what that cost — this used to be two words with
 * their own targets each, and it was idempotent where this flips.
 *
 * ## Why the sun and the moon are drawn rather than set
 *
 * There is no icon set in this app. The back button's arrow is a text glyph on
 * the argument that one character in the app's own face beats a second font
 * file, and that argument holds until the character has to move — ☀ and ☾ are
 * two glyphs of wildly different weight and vertical alignment in any given
 * face, and nothing can be animated between them.
 *
 * So both are built from plain views: the moon is a disc with a second disc cut
 * out of it in the button's own fill, and the sun is a smaller disc with eight
 * rays laid around it on rotations. Nothing here is an image, an SVG or a
 * dependency, and both are made of the same shape the app is already full of.
 *
 * ## The animation
 *
 * One shared value, 0 at the moon and 1 at the sun, and everything reads off
 * it: the moon turns out and shrinks away while the sun turns in and grows,
 * both on the same curve, so the two are one movement rather than a
 * cross-fade of two pictures. The rays scale from nothing as the sun arrives —
 * the last thing to appear, which is what makes it read as rising rather than
 * as fading up.
 *
 * The whole thing turns a quarter as it goes, which is the flourish. It is the
 * one animated control in the app, and it is allowed to be: it is also the only
 * control whose result is a change to every other pixel on the screen, and a
 * half-second of movement is what stops that change reading as a glitch.
 *
 * Reduce Motion is handed to Reanimated rather than branched on here — every
 * builder below carries `ReduceMotion.System`, which turns the turn into a cut.
 */

import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { PressableScale } from '@/components/ui/pressable-scale';
import { APPEARANCE } from '@/content/strings';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useThemePreference } from '@/lib/theme-preference';
import { tickSelection } from '@/session/ui/haptics';

/**
 * The button, and the picture inside it. Sized against the back button
 * opposite: that is a line of body-tier type, so a 34-point circle sits on the
 * same optical line as it without either end of the row looking heavier.
 */
const BUTTON = 34;
const ICON = 16;

/** The disc that carves the crescent, and how far across it sits. */
const MOON_BITE = 0.78;
const MOON_OFFSET = 0.34;

/**
 * The sun's own disc, and where its rays sit — both as a share of `ICON`, which
 * is the moon's diameter.
 *
 * The sun is the larger of the two pictures however these are set, because the
 * moon is one disc and this is a disc with eight things around it. What matters
 * is that it does not look larger: rays reach further than an edge does, so a
 * sun drawn to the moon's width comes out visibly bigger in the same circle and
 * the button appears to swell every time the app goes dark.
 *
 * These are a step in from where they started (0.56 core on a 0.68 orbit) for
 * exactly that. The whole sun now spans about 21 points inside a 34-point
 * button, against the moon's 16 — near enough that the two read as the same
 * mark, and far enough that the rays are still rays.
 */
const SUN_CORE = 0.5;
const RAYS = 8;
const RAY_LENGTH = 3.5;
const RAY_WIDTH = 2;
const RAY_ORBIT = 0.56;

/**
 * Long enough to be seen as a movement rather than a swap, short enough that a
 * mis-tap can be undone without waiting for it. The whole palette changes on
 * the frame of the press, so this is not the user waiting for the setting — it
 * is the button catching up with a change that has already happened.
 */
const TURN_MS = 420;

export function ThemeToggle() {
  const theme = useTheme();
  const { isDark, setPreference } = useThemePreference();

  /** 0 shows the moon, 1 shows the sun. Starts wherever the app already is. */
  const shown = useSharedValue(isDark ? 1 : 0);

  useEffect(() => {
    shown.value = withTiming(isDark ? 1 : 0, {
      duration: TURN_MS,
      // Eases out of the turn rather than into it: the press has already
      // happened, so the movement should be quickest at the start.
      easing: Easing.out(Easing.cubic),
      reduceMotion: ReduceMotion.System,
    });
  }, [isDark, shown]);

  // Each leaves by turning one way and arriving from the other, so the pair
  // read as one object rotating rather than two fading over each other.
  const moonStyle = useAnimatedStyle(() => ({
    opacity: 1 - shown.value,
    transform: [
      { rotate: `${-90 * shown.value}deg` },
      { scale: 1 - 0.5 * shown.value },
    ],
  }));

  const sunStyle = useAnimatedStyle(() => ({
    opacity: shown.value,
    transform: [
      { rotate: `${90 * (1 - shown.value)}deg` },
      { scale: 0.5 + 0.5 * shown.value },
    ],
  }));

  // The rays come in last and from nothing, which is what makes the sun read as
  // rising rather than as being faded up whole.
  const raysStyle = useAnimatedStyle(() => ({
    opacity: shown.value * shown.value,
    transform: [{ scale: 0.4 + 0.6 * shown.value }],
  }));

  const next = isDark ? 'light' : 'dark';

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={APPEARANCE.switchTo(next)}
      depth="text"
      hitSlop={Spacing.two}
      onPress={() => {
        tickSelection();
        setPreference(next);
      }}
      style={({ pressed }) => [
        styles.button,
        { borderColor: theme.border, backgroundColor: theme.backgroundElement },
        pressed && styles.pressed,
      ]}>
      {/* Both pictures are always mounted and always in the same place; which
          one is visible is the whole of what the animation does. Mounting one
          at a time would mean the arriving half had no earlier state to animate
          from. */}
      <Animated.View style={[styles.icon, moonStyle]}>
        <View style={[styles.disc, { backgroundColor: theme.text }]} />
        {/* The bite. Filled in the button's own colour rather than being a real
            hole — there is no masking here, and a disc in the fill colour is
            indistinguishable from one on a surface this flat. It does mean the
            crescent only works while the button has a fill: if this ever goes
            transparent, this disc has to take `theme.background` instead. */}
        <View
          style={[
            styles.bite,
            { backgroundColor: theme.backgroundElement },
          ]}
        />
      </Animated.View>

      <Animated.View style={[styles.icon, sunStyle]}>
        <Animated.View style={[styles.rays, raysStyle]}>
          {Array.from({ length: RAYS }, (_, index) => (
            <View
              key={index}
              style={[
                styles.ray,
                { backgroundColor: theme.text },
                // Rotate first and then push outward, so each ray travels along
                // its own axis and lands on the circle rather than on a line.
                {
                  transform: [
                    { rotate: `${(360 / RAYS) * index}deg` },
                    { translateY: -ICON * RAY_ORBIT },
                  ],
                },
              ]}
            />
          ))}
        </Animated.View>
        <View style={[styles.core, { backgroundColor: theme.text }]} />
      </Animated.View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  button: {
    width: BUTTON,
    height: BUTTON,
    borderRadius: Radius.pill,
    borderWidth: StyleSheet.hairlineWidth * 2,
    alignItems: 'center',
    justifyContent: 'center',
    // Pulled back by half the difference between the button and the type
    // opposite it, so the circle's right edge lands on the same margin the
    // content below it uses rather than the button's box doing so.
    marginRight: -Spacing.one,
  },
  // Both pictures share one box in the middle of the button, stacked.
  icon: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disc: {
    width: ICON,
    height: ICON,
    borderRadius: Radius.pill,
  },
  bite: {
    position: 'absolute',
    width: ICON * MOON_BITE,
    height: ICON * MOON_BITE,
    borderRadius: Radius.pill,
    // Up and to the right, which is the crescent everybody draws — the lit
    // edge on the lower left, where a moon's is when it is worth drawing.
    transform: [
      { translateX: ICON * MOON_OFFSET },
      { translateY: -ICON * MOON_OFFSET },
    ],
  },
  core: {
    width: ICON * SUN_CORE,
    height: ICON * SUN_CORE,
    borderRadius: Radius.pill,
  },
  rays: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ray: {
    position: 'absolute',
    width: RAY_WIDTH,
    height: RAY_LENGTH,
    borderRadius: Radius.pill,
  },
  // The same shallow dim every other small control takes.
  pressed: {
    opacity: 0.75,
  },
});
