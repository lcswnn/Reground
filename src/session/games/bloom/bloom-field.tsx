/**
 * Open the Flowers — the atmospheric one, on the calm shelf.
 *
 * A petal follows your finger across a field of closed buds, and everything it
 * passes opens. When the field is open, it drifts away and another one drifts
 * in. That is the whole game: there is nothing to lose, nothing to be quick
 * about, no wrong move, and no way to be behind.
 *
 * It is here because of the clinical work on Flower — twenty minutes of an
 * atmospheric game with no fail state moved heart rate and blood pressure about
 * as far as a body-scan meditation did in the same people. What that finding is
 * about is the *shape* of the activity: unhurried, continuous, impossible to
 * fail, and asking for attention without asking for effort. So that is what was
 * taken from it, rather than the setting or the story.
 *
 * The one on this shelf it is closest to is the ball and paddle, and the two are
 * deliberately not the same offer. The ball can still be dropped, which is a
 * tiny, recoverable failure, and some people want that much of a game. This one
 * has no failure in it at all — it is for the person who cannot face even that.
 *
 * ## What is deliberately missing
 *
 * No score, no count of fields finished, no timer, no completion bar, and no
 * "start". It is running the moment the screen appears and it does nothing at
 * all until a finger arrives, which is the point: someone who just wants to
 * watch it sit there for a minute is playing it correctly.
 *
 * ## Where the work happens
 *
 * The petal is animated on the UI thread, and each bud watches it from there
 * too — `useAnimatedReaction` per bud, running the same `within` test the field
 * module exports and the tests cover. A bud that is reached tells React once,
 * through its own latch, and the opening itself is driven from the state that
 * comes back. Doing the distance check on the JS thread instead would mean a
 * state update per frame per finger movement, which is exactly the kind of
 * stutter this particular game cannot afford.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  GestureResponderEvent,
  LayoutChangeEvent,
  StyleSheet,
  View,
} from 'react-native';
import Animated, {
  type SharedValue,
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { BLOOM_FIELD, SCORE } from '@/content/strings';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { mix, withAlpha } from '@/lib/color';
import { ScoreBar } from '@/session/games/ui/score-bar';
import { tickSelection } from '@/session/ui/haptics';
import { REACH, sowField, within, type Bud } from '@/session/games/bloom/field';

/** How many buds a field is sown with. Fewer come back if they will not fit. */
const FIELD_SIZE = 14;

/**
 * The board's shape before it has been measured.
 *
 * Stands in for the real one for the fraction of a second between the first
 * render and the first layout, during which there is no field and no finger, so
 * nothing it feeds can be wrong yet. A guess is still better than the division
 * by zero the alternative would be.
 */
const ASSUMED_ASPECT = 1.4;

/**
 * How the petal chases the finger. Soft and slightly overshooting on purpose:
 * the lag is what makes it read as something being carried on the air rather
 * than a cursor, and the overshoot is what makes it curl at the end of a stroke.
 */
const PETAL_SPRING = { damping: 12, stiffness: 90, mass: 0.9 } as const;

/**
 * The two shapes trailing behind it, each slacker than the last, which is the
 * whole of the ribbon effect. They chase the finger rather than the petal —
 * chasing a moving spring compounds the lag into a whipping motion, where
 * chasing the same point with less stiffness just arrives later.
 */
const TRAIL_SPRINGS = [
  { damping: 14, stiffness: 45, mass: 1 },
  { damping: 16, stiffness: 26, mass: 1.1 },
] as const;

/**
 * How long a bud takes to open, in milliseconds. Unhurried, like everything
 * here — and the one number that sets the pace of the whole game, since a hand
 * moving through a cluster leaves a row of these overlapping behind it.
 */
const OPEN_MS = 520;

/** How long a finished field is left up before it goes. */
const FULL_PAUSE_MS = 900;
/** The fade out and the fade in of a change of field. */
const FADE_MS = 520;

/** How far a bud drifts sideways, as a fraction of its own size, and how slowly. */
const SWAY = 0.16;
const SWAY_MS = 4200;

export function BloomField() {
  const theme = useTheme();

  const [box, setBox] = useState({ width: 0, height: 0 });
  const [buds, setBuds] = useState<Bud[]>([]);
  const [open, setOpen] = useState<ReadonlySet<number>>(() => new Set());
  /**
   * Every bud that has opened this visit, across however many fields have
   * drifted through — which is what makes it a score rather than a progress
   * bar. `open` is the current field alone and is reset with it.
   *
   * Counted whether or not anybody is looking: the number is cheap, and a
   * counter that only starts when the score is switched on would hand somebody
   * a zero for a field they had already finished.
   */
  const [opened, setOpened] = useState(0);

  const aspect = box.width > 0 ? box.height / box.width : ASSUMED_ASPECT;

  /** Normalized, so the petal is in the same coordinates the buds are sown in. */
  const petalX = useSharedValue(0.5);
  const petalY = useSharedValue(0.5);
  const trailX = [useSharedValue(0.5), useSharedValue(0.5)];
  const trailY = [useSharedValue(0.5), useSharedValue(0.5)];
  /** Faded up while a finger is down. The petal is not part of the scenery. */
  const petalShown = useSharedValue(0);
  /** Carries the whole field out and the next one in. */
  const fieldShown = useSharedValue(1);

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
   * The first field is sown by the first layout, not by an effect watching for
   * one. The measurement is the event that makes sowing possible, and sowing
   * from there is one render rather than a render, an effect and another render.
   *
   * `sown` is why it only happens once. A field is left alone for the rest of
   * the session — including through a rotation: the spacing between buds was
   * worked out for the shape the board was, so a turned phone has a field spaced
   * for the old shape, which is a couple of flowers sitting slightly closer
   * together than they would have. The alternative is throwing away a half-open
   * field because somebody turned their phone. The coordinates themselves are
   * fractions and stay right either way — see the note at the top of `field.ts`.
   */
  const sown = useRef(false);
  const measure = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setBox({ width, height });

    if (sown.current || width === 0 || height === 0) return;
    sown.current = true;
    setBuds(sowField(FIELD_SIZE, height / width));
  };

  /**
   * What is open, kept alongside the state as well as in it.
   *
   * `bloom` is handed to every bud and has to keep the same identity for the
   * life of the field — a new one on every flower would re-run fourteen
   * reactions each time one opened. Reading the ref is what lets it stay
   * dependency-free, and the guard has to be outside the state updater anyway:
   * React is free to call an updater twice, and a haptic fired from inside one
   * would be felt twice for one flower.
   */
  const openIds = useRef<ReadonlySet<number>>(new Set());
  const bloom = useCallback((id: number) => {
    if (openIds.current.has(id)) return;

    const next = new Set(openIds.current);
    next.add(id);
    openIds.current = next;
    setOpen(next);
    // Outside the state updater, alongside the haptic and for the same reason:
    // React may call an updater twice, and a flower counted twice is a score
    // that quietly runs ahead of the field.
    setOpened((count) => count + 1);
    tickSelection();
  }, []);

  /**
   * The end of a field, which is the only thing in this game that happens on its
   * own. The old one fades, a new one is sown behind the fade, and it comes
   * back up — rather than the flowers blinking out and being replaced, which
   * would read as the game restarting itself.
   */
  const changing = useRef(false);
  const finished = buds.length > 0 && open.size === buds.length;
  useEffect(() => {
    if (!finished || changing.current) return;
    changing.current = true;

    after(FULL_PAUSE_MS, () => {
      fieldShown.value = withTiming(0, { duration: FADE_MS });
      after(FADE_MS, () => {
        openIds.current = new Set();
        setBuds(sowField(FIELD_SIZE, aspect));
        setOpen(new Set());
        fieldShown.value = withTiming(1, { duration: FADE_MS });
        changing.current = false;
      });
    });
  }, [after, aspect, fieldShown, finished]);

  const follow = (event: GestureResponderEvent) => {
    if (box.width === 0 || box.height === 0) return;

    const x = event.nativeEvent.locationX / box.width;
    const y = event.nativeEvent.locationY / box.height;

    petalX.value = withSpring(x, PETAL_SPRING);
    petalY.value = withSpring(y, PETAL_SPRING);
    TRAIL_SPRINGS.forEach((spring, index) => {
      trailX[index].value = withSpring(x, spring);
      trailY[index].value = withSpring(y, spring);
    });
  };

  const take = (event: GestureResponderEvent) => {
    petalShown.value = withTiming(1, { duration: 180 });
    follow(event);
  };

  const release = () => {
    // Left where it landed rather than snapped away: the stroke ends by the
    // petal settling, which is the same thing the spring was already doing.
    petalShown.value = withTiming(0, { duration: 900 });
  };

  /** The next closed flower, for the one path that has no finger behind it. */
  const openNext = () => {
    const next = buds.find((bud) => !open.has(bud.id));
    if (next) bloom(next.id);
  };

  const fieldStyle = useAnimatedStyle(() => ({ opacity: fieldShown.value }));

  return (
    <View style={styles.root}>
      <ScoreBar score={SCORE.flowers(opened)} hint={BLOOM_FIELD.prompt} />

      <View
        style={[
          styles.board,
          { backgroundColor: theme.backgroundElement, borderColor: theme.border },
        ]}
        onLayout={measure}
        // The board is the control, the way the ball game's is: the petal goes
        // where the finger is rather than having to be picked up first.
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderTerminationRequest={() => false}
        onResponderGrant={take}
        onResponderMove={follow}
        onResponderRelease={release}
        onResponderTerminate={release}
        accessible
        accessibilityLabel={BLOOM_FIELD.boardLabel}
        // Dragging is not a gesture a screen reader passes through, and a game
        // that cannot be lost has nothing to protect by leaving it at that.
        accessibilityActions={BLOOM_FIELD.actions}
        onAccessibilityAction={(event) => {
          if (event.nativeEvent.actionName === 'open') openNext();
        }}>
        <Animated.View style={[StyleSheet.absoluteFill, fieldStyle]} pointerEvents="none">
          {buds.map((bud) => (
            <BudView
              key={bud.id}
              bud={bud}
              open={open.has(bud.id)}
              box={box}
              aspect={aspect}
              petalX={petalX}
              petalY={petalY}
              onReached={bloom}
            />
          ))}
        </Animated.View>

        {/* Behind the petal so a flower opening is never hidden by the thing
            that opened it. */}
        {TRAIL_SPRINGS.map((_, index) => (
          <Petal
            key={index}
            x={trailX[index]}
            y={trailY[index]}
            shown={petalShown}
            box={box}
            scale={0.62 - index * 0.18}
            alpha={0.28 - index * 0.1}
          />
        ))}
        <Petal x={petalX} y={petalY} shown={petalShown} box={box} scale={1} alpha={0.85} />
      </View>
    </View>
  );
}

/**
 * One bud, and the flower it becomes.
 *
 * It watches the petal itself rather than being told when it has been touched.
 * The reaction runs on the UI thread on every frame the petal moves, and the
 * latch is what keeps it to one message: without it, a petal resting on top of a
 * flower would call back sixty times a second for as long as it sat there.
 */
function BudView({
  bud,
  open,
  box,
  aspect,
  petalX,
  petalY,
  onReached,
}: {
  bud: Bud;
  open: boolean;
  box: { width: number; height: number };
  aspect: number;
  petalX: SharedValue<number>;
  petalY: SharedValue<number>;
  onReached: (id: number) => void;
}) {
  const theme = useTheme();

  const reached = useSharedValue(false);
  const opened = useSharedValue(0);
  const sway = useSharedValue(0);

  useAnimatedReaction(
    () => ({ x: petalX.value, y: petalY.value }),
    (petal) => {
      if (reached.value) return;
      if (!within(bud, petal.x, petal.y, REACH, aspect)) return;

      reached.value = true;
      runOnJS(onReached)(bud.id);
    },
    [bud, aspect],
  );

  useEffect(() => {
    opened.value = withTiming(open ? 1 : 0, { duration: OPEN_MS });
  }, [open, opened]);

  /**
   * Every bud drifts, always, at its own pace — the field is never quite still,
   * which is most of what separates this from a diagram of some dots. Started
   * from the bud's own position so no two are in step.
   */
  useEffect(() => {
    sway.value = withRepeat(
      withSequence(
        withTiming(1, { duration: SWAY_MS * (0.7 + bud.x * 0.6) }),
        withTiming(-1, { duration: SWAY_MS * (0.7 + bud.y * 0.6) }),
      ),
      -1,
      true,
    );
  }, [bud.x, bud.y, sway]);

  /** Sized off the board's width so a flower is the same size on any screen. */
  const size = Math.max(10, box.width * 0.1 * bud.size);
  const ink = mix(theme.backgroundElement, theme.brand, 0.62);
  const heart = mix(theme.backgroundElement, theme.brand, 0.9);

  const bloomStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: sway.value * size * SWAY },
      // A closed bud is a small tight thing; the flower it opens into is
      // half again as wide.
      { scale: 0.42 + opened.value * 0.58 },
      { rotate: `${opened.value * 24}deg` },
    ],
  }));

  const petalsStyle = useAnimatedStyle(() => ({ opacity: opened.value }));
  const budStyle = useAnimatedStyle(() => ({ opacity: 1 - opened.value }));

  /** The ring that spreads once as the flower opens, and is not seen again. */
  const ringStyle = useAnimatedStyle(() => ({
    opacity: opened.value * (1 - opened.value) * 2.4,
    transform: [{ scale: 0.6 + opened.value * 1.6 }],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.bud,
        bloomStyle,
        {
          width: size,
          height: size,
          left: bud.x * box.width - size / 2,
          top: bud.y * box.height - size / 2,
        },
      ]}>
      <Animated.View
        style={[
          styles.ring,
          ringStyle,
          { borderColor: withAlpha(theme.brand, 0.5), borderRadius: size },
        ]}
      />

      <Animated.View style={[StyleSheet.absoluteFill, petalsStyle]}>
        {PETAL_ANGLES.map((angle) => (
          <View
            key={angle}
            style={[
              styles.petal,
              {
                width: size * 0.34,
                height: size * 0.52,
                borderRadius: size * 0.26,
                backgroundColor: ink,
                left: size / 2 - size * 0.17,
                top: size / 2 - size * 0.26,
                transform: [{ rotate: `${angle}deg` }, { translateY: -size * 0.24 }],
              },
            ]}
          />
        ))}
        <View
          style={[
            styles.heart,
            {
              width: size * 0.22,
              height: size * 0.22,
              borderRadius: size * 0.11,
              backgroundColor: heart,
              left: size / 2 - size * 0.11,
              top: size / 2 - size * 0.11,
            },
          ]}
        />
      </Animated.View>

      <Animated.View
        style={[
          styles.closed,
          budStyle,
          {
            width: size * 0.3,
            height: size * 0.3,
            borderRadius: size * 0.15,
            backgroundColor: ink,
            left: size / 2 - size * 0.15,
            top: size / 2 - size * 0.15,
          },
        ]}
      />
    </Animated.View>
  );
}

/** Six petals, evenly round. Enough to read as a flower at a thumb's size. */
const PETAL_ANGLES = [0, 60, 120, 180, 240, 300];

/**
 * The thing being dragged, and the two shapes trailing it.
 *
 * Drawn as a leaf rather than a dot — one rounded corner squared off — because
 * a circle following a finger is a cursor, and this is supposed to be something
 * the air is carrying.
 */
function Petal({
  x,
  y,
  shown,
  box,
  scale,
  alpha,
}: {
  x: SharedValue<number>;
  y: SharedValue<number>;
  shown: SharedValue<number>;
  box: { width: number; height: number };
  scale: number;
  alpha: number;
}) {
  const theme = useTheme();
  const size = Math.max(8, box.width * 0.07 * scale);

  const style = useAnimatedStyle(() => ({
    opacity: shown.value * alpha,
    transform: [
      { translateX: x.value * box.width - size / 2 },
      { translateY: y.value * box.height - size / 2 },
      { rotate: '-20deg' },
    ],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.petalCursor,
        style,
        {
          width: size,
          height: size,
          borderTopLeftRadius: size / 2,
          borderTopRightRadius: size / 2,
          borderBottomRightRadius: size / 2,
          backgroundColor: theme.brand,
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
  bud: {
    position: 'absolute',
  },
  ring: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  petal: {
    position: 'absolute',
  },
  heart: {
    position: 'absolute',
  },
  closed: {
    position: 'absolute',
  },
  petalCursor: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
});
