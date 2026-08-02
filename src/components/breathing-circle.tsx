import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useEffect, useState } from 'react';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { withAlpha } from '@/lib/color';
import { useTheme } from '@/hooks/use-theme';

/**
 * The pacing of the breath, and the reason no two parts of it are equal.
 *
 * This is the physiological sigh: a long inhale, a second sharp one stacked on
 * top of it, then an exhale about twice the length of both together. The second
 * inhale is the part doing the work — it reinflates alveoli the first one left
 * collapsed, which is what lets the long exhale actually offload CO2 — and it
 * is short and sharp for the same reason, being a top-up rather than a breath
 * of its own.
 *
 * A long exhale is what shifts you toward the parasympathetic side, which is
 * why it is the longest segment here and why the circle closes at well under
 * half the speed it opened.
 *
 * There are two pauses and they are doing different jobs. The one at the top is
 * the beat at the end of a full breath. The one at the bottom is room to land
 * before being asked to start again — without it the next inhale begins on the
 * same frame the exhale ends, and the cycle reads as a loop rather than as
 * breaths. Both are kept short: a pause when you are already anxious is a
 * moment to notice you are not breathing, so it wants to be long enough to
 * register and no longer.
 */
const INHALE_MS = 3200;
const SECOND_INHALE_MS = 900;
const HOLD_MS = 600;
// Kept at roughly 1.5x the two inhales together. The ratio is the part that
// matters, so lengthening the inhale without moving this would quietly make the
// breath a less effective one rather than just a slower one.
const EXHALE_MS = 6100;
const REST_MS = 1000;
export const BREATH_CYCLE_MS =
  INHALE_MS + SECOND_INHALE_MS + HOLD_MS + EXHALE_MS + REST_MS;

/** Cumulative ends of each segment, which is what the cue is keyed off. */
const INHALE_END = INHALE_MS;
const HOLD_END = INHALE_END + SECOND_INHALE_MS + HOLD_MS;

/**
 * How small the circle gets. Not zero, and not close to it — an emptied circle
 * reads as "finished" rather than as the bottom of a breath, and the next
 * inhale then looks like the animation restarting.
 */
const MIN_SCALE = 0.42;

/**
 * Where the first inhale stops. Short of full on purpose: the gap left here is
 * what the second inhale has to fill, and if the first one arrives at the top
 * the sharp one has nowhere to go and reads as a stutter.
 */
const MID_SCALE = 0.82;

/**
 * How far behind the core the halo sits, as a fraction of the distance the core
 * still has left to travel. Zero would weld the two together and lose the soft
 * edge; at this value the halo is a visible glow around a small circle at the
 * bottom of the breath and has closed onto the core by the top of it.
 */
const HALO_TRAIL = 0.3;

/** Fraction of the shorter screen edge the circle spans when fully open. */
const DIAMETER_RATIO = 0.62;
/** Ceiling for tablets, where the ratio alone would produce a dinner plate. */
const MAX_DIAMETER = 320;

type Phase = 'inhale' | 'second-inhale' | 'exhale';

const CUES: Record<Phase, string> = {
  inhale: 'Inhale',
  'second-inhale': 'Second inhale',
  exhale: 'Exhale',
};

/**
 * How long a word takes to trade places with the next one.
 *
 * Slow, and slower than the change it is announcing. A cue that snaps is an
 * instruction; one that arrives over the better part of a second is closer to
 * the thing it is asking for. The two overlap rather than queueing, so the
 * word is never absent between phases.
 */
const CUE_FADE_MS = 700;

interface BreathingCircleProps {
  /** Paused until the splash has actually lifted, so the first breath is seen. */
  active?: boolean;
}

/**
 * A circle that breathes, and the first thing in the app.
 *
 * Deliberately not interactive, and labelled with one word at a time and
 * nothing else: the instruction is "follow this", and a legend, a timer or a
 * progress ring would all turn it back into something to attend to.
 *
 * Runs on the UI thread via Reanimated, so it keeps its rhythm while the tabs
 * underneath are still mounting and fetching. A breath that stutters because a
 * query resolved is worse than no breath.
 */
export function BreathingCircle({ active = true }: BreathingCircleProps) {
  const theme = useTheme();
  const { width, height } = useWindowDimensions();
  const reducedMotion = useReducedMotion();

  const diameter = Math.min(Math.min(width, height) * DIAMETER_RATIO, MAX_DIAMETER);

  const scale = useSharedValue(MIN_SCALE);
  /** Milliseconds into the current cycle. The cue reads this; the circle doesn't. */
  const elapsed = useSharedValue(0);
  const [phase, setPhase] = useState<Phase>('inhale');

  useEffect(() => {
    if (!active) return;

    // A second clock rather than deriving the cue from `scale`, because scale
    // is not monotonic and the two inhales pass through the same values — the
    // word would flicker between them. This one only ever counts forward.
    elapsed.value = withRepeat(
      withTiming(BREATH_CYCLE_MS, { duration: BREATH_CYCLE_MS, easing: Easing.linear }),
      -1,
      false,
    );

    // Reduce Motion is honored by holding the circle open rather than by
    // animating it more gently. Someone who has asked the system to stop
    // things moving has asked for exactly that, and the cue text still paces
    // the breath on its own — which is why the clock above runs regardless.
    if (reducedMotion) {
      scale.value = withTiming(1, { duration: 400 });
      return;
    }

    scale.value = withRepeat(
      withSequence(
        withTiming(MID_SCALE, { duration: INHALE_MS, easing: Easing.out(Easing.cubic) }),
        // `in`, not `out`: the sharp inhale should accelerate into the top so
        // it feels like a snatched breath rather than a second slow one.
        withTiming(1, { duration: SECOND_INHALE_MS, easing: Easing.in(Easing.quad) }),
        withTiming(1, { duration: HOLD_MS }),
        // `inOut` on the way down, not `out`: the exhale should leave slowly
        // and arrive slowly, so the bottom of the breath has no edge on it.
        withTiming(MIN_SCALE, { duration: EXHALE_MS, easing: Easing.inOut(Easing.quad) }),
        // The rest. Holding the value it already has, so this is stillness at
        // the bottom of the breath rather than another movement.
        withTiming(MIN_SCALE, { duration: REST_MS }),
      ),
      -1,
      false,
    );
  }, [active, reducedMotion, scale, elapsed]);

  // Crosses back to JS only on a change of word — three times a cycle, not once
  // a frame. Neither pause gets a word of its own: the circle is visibly still
  // at both, which says it without asking anyone to read something new at the
  // top of a full breath or in the space left for landing at the bottom.
  useAnimatedReaction(
    (): Phase => {
      const t = elapsed.value;
      if (t < INHALE_END) return 'inhale';
      if (t < HOLD_END) return 'second-inhale';
      return 'exhale';
    },
    (current, previous) => {
      if (current !== previous) runOnJS(setPhase)(current);
    },
  );

  const coreStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  // The halo trails the core rather than being offset from it: it sits a
  // fraction of the remaining distance ahead, so the gap between them closes
  // as the breath fills and is gone at the top. Offsetting instead — which is
  // what a `0.85 + scale * 0.3` style formula does — leaves the halo wider than
  // the core even at full, and that leftover ring reads as the circle failing
  // to fill on the second inhale rather than as a soft edge.
  const haloStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value + (1 - scale.value) * HALO_TRAIL }],
    opacity: 0.16 + (scale.value - MIN_SCALE) * 0.2,
  }));

  return (
    <View style={styles.root}>
      {/* Fixed-height slot so the circle does not shift when a one-word cue is
          replaced by a two-word one, and so the outgoing word can sit on top of
          the incoming one while they cross. */}
      <View style={styles.cueSlot}>
        <Animated.View
          // Keyed on the phase: this is a swap of one element for another, not
          // a text change, which is what gives each word its own fade.
          key={phase}
          entering={FadeIn.duration(CUE_FADE_MS)}
          exiting={FadeOut.duration(CUE_FADE_MS)}
          style={styles.cue}
        >
          <ThemedText type="subtitle" themeColor="textSecondary" style={styles.cueText}>
            {CUES[phase]}
          </ThemedText>
        </Animated.View>
      </View>

      <View style={[styles.stage, { width: diameter * 1.35, height: diameter * 1.35 }]}>
        <Animated.View
          style={[
            styles.circle,
            haloStyle,
            { width: diameter, height: diameter, borderRadius: diameter / 2 },
            { backgroundColor: theme.info },
          ]}
        />
        <Animated.View
          style={[
            styles.circle,
            coreStyle,
            { width: diameter, height: diameter, borderRadius: diameter / 2 },
            // Translucent rather than solid: at this size a flat fill is a
            // shape sitting on the page, and the wash lets the background
            // through so it reads as light instead.
            { backgroundColor: withAlpha(theme.info, 0.22), borderColor: theme.info },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    gap: Spacing.four,
  },
  cueSlot: {
    height: 32,
    alignSelf: 'stretch',
    justifyContent: 'center',
  },
  // Absolute so the two words overlap during the cross-fade instead of the
  // incoming one being laid out beside the one still leaving.
  cue: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  cueText: {
    letterSpacing: 2,
    textAlign: 'center',
  },
  stage: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  circle: {
    position: 'absolute',
    borderWidth: StyleSheet.hairlineWidth * 3,
    borderColor: 'transparent',
  },
});
