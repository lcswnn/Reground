/**
 * Screen 3's animation: cyclic sighing, guided by a shape rather than a clock.
 *
 * The pacing lives in `@/config/session`. The structure is two inhales stacked
 * onto each other, a beat at the top, then a long exhale — the second inhale
 * is short and sharp because it is a top-up rather than a breath of its own,
 * and the exhale runs about twice their combined length because that is the
 * part that actually moves you toward the parasympathetic side.
 *
 * The phase machine runs in JS rather than as a single Reanimated sequence,
 * because the haptics have to fire on phase boundaries and a worklet sequence
 * gives no clean hook for that. The circle itself is still animated on the UI
 * thread; only the four transitions per cycle cross back.
 */

import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { BREATHING, BREATH_CYCLE_MS } from '@/config/session';
import { BREATHING_COPY } from '@/content/strings';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { withAlpha } from '@/lib/color';
import { tickBreath } from '@/session/ui/haptics';

type Phase = 'inhale-1' | 'inhale-2' | 'hold' | 'exhale' | 'rest';

/**
 * Not zero, and not near it: an emptied circle reads as "finished" rather than
 * as the bottom of a breath.
 */
const MIN_SCALE = 0.44;
/** Where the first inhale stops, leaving the second one somewhere to go. */
const MID_SCALE = 0.82;

const DIAMETER_RATIO = 0.6;
const MAX_DIAMETER = 300;

interface Step {
  phase: Phase;
  ms: number;
  scale: number;
  easing: (value: number) => number;
  /** The two still phases get no tick — nothing is being asked of anyone. */
  haptic: boolean;
  cue: string | null;
}

const CYCLE: readonly Step[] = [
  {
    phase: 'inhale-1',
    ms: BREATHING.firstInhaleMs,
    scale: MID_SCALE,
    easing: Easing.out(Easing.cubic),
    haptic: true,
    cue: BREATHING_COPY.inhale,
  },
  {
    // `in`, not `out`: this one should accelerate into the top so it reads as
    // a snatched breath rather than a second slow one.
    phase: 'inhale-2',
    ms: BREATHING.secondInhaleMs,
    scale: 1,
    easing: Easing.in(Easing.quad),
    haptic: true,
    cue: BREATHING_COPY.secondInhale,
  },
  {
    // Held at full, and given no word of its own. The circle is visibly still,
    // which says it — and a "hold" cue at the top of a full breath is one more
    // instruction to read at the moment there is least room for one.
    phase: 'hold',
    ms: BREATHING.holdMs,
    scale: 1,
    easing: Easing.linear,
    haptic: false,
    cue: null,
  },
  {
    phase: 'exhale',
    ms: BREATHING.exhaleMs,
    scale: MIN_SCALE,
    easing: Easing.inOut(Easing.quad),
    haptic: true,
    cue: BREATHING_COPY.exhale,
  },
  {
    phase: 'rest',
    ms: BREATHING.restMs,
    scale: MIN_SCALE,
    easing: Easing.linear,
    haptic: false,
    cue: null,
  },
];

/** How long a cue takes to trade places with the next one. */
const CUE_FADE_MS = 600;

interface BreathingGuideProps {
  /** Called once, after the last full cycle. Never mid-exhale. */
  onDone: () => void;
}

export function BreathingGuide({ onDone }: BreathingGuideProps) {
  const theme = useTheme();
  const { width, height } = useWindowDimensions();
  const reducedMotion = useReducedMotion();

  const diameter = Math.min(Math.min(width, height) * DIAMETER_RATIO, MAX_DIAMETER);

  const scale = useSharedValue(MIN_SCALE);
  const progress = useSharedValue(0);
  /** `null` until the lead-in is over. Nothing is cued before the breath starts. */
  const [step, setStep] = useState<number | null>(null);

  // Held in a ref so the effect below can stay mounted for the whole minute
  // instead of tearing down and restarting the breath on every phase change.
  const onDoneRef = useRef(onDone);
  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

  useEffect(() => {
    // Cycles rather than a bare 60s cut-off: the breath finishes where it
    // started, at the bottom, instead of being interrupted somewhere in an
    // inhale.
    const cycles = Math.max(1, Math.round(BREATHING.totalMs / BREATH_CYCLE_MS));
    let index = 0;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    let cancelled = false;

    // Delayed by the same lead-in, so the line starts moving when the breath
    // does rather than while the circle is still.
    progress.value = withDelay(
      BREATHING.leadInMs,
      withTiming(1, { duration: cycles * BREATH_CYCLE_MS, easing: Easing.linear }),
    );

    // Reduce Motion: the circle opens once and stays open. Everything below
    // still runs, so the cues and the ticks keep pacing the breath.
    if (reducedMotion) scale.value = withTiming(1, { duration: 400 });

    const run = () => {
      if (cancelled) return;

      if (index >= cycles * CYCLE.length) {
        onDoneRef.current();
        return;
      }

      const current = CYCLE[index % CYCLE.length];
      setStep(index);

      if (current.haptic) tickBreath();

      // Honouring Reduce Motion by holding the circle still, rather than by
      // animating it more gently: someone who asked the system to stop things
      // moving asked for exactly that.
      if (!reducedMotion) {
        scale.value = withTiming(current.scale, {
          duration: current.ms,
          easing: current.easing,
        });
      }

      index += 1;
      timeout = setTimeout(run, current.ms);
    };

    // The circle sits at `MIN_SCALE` and the cue slot stays empty until this
    // fires. See `BREATHING.leadInMs`.
    timeout = setTimeout(run, BREATHING.leadInMs);

    return () => {
      cancelled = true;
      if (timeout) clearTimeout(timeout);
    };
  }, [progress, reducedMotion, scale]);

  const coreStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const haloStyle = useAnimatedStyle(() => ({
    // Trails the core by a fraction of the distance it has left, so the gap
    // between them has closed by the top of the breath instead of leaving a
    // ring that reads as the circle failing to fill.
    transform: [{ scale: scale.value + (1 - scale.value) * 0.3 }],
    opacity: 0.14 + (scale.value - MIN_SCALE) * 0.18,
  }));
  const progressStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: progress.value }],
  }));

  const cue = step === null ? null : CYCLE[step % CYCLE.length].cue;

  return (
    <View style={styles.root}>
      <View style={styles.cueSlot}>
        {cue ? (
          <Animated.View
            // Keyed on the word: this is a swap of one element for another,
            // which is what gives each cue its own fade.
            key={`${step}-${cue}`}
            entering={FadeIn.duration(CUE_FADE_MS)}
            exiting={FadeOut.duration(CUE_FADE_MS)}
            style={styles.cue}>
            <ThemedText type="subtitle" themeColor="textSecondary" style={styles.cueText}>
              {cue}
            </ThemedText>
          </Animated.View>
        ) : null}
      </View>

      <View style={[styles.stage, { width: diameter * 1.3, height: diameter * 1.3 }]}>
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
            { backgroundColor: withAlpha(theme.info, 0.2), borderColor: theme.info },
          ]}
        />
      </View>

      {/* The only indication of time left, and it is a hairline at a third
          opacity — visible if you look for it, invisible if you don't. A
          countdown here would be something to watch instead of the breath. */}
      <View style={[styles.track, { backgroundColor: theme.border }]}>
        <Animated.View
          style={[styles.fill, progressStyle, { backgroundColor: theme.textMuted }]}
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
    height: 34,
    alignSelf: 'stretch',
    justifyContent: 'center',
  },
  // Absolute so an outgoing word sits on top of the incoming one instead of
  // being laid out beside it.
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
  track: {
    width: 120,
    height: StyleSheet.hairlineWidth * 2,
    opacity: 0.35,
    overflow: 'hidden',
  },
  fill: {
    width: '100%',
    height: '100%',
    transformOrigin: 'left',
  },
});
