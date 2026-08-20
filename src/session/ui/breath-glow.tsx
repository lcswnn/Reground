/**
 * The light a breathing circle gives off: concentric rings at low alpha that
 * swell and settle with the circle inside them.
 *
 * Two things wear one — the sphere on the door and the breathing circle on
 * screen 1 — and it was written for the first and extracted the moment the
 * second wanted it. Two copies of a falloff this fiddly would agree on the day
 * they were written and nowhere after that.
 *
 * ## Why rings and not a gradient
 *
 * Nothing in this app can draw a radial gradient. There is no SVG in the tree
 * and `expo-linear-gradient` is linear only, so a real falloff would mean a
 * dependency for one decorative effect on two screens. Three steps of alpha do
 * the same job here: at these values the outermost ring is barely a colour, the
 * grain overlay (`ScreenFilm`) sits on top of all of it, and what the eye reads
 * is an edge that stops being definite rather than three circles.
 *
 * ## It breathes, and that is the whole point
 *
 * The rings scale with the core rather than sitting still behind it, so the
 * glow expands and contracts as one object — a fixed halo around a moving disc
 * reads as a shape with a shadow, where this reads as something giving off
 * light. Their opacity moves too, but only between two-thirds and full: a glow
 * that faded to nothing at the bottom of a breath would read as flickering.
 *
 * Nothing here starts, stops or schedules anything. It is handed the shared
 * value its owner is already animating and follows it, which is what keeps the
 * glow from ever drifting out of step with the circle it belongs to.
 */

import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  type SharedValue,
} from 'react-native-reanimated';

import { Radius } from '@/constants/theme';

/**
 * The three rings, as a share of the distance between the circle's own edge and
 * `reach`, with the ink each one carries at the top of the breath.
 *
 * Roughly half again as far out and two-thirds the alpha at each step, which is
 * the shape a real falloff has. Written as shares rather than as fixed spreads
 * so that one number — `reach` — sizes the whole glow: the two callers are a
 * 130-point sphere with room around it and a 300-point circle that nearly fills
 * its screen, and they cannot want the same absolute spread.
 */
const RINGS = [
  { share: 1, alpha: 0.035 },
  { share: 0.62, alpha: 0.06 },
  { share: 0.3, alpha: 0.1 },
] as const;

interface BreathGlowProps {
  /**
   * The scale the circle itself is being drawn at, live. Not a copy and not a
   * progress value — the glow multiplies this, so whatever the circle is doing
   * this is doing with it.
   */
  scale: SharedValue<number>;
  /**
   * The bottom of that scale's travel, which is all this needs in order to know
   * how far through a breath the circle is: at `minScale` the glow is at its
   * dimmest, at 1 its brightest.
   */
  minScale: number;
  /** The circle's own diameter. Every ring is drawn at this and scaled up. */
  diameter: number;
  /** How far past the circle the outermost ring reaches, as a multiplier. */
  reach: number;
  /** Usually `theme.info`, which is the accent — see `constants/theme.ts`. */
  color: string;
}

/**
 * The box a glow needs, so a caller can size the stage that holds it. A ring
 * drawn at `diameter` and scaled to `reach` is that much wide, and a container
 * cut to the circle alone would clip it on Android.
 */
export function breathGlowSize(diameter: number, reach: number): number {
  return diameter * reach;
}

export function BreathGlow({
  scale,
  minScale,
  diameter,
  reach,
  color,
}: BreathGlowProps) {
  return (
    <>
      {RINGS.map((ring) => (
        <Ring
          key={ring.share}
          scale={scale}
          minScale={minScale}
          diameter={diameter}
          spread={1 + (reach - 1) * ring.share}
          alpha={ring.alpha}
          color={color}
        />
      ))}
    </>
  );
}

/**
 * One ring. Its own component so each can read the shared value in its own
 * worklet without a hook written inside a loop — the same arrangement the
 * rating row's dots and the sigh example's steps use.
 */
function Ring({
  scale,
  minScale,
  diameter,
  spread,
  alpha,
  color,
}: {
  scale: SharedValue<number>;
  minScale: number;
  diameter: number;
  spread: number;
  alpha: number;
  color: string;
}) {
  const style = useAnimatedStyle(() => {
    // How far up the breath the circle is, whatever range it travels over.
    // Guarded because a caller could hand over a `minScale` of 1, and a
    // division by zero on the UI thread is a NaN that silently blanks the view.
    const range = 1 - minScale;
    const through = range > 0 ? (scale.value - minScale) / range : 1;

    return {
      transform: [{ scale: scale.value * spread }],
      opacity: alpha * (0.66 + 0.34 * through),
    };
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.ring,
        style,
        { width: diameter, height: diameter, backgroundColor: color },
      ]}
    />
  );
}

/**
 * A stage for a circle and its glow: centred on both axes, and sized by the
 * caller to `breathGlowSize`.
 */
export function GlowStage({
  size,
  children,
}: {
  size: number;
  children: React.ReactNode;
}) {
  return <View style={[styles.stage, { width: size, height: size }]}>{children}</View>;
}

const styles = StyleSheet.create({
  ring: {
    position: 'absolute',
    borderRadius: Radius.pill,
  },
  stage: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
