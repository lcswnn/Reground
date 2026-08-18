/**
 * Knock the Pegs Out — the ball-and-targets game, on the calm shelf.
 *
 * Drag to aim, let go, and a ball falls through a field of pegs taking out
 * everything it touches. Then another ball. That is all of it.
 *
 * The rules it keeps from the games it comes from are the ones about the ball:
 * a real arc, a real bounce, and targets that go when they are hit. The rules it
 * does not keep are all the ones about the player — no score, no points per peg,
 * no colour of peg worth chasing, no ball count, no last ball, and no way to be
 * out. A ball that falls straight through having hit nothing costs one tap.
 *
 * There is no paddle, and that is a decision rather than an omission: the paddle
 * game is one card above this on the same shelf, and asking the same hand to do
 * the same thing twice is one offer, not two. What this one has instead is the
 * part of the genre `bounce` cannot give anybody — you make a single decision,
 * let go, and then have nothing to do but watch something happen.
 *
 * ## Where the work happens
 *
 * The ball is integrated on the UI thread in a frame callback, the same as the
 * paddle game's, because a ball whose position round-trips through React state
 * sixty times a second is a ball that stutters. The pegs live in both places:
 * their positions and whether they are still standing are mirrored into shared
 * values for the physics, and the React copy is what draws them and animates one
 * going out.
 *
 * ## Why the ball always leaves
 *
 * Nothing here has a timeout and nothing needs one. Every surface takes a bite
 * out of the ball's speed, gravity only ever points one way, and — the part that
 * actually guarantees it — a peg is taken off the board the moment it is
 * touched, so no ball can bounce off the same one twice. A ball cannot rattle
 * forever in a field that is running out of things to rattle against.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  GestureResponderEvent,
  LayoutChangeEvent,
  StyleSheet,
  View,
} from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useFrameCallback,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { PEG_DROP } from '@/content/strings';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { mix, withAlpha } from '@/lib/color';
import { tickDissolve, tickPlacement } from '@/session/ui/haptics';
import { bounceOff, layField, type Peg } from '@/session/games/pegs/playfield';

/** The ball, and the pegs, in points. Fixed rather than scaled: see `bounce-game`. */
const BALL_RADIUS = 8;
const PEG_RADIUS = 9;
/** Centres closer than this are touching. The one number the physics collides on. */
const CONTACT = BALL_RADIUS + PEG_RADIUS;

/** Downward acceleration, in points per second squared. */
const GRAVITY = 1100;

/**
 * Launch speed, as a multiple of `sqrt(gravity × board height)`.
 *
 * Expressed against the board rather than fixed so a drop takes about as long on
 * a small phone as on a tablet — the same trick, and the same reason, as
 * `APEX_RATIO` in the paddle game. Slow enough that the ball is followable and
 * fast enough that it reaches the far side of the field if aimed there.
 */
const LAUNCH_RATIO = 0.42;

/** How much of its speed a ball keeps, across the surface it hit. */
const PEG_BOUNCE = 0.88;
const WALL_BOUNCE = 0.94;

/** Ceiling on speed, so a pathological frame cannot put the ball through a peg. */
const MAX_SPEED = 1800;

/**
 * Physics steps per frame.
 *
 * A ball at full speed covers about 30 points in a frame, which is twice a peg's
 * width — quartering the step is what keeps it from passing through one between
 * two tests. The speed cap is the belt to this pair of braces.
 */
const SUBSTEPS = 4;

/** Longest frame the physics will believe. A locked screen hands us a huge one. */
const MAX_FRAME_MS = 48;

/** How far down the board the ball is released from. */
const LAUNCH_Y = 26;

/** The socket the ball sits in until it is let go, and the dots of the guide. */
const SOCKET_RADIUS = 7;
const GUIDE_DOT_RADIUS = 2;

/**
 * How far off straight down a ball can be aimed, in radians.
 *
 * Short of horizontal on purpose. A ball fired flat runs the ceiling from wall
 * to wall and takes several seconds to come down through anything, and the aim
 * that does it is easy to reach for by accident on a small board.
 */
const MAX_AIM = 1.15;

/** The dotted line out of the launcher, and how far apart the dots sit. */
const GUIDE_DOTS = 6;
const GUIDE_STEP = 17;
/**
 * How far the first dot's centre sits from the launcher's, so the line starts
 * against the ball rather than a gap away from it.
 *
 * The socket's radius plus the dot's, which puts their edges exactly touching.
 * Started at a whole `GUIDE_STEP` out and the line read as a separate thing
 * floating below the launcher — a direction the board was indicating, rather
 * than the way the ball in the socket was pointed.
 */
const GUIDE_START = SOCKET_RADIUS + GUIDE_DOT_RADIUS;

/** How long a peg takes to go once it has been hit. */
const OUT_MS = 260;
/** A cleared field, and the one that replaces it. */
const CLEAR_PAUSE_MS = 700;
const FADE_MS = 480;

type Status = 'aiming' | 'live';

export function PegDrop() {
  const theme = useTheme();

  const [box, setBox] = useState({ width: 0, height: 0 });
  const [pegs, setPegs] = useState<Peg[]>(() => layField());
  const [out, setOut] = useState<ReadonlySet<number>>(() => new Set());
  const [status, setStatus] = useState<Status>('aiming');

  const boardW = useSharedValue(0);
  const boardH = useSharedValue(0);

  const ballX = useSharedValue(0);
  const ballY = useSharedValue(0);
  const vx = useSharedValue(0);
  const vy = useSharedValue(0);
  /**
   * Whether the physics should still be integrating. Separate from `status` for
   * the reason the paddle game's is: the ball leaving is noticed on the UI
   * thread, `runOnJS` only schedules the state change, and without this the next
   * few frames keep running and report it again.
   */
  const flying = useSharedValue(false);
  /** 0 is straight down, positive is to the right. */
  const aim = useSharedValue(0);
  /** Up while a finger is aiming, so the guide is not part of the furniture. */
  const aiming = useSharedValue(0);
  const fieldShown = useSharedValue(1);

  /**
   * The pegs as the physics sees them: centres in points, and a flag each for
   * whether it is still standing. Read every frame; written from the two places
   * named at the effect and at `release` below.
   */
  const pegPoints = useSharedValue<{ x: number; y: number }[]>([]);
  const pegStanding = useSharedValue<boolean[]>([]);
  /**
   * The ids, in the same order, so the frame loop can name the peg it knocked
   * over instead of handing back a subscript for React to look up. It is the
   * only way the two sides can agree on which peg is which without the JS side
   * keeping its own copy of the field for the callbacks to read.
   */
  const pegIds = useSharedValue<number[]>([]);

  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const after = useCallback((ms: number, run: () => void) => {
    timers.current.push(setTimeout(run, ms));
  }, []);
  useEffect(
    () => () => {
      timers.current.forEach(clearTimeout);
      timers.current = [];
    },
    [],
  );

  /**
   * What is out, kept beside the state as well as in it — same arrangement as
   * the flower field's, and for the same two reasons. `knock` is called from the
   * frame loop and has to keep one identity, and the guard belongs outside the
   * state updater because React may run an updater twice and a haptic fired from
   * inside one would be felt twice for one peg.
   */
  const outIds = useRef<ReadonlySet<number>>(new Set());
  /**
   * Where the pegs are, in points, for the physics to collide against. Rebuilt
   * when the field is replaced and when the board is measured, which are the
   * only two things that move a peg.
   *
   * Which pegs are still standing is deliberately *not* set here. That flag has
   * exactly two writers — the frame loop, which owns it while a ball is in the
   * air, and `release`, which refreshes it from the authoritative set on the way
   * in. Refreshing it from an effect as well would be a third opinion arriving
   * at an unpredictable moment in between.
   */
  useEffect(() => {
    pegPoints.value = pegs.map((peg) => ({
      x: peg.x * box.width,
      y: peg.y * box.height,
    }));
    pegIds.value = pegs.map((peg) => peg.id);
    // Not dependencies: a shared value named in a dependency array is treated as
    // owned by that hook, which makes writing to it anywhere else a lint error.
    // See the same note in `bounce-game.tsx`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [box.height, box.width, pegs]);

  /** A peg knocked out, named by the id the frame loop read out of `pegIds`. */
  const knock = useCallback((id: number) => {
    if (outIds.current.has(id)) return;

    const next = new Set(outIds.current);
    next.add(id);
    outIds.current = next;
    setOut(next);
    tickPlacement();
  }, []);

  const spent = useCallback(() => setStatus('aiming'), []);

  /**
   * A cleared field, which is the only thing here that happens on its own. Left
   * up for a moment, faded out, and replaced — and only ever between balls, so
   * nothing renumbers under a ball that is still in the air.
   */
  const changing = useRef(false);
  const cleared = pegs.length > 0 && out.size === pegs.length;
  useEffect(() => {
    if (!cleared || status !== 'aiming' || changing.current) return;
    changing.current = true;

    after(CLEAR_PAUSE_MS, () => {
      fieldShown.value = withTiming(0, { duration: FADE_MS });
      after(FADE_MS, () => {
        outIds.current = new Set();
        setPegs(layField());
        setOut(new Set());
        fieldShown.value = withTiming(1, { duration: FADE_MS });
        tickDissolve();
        changing.current = false;
      });
    });
  }, [after, cleared, fieldShown, status]);

  const onLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    boardW.value = width;
    boardH.value = height;
    setBox({ width, height });
  };

  /** Where the finger is, as an angle off straight down from the launcher. */
  const point = (event: GestureResponderEvent) => {
    const width = boardW.value;
    if (width <= 0) return;

    const dx = event.nativeEvent.locationX - width / 2;
    // Clamped away from zero so a finger level with or above the launcher aims
    // sideways rather than backwards.
    const dy = Math.max(event.nativeEvent.locationY - LAUNCH_Y, 1);

    aim.value = Math.max(-MAX_AIM, Math.min(MAX_AIM, Math.atan2(dx, dy)));
    aiming.value = withTiming(1, { duration: 120 });
  };

  const release = () => {
    aiming.value = withTiming(0, { duration: 400 });

    const width = boardW.value;
    const height = boardH.value;
    if (width <= 0 || height <= 0) return;

    // The field as it stands, handed over at the moment it starts being used.
    // Everything that has happened to it since the last ball — pegs knocked out,
    // a whole new field — is in the set this reads.
    pegStanding.value = pegs.map((peg) => !outIds.current.has(peg.id));

    const speed = Math.sqrt(GRAVITY * height) * LAUNCH_RATIO;
    ballX.value = width / 2;
    ballY.value = LAUNCH_Y;
    vx.value = Math.sin(aim.value) * speed;
    vy.value = Math.cos(aim.value) * speed;

    flying.value = true;
    setStatus('live');
  };

  const frame = useFrameCallback((info) => {
    if (!flying.value) return;

    const dt =
      Math.min(info.timeSincePreviousFrame ?? MAX_FRAME_MS, MAX_FRAME_MS) / 1000;
    const step = dt / SUBSTEPS;
    const width = boardW.value;
    const height = boardH.value;
    const points = pegPoints.value;
    const ids = pegIds.value;

    // A copy per frame, written back only if something was knocked out. The
    // shared value's own array is left alone: mutating what a shared value holds
    // rather than replacing it is not a supported way to change one.
    const standingNow = pegStanding.value.slice();
    let knocked = false;

    for (let sub = 0; sub < SUBSTEPS; sub += 1) {
      vy.value = Math.min(vy.value + GRAVITY * step, MAX_SPEED);

      let x = ballX.value + vx.value * step;
      let y = ballY.value + vy.value * step;

      // Walls and ceiling. The position is corrected onto the surface rather
      // than only reflecting the velocity, or a ball that ends a step beyond the
      // wall flips again on the next one and buzzes along the edge.
      if (x - BALL_RADIUS < 0) {
        x = BALL_RADIUS;
        vx.value = Math.abs(vx.value) * WALL_BOUNCE;
      } else if (x + BALL_RADIUS > width) {
        x = width - BALL_RADIUS;
        vx.value = -Math.abs(vx.value) * WALL_BOUNCE;
      }

      if (y - BALL_RADIUS < 0) {
        y = BALL_RADIUS;
        vy.value = Math.abs(vy.value) * WALL_BOUNCE;
      }

      for (let index = 0; index < points.length; index += 1) {
        if (!standingNow[index]) continue;

        const hit = bounceOff(
          x,
          y,
          vx.value,
          vy.value,
          points[index].x,
          points[index].y,
          CONTACT,
          PEG_BOUNCE,
        );
        if (!hit) continue;

        x = hit.x;
        y = hit.y;
        vx.value = hit.vx;
        vy.value = hit.vy;
        standingNow[index] = false;
        knocked = true;
        runOnJS(knock)(ids[index]);
      }

      ballX.value = x;
      ballY.value = y;

      // Off the bottom edge entirely rather than level with the last row:
      // watching it fall clear is what makes the drop read as finished.
      if (y - BALL_RADIUS > height) {
        flying.value = false;
        runOnJS(spent)();
        break;
      }
    }

    if (knocked) pegStanding.value = standingNow;
  }, false);

  useEffect(() => {
    frame.setActive(status === 'live');
  }, [frame, status]);

  const ballStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: ballX.value - BALL_RADIUS },
      { translateY: ballY.value - BALL_RADIUS },
    ],
  }));

  /**
   * Negated, and it is not a fudge: `aim` and this rotation measure the same
   * angle in opposite directions.
   *
   * `aim` is the angle off straight down toward the right, which is what the
   * launch reads it as — `vx` is its sine and `vy` its cosine. A rotation on
   * screen is clockwise-positive over a y-axis that points down, so it takes the
   * dot at `(0, d)` below the launcher to `(-d·sin, d·cos)`: same angle, mirrored
   * horizontally. Rotating by `aim` directly pointed the guide exactly as far to
   * the left as the ball was about to travel to the right.
   */
  const guideStyle = useAnimatedStyle(() => ({
    opacity: 0.25 + aiming.value * 0.55,
    transform: [{ rotate: `${-aim.value}rad` }],
  }));

  const fieldStyle = useAnimatedStyle(() => ({ opacity: fieldShown.value }));

  return (
    <View style={styles.root}>
      <ThemedText type="small" themeColor="textMuted" style={styles.line}>
        {PEG_DROP.prompt}
      </ThemedText>

      <View
        style={[
          styles.board,
          { backgroundColor: theme.backgroundElement, borderColor: theme.border },
        ]}
        onLayout={onLayout}
        // The board is the control, the way the paddle game's is. Aiming is only
        // offered between balls: a ball in the air is not steerable, and a board
        // that accepted the gesture anyway would look like it was ignoring it.
        onStartShouldSetResponder={() => status === 'aiming'}
        onMoveShouldSetResponder={() => status === 'aiming'}
        onResponderTerminationRequest={() => false}
        onResponderGrant={point}
        onResponderMove={point}
        onResponderRelease={release}
        accessible
        accessibilityLabel={PEG_DROP.boardLabel}
        // Aiming by drag is not a gesture a screen reader passes through, and a
        // game with nothing to lose has nothing to protect by leaving it there.
        // Straight down is a perfectly good shot.
        accessibilityActions={PEG_DROP.actions}
        onAccessibilityAction={(event) => {
          if (event.nativeEvent.actionName !== 'drop' || status !== 'aiming') return;
          aim.value = 0;
          release();
        }}>
        <Animated.View style={[StyleSheet.absoluteFill, fieldStyle]} pointerEvents="none">
          {pegs.map((peg) => (
            <PegView key={peg.id} peg={peg} box={box} out={out.has(peg.id)} />
          ))}
        </Animated.View>

        {/* The launcher: a socket at the top of the board with the aim swinging
            out of it. Drawn under the ball so a ball leaving passes over it. */}
        <View
          pointerEvents="none"
          style={[styles.launcher, { left: '50%', top: LAUNCH_Y }]}>
          <Animated.View style={guideStyle}>
            {Array.from({ length: GUIDE_DOTS }, (_, index) => (
              <View
                key={index}
                style={[
                  styles.guideDot,
                  {
                    top: GUIDE_START + GUIDE_STEP * index,
                    backgroundColor: theme.brand,
                    // Fading out along its length, so it reads as a direction
                    // rather than as a promise about where the ball ends up.
                    opacity: 1 - index / GUIDE_DOTS,
                  },
                ]}
              />
            ))}
          </Animated.View>

          <View style={[styles.socket, { backgroundColor: theme.brand }]} />
        </View>

        <Animated.View
          pointerEvents="none"
          style={[
            styles.ball,
            ballStyle,
            { backgroundColor: theme.brand, opacity: status === 'live' ? 1 : 0 },
          ]}
        />
      </View>
    </View>
  );
}

/**
 * One peg: a ring while it is standing, and gone once it has been hit.
 *
 * Kept mounted after it goes rather than dropped from the list, so that what is
 * seen is the peg going out — and so the array the physics indexes into stays in
 * step with the one React is drawing.
 */
function PegView({
  peg,
  box,
  out,
}: {
  peg: Peg;
  box: { width: number; height: number };
  out: boolean;
}) {
  const theme = useTheme();
  const gone = useSharedValue(0);

  useEffect(() => {
    gone.value = withTiming(out ? 1 : 0, { duration: OUT_MS });
  }, [gone, out]);

  const style = useAnimatedStyle(() => ({
    opacity: 1 - gone.value,
    // A knocked peg swells as it fades rather than shrinking: it is being
    // struck, not deflating.
    transform: [{ scale: 1 + gone.value * 0.9 }],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.peg,
        style,
        {
          left: peg.x * box.width - PEG_RADIUS,
          top: peg.y * box.height - PEG_RADIUS,
          borderColor: mix(theme.backgroundElement, theme.brand, 0.75),
          backgroundColor: withAlpha(theme.brand, 0.12),
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignSelf: 'stretch',
    gap: Spacing.three,
  },
  line: {
    textAlign: 'center',
  },
  board: {
    flex: 1,
    width: '100%',
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  peg: {
    position: 'absolute',
    width: PEG_RADIUS * 2,
    height: PEG_RADIUS * 2,
    borderRadius: PEG_RADIUS,
    borderWidth: 2,
  },
  launcher: {
    position: 'absolute',
    width: 0,
    height: 0,
    alignItems: 'center',
  },
  guideDot: {
    position: 'absolute',
    width: GUIDE_DOT_RADIUS * 2,
    height: GUIDE_DOT_RADIUS * 2,
    borderRadius: GUIDE_DOT_RADIUS,
    left: -GUIDE_DOT_RADIUS,
  },
  socket: {
    position: 'absolute',
    width: SOCKET_RADIUS * 2,
    height: SOCKET_RADIUS * 2,
    borderRadius: SOCKET_RADIUS,
    left: -SOCKET_RADIUS,
    top: -SOCKET_RADIUS,
  },
  ball: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: BALL_RADIUS * 2,
    height: BALL_RADIUS * 2,
    borderRadius: BALL_RADIUS,
  },
});
