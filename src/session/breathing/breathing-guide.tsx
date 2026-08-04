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
 *
 * Tully, on the top half, is driven from the same machine. They are drawn rather
 * than animated — six poses, and the breath is which one is showing — so they
 * cannot be interpolated the way the circle is, and they need their own beats
 * inside each phase. Those come from `tully-cycle.ts` and are scheduled off the
 * phase's own start below, so the two halves cannot drift apart no matter how
 * long the screen runs.
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
import { BREATHING, BREATH_CYCLES, BREATH_CYCLE_MS } from '@/config/session';
import { BREATHING_COPY } from '@/content/strings';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { withAlpha } from '@/lib/color';
import { BreathingTully } from '@/session/breathing/breathing-tully';
import { LEAD_IN_POSE, STILL_POSE, TULLY_CYCLE } from '@/session/breathing/tully-cycle';
import { tickBreath } from '@/session/ui/haptics';

type Phase = 'inhale-1' | 'inhale-2' | 'hold' | 'exhale' | 'rest';

/**
 * Not zero, and not near it: an emptied circle reads as "finished" rather than
 * as the bottom of a breath.
 */
const MIN_SCALE = 0.44;
/** Where the first inhale stops, leaving the second one somewhere to go. */
const MID_SCALE = 0.82;

/**
 * The circle used to own the screen. It now has the bottom half of it, so it
 * is bounded by height as well as width — on a short screen the width-derived
 * size would push the cue and the track into Tully.
 */
const DIAMETER_RATIO = 0.58;
const DIAMETER_HEIGHT_RATIO = 0.22;
const MAX_DIAMETER = 260;

/**
 * Tully, bounded on the same two axes as the circle so the pair keep their
 * relative sizes on any screen rather than one of them hitting a cap first.
 *
 * Sized as a square, and the artwork's 1.2 aspect means `contain` fits them to
 * the width and leaves the spare above and below. That spare is what they grow
 * into: the union crop is sized for their fullest pose, so at the bottom of the
 * breath they are a good deal shorter than the box. Deliberately smaller than
 * the circle — the circle is the thing to breathe with, and a Tully that
 * outweighs it turns the screen into a picture of Tully with a timer under it.
 */
const TULLY_RATIO = 0.44;
const TULLY_HEIGHT_RATIO = 0.19;
const MAX_TULLY = 190;

interface Step {
  phase: Phase;
  ms: number;
  scale: number;
  easing: (value: number) => number;
  /** The two still phases get no tick — nothing is being asked of anyone. */
  haptic: boolean;
  cue: string | null;
}

/** The Tully poses that fill each phase. Keyed so the two lists can't slip. */
const posesFor = (phase: Phase) => TULLY_CYCLE[phase];

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

  const diameter = Math.min(
    width * DIAMETER_RATIO,
    height * DIAMETER_HEIGHT_RATIO,
    MAX_DIAMETER,
  );
  const tullySize = Math.min(width * TULLY_RATIO, height * TULLY_HEIGHT_RATIO, MAX_TULLY);

  const scale = useSharedValue(MIN_SCALE);
  const progress = useSharedValue(0);
  /** `null` until the lead-in is over. Nothing is cued before the breath starts. */
  const [step, setStep] = useState<number | null>(null);
  /**
   * Starts at the floor of the breath, where the circle also starts, so Tully
   * is already sitting at the bottom when the screen fades in rather than
   * appearing mid-inhale.
   */
  const [pose, setPose] = useState<number>(LEAD_IN_POSE);

  // Held in a ref so the effect below can stay mounted for the whole minute
  // instead of tearing down and restarting the breath on every phase change.
  const onDoneRef = useRef(onDone);
  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

  useEffect(() => {
    // Cycles rather than a bare 60s cut-off: the breath finishes where it
    // started, at the bottom, instead of being interrupted somewhere in an
    // inhale. Derived in the config now, because the intro screen quotes this
    // number to the user before they start.
    const cycles = BREATH_CYCLES;
    let index = 0;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    // Tully's beats inside the current phase. At most four are ever pending,
    // and they are replaced wholesale on every phase change.
    let poseTimers: ReturnType<typeof setTimeout>[] = [];
    let cancelled = false;

    const clearPoses = () => {
      for (const id of poseTimers) clearTimeout(id);
      poseTimers = [];
    };

    /**
     * Re-anchored to the phase boundary every time, rather than chained off the
     * previous pose. Over four cycles a chain would accumulate every timer's
     * overshoot and Tully would end the minute visibly behind the circle;
     * this way each phase's error is at most one timer deep and never carries.
     */
    const schedulePoses = (beats: ReturnType<typeof posesFor>) => {
      clearPoses();
      setPose(beats[0].pose);

      let at = 0;
      for (let i = 1; i < beats.length; i += 1) {
        at += beats[i - 1].ms;
        const next = beats[i].pose;
        poseTimers.push(setTimeout(() => setPose(next), at));
      }
    };

    // Delayed by the same lead-in, so the line starts moving when the breath
    // does rather than while the circle is still.
    progress.value = withDelay(
      BREATHING.leadInMs,
      withTiming(1, { duration: cycles * BREATH_CYCLE_MS, easing: Easing.linear }),
    );

    // Reduce Motion: the circle opens once and stays open. Everything below
    // still runs, so the cues and the ticks keep pacing the breath. Tully's
    // half of this is a render-time substitution rather than a write from here
    // — see `shownPose`.
    if (reducedMotion) scale.value = withTiming(1, { duration: 400 });

    const run = () => {
      if (cancelled) return;

      if (index >= cycles * CYCLE.length) {
        clearPoses();
        onDoneRef.current();
        return;
      }

      const current = CYCLE[index % CYCLE.length];
      setStep(index);

      if (current.haptic) tickBreath();

      // Honouring Reduce Motion by holding the circle still, rather than by
      // animating it more gently: someone who asked the system to stop things
      // moving asked for exactly that. Tully is held for the same reason —
      // they are the louder of the two, so animating them here would defeat the
      // setting more than the circle would.
      if (!reducedMotion) {
        scale.value = withTiming(current.scale, {
          duration: current.ms,
          easing: current.easing,
        });
        schedulePoses(posesFor(current.phase));
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
      clearPoses();
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

  // Under Reduce Motion nothing schedules a pose, so `pose` is left at the
  // lead-in value. Substituting here rather than writing the still pose into
  // state keeps the effect free of a synchronous setState, and means Tully
  // is correct on the very first render instead of one render later.
  const shownPose = reducedMotion ? STILL_POSE : pose;

  return (
    <View style={styles.root}>
      {/* Top half. Tully is centred in it on both axes, which puts them
          directly over the circle below — the two share a centre line, so the
          screen reads as one column rather than two stacked things.

          The artwork's canvas is identical across all six poses, so Tully
          grow up and out of a fixed footprint as the breath fills them instead
          of shifting around as the pose changes. */}
      <View style={styles.tullyHalf}>
        <BreathingTully pose={shownPose} size={tullySize} still={reducedMotion} />
      </View>

      <View style={styles.breathHalf}>
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
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  // Two equal halves rather than one centred column. The split is the layout:
  // Tully is who you are breathing with and the circle is the breath, and
  // stacking them at the same weight is what stops either reading as decoration
  // hung off the other.
  tullyHalf: {
    flex: 1,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: Spacing.two,
  },
  breathHalf: {
    flex: 1,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
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
