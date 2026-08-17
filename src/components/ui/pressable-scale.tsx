/**
 * A `Pressable` that gives under the finger and springs back when it is let go.
 *
 * Every control in the app outside the games goes through this, so that a tap
 * feels the same everywhere: the buttons, the answer cards, the back arrow, the
 * appearance switch, the disclosure line, the skip. One press, one feel.
 *
 * ## Why not just dim it
 *
 * What was here before was a dim — `pressed && { opacity: 0.75 }` — and dimming
 * is what a link does, not what a button does. A button is a physical claim: it
 * sits above the page, it goes down when you push it, and it comes back when you
 * stop. The dim reported that a tap had registered; it never gave anything back.
 *
 * So the press is a fall and the release is a spring, and the spring is
 * deliberately under-damped: it passes 1 and settles a beat later, about a
 * percent over. That overshoot is the whole difference between a control that
 * returns and one that *pops* back, and at this size it is felt rather than
 * seen. Down is a fast timing rather than a spring, because a finger arriving is
 * not a thing that should bounce — only the letting go is.
 *
 * ## Depth is per control, and inverse to size
 *
 * A card the width of the screen moving 4% would swallow the page; a back arrow
 * moving 4% would be lost. Small targets take the deepest press. See `DEPTH`.
 *
 * ## What it keeps
 *
 * The `style` function form still works, `pressed` and all — several call sites
 * shade their background on press and that reads as the surface catching light
 * as it tilts, which is worth keeping next to the movement. It is tracked here
 * with state rather than left to `Pressable`, because the animated style has to
 * be composed into the same array and the function form would hide it.
 *
 * Reduce Motion is handed to Reanimated rather than branched on, the way
 * `disclosure.tsx` does it: both builders below carry `ReduceMotion.System`, so
 * the setting turns the fall and the spring into a cut without this component
 * knowing about it. A press still registers — it just arrives instead of moving,
 * which is what the old dim did anyway.
 */

import { useCallback, useState } from "react";
import {
  Pressable,
  type GestureResponderEvent,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import Animated, {
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from "react-native-reanimated";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * How far each kind of control travels, as the scale it presses down to.
 *
 * Inverse to the size of the thing: the same percentage is a shove on something
 * full-width and nothing at all on a word in the corner.
 */
export const DEPTH = {
  /** The pill buttons — the one real target on most screens. */
  button: 0.96,
  /** Full-width cards: answers, games, the worry options. */
  card: 0.98,
  /** Small text controls: back, appearance, the disclosure line, skip. */
  text: 0.93,
  /**
   * The 0–10 scale, and the deepest press in the app by some way.
   *
   * Eleven small squares in a row is the one control here that is genuinely
   * nice to use, and the only place a press is worth making a bit of a show of.
   * It is also the one screen asking for a number from someone who does not
   * especially want to give one, so a target that visibly enjoys being pressed
   * is doing something for the answer rate as well as for the feel.
   */
  chip: 0.88,
} as const;

export type PressDepth = keyof typeof DEPTH;

/** Fast, and eased out so it arrives rather than lands. A finger going down. */
const FALL = {
  duration: 90,
  easing: Easing.out(Easing.quad),
  reduceMotion: ReduceMotion.System,
} as const;

/**
 * Under-damped on purpose — ζ ≈ 0.42, which overshoots by about a fifth of the
 * distance travelled and settles inside 300ms. On a button pressing to 0.96
 * that is a peak around 1.01: a pop rather than a wobble.
 */
const SPRING = {
  damping: 12,
  stiffness: 400,
  mass: 0.5,
  reduceMotion: ReduceMotion.System,
} as const;

export interface PressableScaleProps extends Omit<PressableProps, "style"> {
  style?:
    | StyleProp<ViewStyle>
    | ((state: { pressed: boolean }) => StyleProp<ViewStyle>);
  /** Defaults to `button`. See `DEPTH`. */
  depth?: PressDepth;
}

export function PressableScale({
  depth = "button",
  style,
  onPressIn,
  onPressOut,
  ...rest
}: PressableScaleProps) {
  const [pressed, setPressed] = useState(false);

  const press = useCallback(
    (event: GestureResponderEvent) => {
      setPressed(true);
      onPressIn?.(event);
    },
    [onPressIn],
  );

  /**
   * Fires on a cancelled press as well as a completed one — a finger that slides
   * off the target still lets go of it, and a button left sitting depressed
   * because the tap was abandoned is worse than one that never moved.
   */
  const release = useCallback(
    (event: GestureResponderEvent) => {
      setPressed(false);
      onPressOut?.(event);
    },
    [onPressOut],
  );

  /**
   * The animation is returned from the style rather than pushed into a shared
   * value from the handlers, so there is exactly one piece of state here — the
   * boolean — and the movement is a function of it. Reanimated re-runs this when
   * `pressed` changes and animates to whichever end it now names.
   *
   * The other way round, a `useSharedValue` written to from `onPressIn`, is what
   * this was first, and it is two sources of truth for one press: the compiler's
   * immutability rule objects to the write, and rightly — nothing else in the
   * component can see it.
   */
  const animated = useAnimatedStyle(
    () => ({
      transform: [
        { scale: pressed ? withTiming(DEPTH[depth], FALL) : withSpring(1, SPRING) },
      ],
    }),
    [pressed, depth],
  );

  return (
    <AnimatedPressable
      {...rest}
      onPressIn={press}
      onPressOut={release}
      style={[typeof style === "function" ? style({ pressed }) : style, animated]}
    />
  );
}
