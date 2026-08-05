/**
 * Screen 0 — the door.
 *
 * Numbered 0 because it was put in front of a flow that was already numbered,
 * and moving every comment down one would cost more than it explains. Screen 1
 * is still the question that starts the session; this one starts nothing.
 *
 * One line and one button. The button says what the user was doing rather than
 * asking them to, which is the only thing it is for: something recognisable
 * enough to press without deciding anything. The choice that actually branches
 * the session — see `category.tsx` — is the next screen, unchanged.
 *
 * No session state is touched here. Someone who opens the app and puts it down
 * has done nothing that needs clearing.
 *
 * One of the two screens with no back button, the other being `closed.tsx`.
 * Nothing has happened yet, so there is nothing behind this to return to — see
 * `previousRoute`, which is where that decision is written down.
 */

import { useRouter } from "expo-router";
import { useRef } from "react";
import { Pressable, StyleSheet, View, useWindowDimensions } from "react-native";
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import { ThemedText } from "@/components/themed-text";
import { Spacing } from "@/constants/theme";
import { WELCOME } from "@/content/strings";
import { useTheme } from "@/hooks/use-theme";
import { tickSelection } from "@/session/ui/haptics";
import { SessionScreen } from "@/session/ui/session-screen";

/**
 * The press, in two movements: down under the finger, then up and away as the
 * screen leaves. It is the one flourish in the app, and it is here because this
 * is the only tap in the session that costs the user nothing — everything after
 * it is a question about how they feel, and none of those should bounce.
 */
const PRESS_IN_MS = 130;
const LIFT_MS = 420;
const FADE_MS = 380;
/** How far it gives under the finger, and how far it rises afterwards. */
const PRESS_SCALE = 0.97;
const LIFT_SCALE = 1.06;

/**
 * The circle, as a share of the screen's width and as a hard ceiling.
 *
 * A circle cannot use the full width the way a bar could — at the gutters it
 * would be a disc with the label crammed into a lens-shaped middle, and on a
 * tablet it would be enormous. This lands it comfortably inside the column with
 * room around it, which is most of why the shape reads as calm rather than as a
 * target.
 */
const DIAMETER_RATIO = 0.78;
const MAX_DIAMETER = 340;
/**
 * Share of the diameter the label is allowed. A circle's usable width is its
 * middle band, not its full span — text run to the edges would collide with the
 * curve on the first and last lines.
 *
 * Widened twice now to carry larger type without breaking "doomscrolling" onto
 * a line of its own at every size. This is the number to move if the label ever
 * crowds the curve: it trades margin for line length, and the two are the same
 * thing in a circle.
 */
const LABEL_WIDTH_RATIO = 0.78;

/**
 * The label's size, and the one place in the app that sits off the type scale.
 *
 * `title` (33) crowded the circle and `subtitle` (25) reads as a caption inside
 * something this large; the tier between them does not exist because no other
 * screen has ever needed it. Set here rather than added to `ThemedText` for
 * exactly that reason — a scale earns a step when a second caller wants it.
 *
 * Line height is proportionally tighter than the scale's, because this is three
 * short lines stacked in a circle rather than a paragraph: the scale's leading
 * would push the block against the curve top and bottom.
 */
const LABEL_FONT_SIZE = 29;
const LABEL_LINE_HEIGHT = 36;

export default function WelcomeScreen() {
  const router = useRouter();
  const theme = useTheme();
  const reducedMotion = useReducedMotion();
  const { width } = useWindowDimensions();

  const diameter = Math.min(width * DIAMETER_RATIO, MAX_DIAMETER);

  const scale = useSharedValue(1);
  const screen = useSharedValue(1);

  /** A ref, not state: the button must not re-render mid-animation. */
  const leaving = useRef(false);

  const go = () => router.replace("/category");

  const press = () => {
    if (leaving.current) return;
    leaving.current = true;

    tickSelection();

    if (reducedMotion) {
      go();
      return;
    }

    scale.value = withSequence(
      withTiming(PRESS_SCALE, {
        duration: PRESS_IN_MS,
        easing: Easing.out(Easing.quad),
      }),
      withTiming(LIFT_SCALE, {
        duration: LIFT_MS,
        easing: Easing.out(Easing.cubic),
      }),
    );

    // Held back until the button has finished giving way, so the two movements
    // read as cause and effect rather than as one thing happening twice.
    screen.value = withDelay(
      PRESS_IN_MS,
      withTiming(
        0,
        { duration: FADE_MS, easing: Easing.inOut(Easing.quad) },
        (finished) => {
          "worklet";
          if (finished) runOnJS(go)();
        },
      ),
    );
  };

  const screenStyle = useAnimatedStyle(() => ({ opacity: screen.value }));
  const buttonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <SessionScreen>
      <Animated.View style={[styles.root, screenStyle]}>
        {/* The question and the answer to it, laid out as a single block and
            centred on the page as one — so what sits in the middle of the
            screen is the pair, rather than either half of it.

            The line used to be pinned to the top with `position: absolute`,
            which kept it out of the button's way but meant the two were
            centred against different things: the question against the top of
            the screen, the circle against the whole of it. In the flow they
            are one column, and centring that column puts the middle of the
            pair on the middle of the page. The gap is the only thing holding
            them apart. */}
        <View style={styles.stack}>
          <ThemedText type="title" style={styles.title}>
            {WELCOME.title}
          </ThemedText>

          <Animated.View style={buttonStyle}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={WELCOME.action}
              onPress={press}
              style={({ pressed }) => [
                styles.action,
                {
                  width: diameter,
                  height: diameter,
                  borderRadius: diameter / 2,
                  backgroundColor: theme.brand,
                },
                // Only while the finger is down and nothing else is running —
                // once the animation has the button, the look is the
                // animation's to own.
                pressed && !leaving.current && styles.pressed,
              ]}
            >
              {/* `title` — the same tier as the question above it, which is as
                  large as a label with a thirteen-letter word in it can go
                  inside a circle. It wraps to three lines, which a circle wears
                  better than a bar would: the lines stack into the shape
                  instead of stretching it.

                  The shrink-to-fit is a floor, not the plan. "Doomscrolling" at
                  this size is within a few points of the band's width, and the
                  band is derived from the screen — on the narrowest phone still
                  supported it would otherwise break mid-word. It only engages
                  where it has to, and never below 80% of the size. */}
              <ThemedText
                type="title"
                numberOfLines={3}
                adjustsFontSizeToFit
                minimumFontScale={0.8}
                style={[
                  styles.actionLabel,
                  {
                    width: diameter * LABEL_WIDTH_RATIO,
                    color: theme.textOnBrand,
                  },
                ]}
              >
                {WELCOME.action}
              </ThemedText>
            </Pressable>
          </Animated.View>
        </View>
      </Animated.View>
    </SessionScreen>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  // The question and the circle as one block, centred on both axes. Everything
  // about where the pair sits on the page follows from this one rule; the gap
  // is what sets them apart from each other.
  stack: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.five,
  },
  title: {
    textAlign: "center",
  },
  // Sized in the component: a circle's dimensions depend on the screen, and a
  // stylesheet cannot see one.
  action: {
    alignItems: "center",
    justifyContent: "center",
  },
  actionLabel: {
    textAlign: "center",
    fontSize: LABEL_FONT_SIZE,
    lineHeight: LABEL_LINE_HEIGHT,
  },
  pressed: {
    opacity: 0.9,
  },
});
