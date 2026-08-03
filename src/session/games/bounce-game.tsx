import { useEffect, useState } from "react";
import {
  GestureResponderEvent,
  LayoutChangeEvent,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import Animated, {
  FadeIn,
  runOnJS,
  useAnimatedStyle,
  useFrameCallback,
  useSharedValue,
} from "react-native-reanimated";

import { ThemedText } from "@/components/themed-text";
import { Radius, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

/**
 * Keep the ball in the air. That is the whole game.
 *
 * No score, no high score, no lives, no bricks. Those are all the same feature —
 * a reason to have done better — and this sits one tab away from a breathing
 * exercise in an app for people who have just read the news. A number going up
 * turns a fidget into a performance, and a number that stops going up turns it
 * into a loss. Dropping the ball here costs a tap.
 *
 * It is deliberately a *little* bit of a game: the ball is on a real arc under
 * gravity and leaves the paddle leaning toward whichever side of it was struck,
 * so it wanders and has to be followed. A ball that only ever went straight up
 * and down would need no paddle and hold nobody's attention for the thirty
 * seconds this is meant to occupy.
 */

/** Radius of the ball, in points. */
const BALL_RADIUS = 10;

/** The single number that decides how hard this is. Forgiving on purpose. */
const PADDLE_WIDTH = 90;
/**
 * Tall enough to still be a paddle once the dome is cut out of it.
 *
 * The face is drawn by clipping a circle to this box, so the crown sits at the
 * top and the tips are left with `PADDLE_HEIGHT - PADDLE_CURVE` of body. Deeper
 * curve, thinner tips — at the previous 16 this would leave about 5pt at the
 * edges, which the rounded bottom corners then eat into, and the paddle tapers
 * away to points. Raise this alongside `PADDLE_CURVE`.
 */
const PADDLE_HEIGHT = 23;

/**
 * How far the middle of the paddle bulges above its edges, in points.
 *
 * The paddle is domed rather than flat, and it is a real curve rather than a
 * decoration: the ball leaves along the surface normal at the point of contact,
 * so every part of the face throws it somewhere slightly different and a rally
 * wanders instead of settling into a column. A flat paddle has exactly one
 * normal, which is why the flat version needed the bounce angle faked.
 *
 * Kept as a proportion of the face rather than a fixed depth, so the dome keeps
 * its shape at any paddle width. A fixed depth on a narrow paddle would be very
 * nearly a half-circle, and every hit a wild deflection.
 *
 * This ratio is the difficulty dial as much as `PADDLE_WIDTH` is: it sets how
 * far a tip hit can throw the ball off vertical, which at 0.24 is about 25°
 * (it was 18° at 0.17). Push it much past this and the rally stops wandering
 * and starts ricocheting — the ball spends its time on the walls rather than
 * over the paddle, and the game asks for reactions instead of attention.
 */
const PADDLE_CURVE = (PADDLE_WIDTH / 2) * 0.28;

/**
 * The radius of the circle that dome is a slice of, solved from the paddle's
 * half-width `a` and the bulge `s`: `R = (a² + s²) / 2s`. Both the drawn shape
 * and the bounce are derived from this one number, so they cannot disagree —
 * the ball always leaves along the arc it visibly touched.
 */
const PADDLE_ARC_RADIUS =
  ((PADDLE_WIDTH / 2) ** 2 + PADDLE_CURVE ** 2) / (2 * PADDLE_CURVE);
/**
 * Gap between the paddle and the floor.
 *
 * Well clear of the bottom, which does two things: a near-miss is visibly a
 * miss rather than something that happened at the edge of the screen, and the
 * hand holding the phone is not covering the paddle it is moving.
 */
const PADDLE_INSET = 76;

/**
 * Downward acceleration, in points per second squared.
 *
 * The ball is on a real arc rather than a constant-speed reflection: it slows
 * as it rises, hangs at the top and comes back faster. That hang is the whole
 * character of the thing — it is what gives you time to read where the ball is
 * going and walk the paddle under it, instead of reacting to a line.
 */
const GRAVITY = 1200;

/**
 * How high a centred hit sends the ball, as a fraction of the board's height.
 *
 * Expressed against the board rather than as a fixed impulse so the arc is the
 * same shape on a small phone and a tablet — the launch speed is solved from
 * this and `GRAVITY` at the moment of contact.
 */
const APEX_RATIO = 0.62;

/** Where the ball is dropped from, as a fraction of the board's height. */
const SERVE_HEIGHT = 0.18;

/**
 * Ceiling on fall speed, in points per second.
 *
 * The physics is stable without it — the apex is bounded, so the impact speed
 * is too — but it costs nothing and it means a pathological frame cannot put
 * the ball through the paddle.
 */
const MAX_FALL_SPEED = 1400;

/**
 * Longest frame the physics will believe, in milliseconds.
 *
 * Coming back from a locked screen hands us one enormous delta, which without
 * this moves the ball a few thousand points in a single step — through the
 * paddle, through the floor, and the rally is lost to a notification.
 */
const MAX_FRAME_MS = 48;

type Status = "ready" | "playing";

export function BounceGame() {
  const theme = useTheme();
  const [status, setStatus] = useState<Status>("ready");

  // Board size lives in shared values as well as state: state is what lays the
  // board out, but the physics runs on the UI thread and cannot read it.
  const boardW = useSharedValue(0);
  const boardH = useSharedValue(0);
  const [hasSize, setHasSize] = useState(false);

  const ballX = useSharedValue(0);
  const ballY = useSharedValue(0);
  const vx = useSharedValue(0);
  const vy = useSharedValue(0);
  const paddleX = useSharedValue(0);

  /**
   * Whether the physics should still be integrating. Separate from `status`
   * because the miss is detected on the UI thread: `runOnJS` only schedules the
   * state update, so without this the next few frames keep running and fire the
   * miss again, and the ball carries on falling while React catches up.
   */
  const isLive = useSharedValue(false);

  // These three are deliberately plain functions rather than `useCallback`s.
  // Nothing downstream is memoised, so there is nothing to save — and a shared
  // value named in a dependency array is treated as owned by that hook, which
  // makes writing to it from a second one a lint error. Not worth contorting
  // the component around.
  const onLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    boardW.value = width;
    boardH.value = height;
    // Centred rather than left at zero, so the paddle is under the ball on the
    // first serve and in the middle again after a rotation.
    paddleX.value = width / 2;
    setHasSize(width > 0 && height > 0);
  };

  const start = () => {
    const width = boardW.value;
    const height = boardH.value;
    if (width <= 0 || height <= 0) return;

    // Near the top and at rest. Gravity does the serve: the ball simply starts
    // falling, which is both the clearest possible statement of what the game
    // is and the easiest first return there is. High, so the fall is long
    // enough to watch and the paddle is already where it needs to be.
    ballX.value = width / 2;
    ballY.value = height * SERVE_HEIGHT;
    vx.value = 0;
    vy.value = 0;

    // Back to centre for every serve, not just the first: wherever the last
    // rally left the paddle, the new ball falls down the middle, and starting
    // out of position is a miss the player had no hand in.
    paddleX.value = width / 2;

    isLive.value = true;
    setStatus("playing");
  };

  const end = () => setStatus("ready");

  const movePaddle = (event: GestureResponderEvent) => {
    const width = boardW.value;
    if (width <= 0) return;

    // Clamped so the paddle stays whole on screen. A paddle allowed to hang off
    // the edge turns the corners into dead zones the ball can hide in.
    const half = PADDLE_WIDTH / 2;
    paddleX.value = Math.max(
      half,
      Math.min(width - half, event.nativeEvent.locationX),
    );
  };

  const frame = useFrameCallback((info) => {
    if (!isLive.value) return;

    const dt =
      Math.min(info.timeSincePreviousFrame ?? MAX_FRAME_MS, MAX_FRAME_MS) /
      1000;
    const width = boardW.value;
    const height = boardH.value;

    vy.value = Math.min(vy.value + GRAVITY * dt, MAX_FALL_SPEED);

    // Where the underside of the ball was before this step, kept so the paddle
    // test can be a swept one — a fast ball can cross the paddle's whole
    // thickness within a single frame, and a test that only asks where the ball
    // *is* would let it through.
    const previousBottom = ballY.value + BALL_RADIUS;

    let x = ballX.value + vx.value * dt;
    let y = ballY.value + vy.value * dt;

    // Walls and ceiling. The position is corrected to the surface rather than
    // just reflecting the velocity: a ball that ends a frame beyond the wall
    // would flip again on the next one and buzz along the edge.
    if (x - BALL_RADIUS < 0) {
      x = BALL_RADIUS;
      vx.value = Math.abs(vx.value);
    } else if (x + BALL_RADIUS > width) {
      x = width - BALL_RADIUS;
      vx.value = -Math.abs(vx.value);
    }

    if (y - BALL_RADIUS < 0) {
      y = BALL_RADIUS;
      vy.value = Math.abs(vy.value);
    }

    const paddleTop = height - PADDLE_INSET - PADDLE_HEIGHT;

    // Only while descending, and only from above — a ball already past the
    // paddle is not scooped back up. Swept: it counts as a hit if the ball
    // crossed the paddle's top edge during the step, whether or not it happens
    // to be sitting on it now.
    if (
      vy.value > 0 &&
      previousBottom <= paddleTop &&
      y + BALL_RADIUS >= paddleTop &&
      Math.abs(x - paddleX.value) <= PADDLE_WIDTH / 2 + BALL_RADIUS
    ) {
      // The contact normal, which for a ball resting on a dome is the line
      // between the two centres — so the sideways component is the horizontal
      // miss over the sum of the radii, and the rest is vertical. Hit the crown
      // and the ball goes straight up; catch it further out and the face is
      // tilted there, so it leaves leaning, up to a clip off the very tip.
      // This is the entire skill in the game.
      //
      // The sum of the radii, rather than the arc's alone, is what makes a clip
      // behave: the ball touches the side of the dome at that point, not a
      // surface directly beneath its centre.
      const contactRadius = PADDLE_ARC_RADIUS + BALL_RADIUS;
      const offset = x - paddleX.value;
      const nx = Math.max(-1, Math.min(1, offset / contactRadius));
      const ny = Math.sqrt(1 - nx * nx);

      // Solved from the apex we want rather than set as a fixed impulse, so a
      // clean return reaches about the same height on any size of board:
      // v = sqrt(2 * g * h). An angled one trades some of that for sideways
      // travel and comes back sooner, which is the trade the curve is for.
      const speed = Math.sqrt(2 * GRAVITY * height * APEX_RATIO);
      vx.value = speed * nx;
      vy.value = -speed * ny;

      // Placed where a ball touching that point of the dome actually sits, so
      // an edge hit is not teleported up to the height of the crown. Straight
      // out along the normal from the arc's centre.
      y = paddleTop + PADDLE_ARC_RADIUS - contactRadius * ny;
    }

    ballX.value = x;
    ballY.value = y;

    // Missed. Off the bottom edge entirely, not level with the paddle — seeing
    // it fall past is what makes it read as a drop rather than a glitch.
    if (y - BALL_RADIUS > height) {
      isLive.value = false;
      runOnJS(end)();
    }
  }, false);

  useEffect(() => {
    frame.setActive(status === "playing");
  }, [frame, status]);

  const ballStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: ballX.value - BALL_RADIUS },
      { translateY: ballY.value - BALL_RADIUS },
    ],
  }));

  const paddleStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: paddleX.value - PADDLE_WIDTH / 2 }],
  }));

  return (
    <View
      style={[
        styles.board,
        { backgroundColor: theme.backgroundElement, borderColor: theme.border },
      ]}
      onLayout={onLayout}
      // The board itself is the control: the paddle goes where the finger is,
      // rather than having to be picked up first. Deliberately not the capture
      // variants — the start button is a child, and capturing here would eat
      // its taps.
      onStartShouldSetResponder={() => status === "playing"}
      onMoveShouldSetResponder={() => status === "playing"}
      onResponderTerminationRequest={() => false}
      onResponderGrant={movePaddle}
      onResponderMove={movePaddle}
      accessibilityLabel="Bouncing ball game. Drag to move the paddle and keep the ball in the air."
    >
      {/* `pointerEvents="none"` for the same reason as the slider's track:
          `locationX` is measured against whichever view the touch lands on, so
          a hittable ball or paddle would start reporting coordinates in its own
          box and the paddle would jump. */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.ball,
          ballStyle,
          {
            backgroundColor: theme.info,
            opacity: status === "playing" ? 1 : 0,
          },
        ]}
      />

      {/* The dome is drawn as the top slice of a large circle clipped to the
          paddle's box — the only way to get a true arc without pulling in an
          SVG renderer for one shape. `PADDLE_ARC_RADIUS` is the same number the
          bounce is computed from, so what you see is what the ball hits. */}
      <Animated.View pointerEvents="none" style={[styles.paddle, paddleStyle]}>
        {/* The same colour as the ball: the two are the only moving things on
            the board, and one palette between them says they belong to each
            other rather than being a piece and an obstacle. */}
        <View style={[styles.paddleFace, { backgroundColor: theme.info }]} />
      </Animated.View>

      {status === "ready" ? (
        <Animated.View entering={FadeIn.duration(300)} style={styles.overlay}>
          <ThemedText type="small" themeColor="textMuted" style={styles.hint}>
            Keep it in the air.
          </ThemedText>

          <Pressable
            onPress={start}
            // Nothing to press until the board has been measured — starting
            // against a zero-sized board would serve into nowhere.
            disabled={!hasSize}
            accessibilityRole="button"
            accessibilityLabel="Start"
            style={({ pressed }) => [
              styles.start,
              { backgroundColor: theme.brand },
              pressed && styles.startPressed,
            ]}
          >
            <ThemedText type="smallBold" style={{ color: theme.textOnBrand }}>
              Start
            </ThemedText>
          </Pressable>
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  board: {
    flex: 1,
    width: "100%",
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  ball: {
    position: "absolute",
    top: 0,
    left: 0,
    width: BALL_RADIUS * 2,
    height: BALL_RADIUS * 2,
    borderRadius: BALL_RADIUS,
  },
  paddle: {
    position: "absolute",
    left: 0,
    bottom: PADDLE_INSET,
    width: PADDLE_WIDTH,
    height: PADDLE_HEIGHT,
    // Clips the circle below into an arc. The bottom corners are rounded off
    // the box itself, which the crown never reaches.
    overflow: "hidden",
    borderBottomLeftRadius: Radius.sm,
    borderBottomRightRadius: Radius.sm,
  },
  // A circle wide enough that only the shallow top of it shows through the
  // paddle's box: `PADDLE_CURVE` at the crown, tapering to nothing at the tips.
  paddleFace: {
    position: "absolute",
    top: 0,
    left: PADDLE_WIDTH / 2 - PADDLE_ARC_RADIUS,
    width: PADDLE_ARC_RADIUS * 2,
    height: PADDLE_ARC_RADIUS * 2,
    borderRadius: PADDLE_ARC_RADIUS,
  },
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.three,
  },
  start: {
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.five,
    borderRadius: Radius.lg,
  },
  startPressed: { opacity: 0.75 },
  hint: { textAlign: "center" },
});
