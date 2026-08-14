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
 * than animated — nine poses, and the breath is which one is showing — so they
 * cannot be interpolated the way the circle is, and they need their own beats
 * inside each phase. Those come from `tully-cycle.ts` and are scheduled off the
 * phase's own start below, so the two halves cannot drift apart no matter how
 * long the screen runs.
 *
 * Tully is currently switched off — see `SHOW_TULLY`. Everything above is still
 * true of the code and stops being true of the screen only while that flag is
 * false.
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
 * Tully on the breathing screen: off for now, and one word from being back.
 *
 * Nothing was deleted to do this. The artwork, the pose cycle, the beats inside
 * each phase and the layout that gave them the top half are all still here and
 * all still correct — this only decides whether any of it runs. Flip to `true`
 * and the screen is exactly what it was: Tully above, circle below, sharing a
 * centre line. Left as `false`, the circle takes the whole screen back at the
 * size it had before Tully arrived, and their beats are never scheduled.
 *
 * Annotated `boolean` rather than left to infer `false`, so both branches stay
 * type-checked and neither rots while the flag is down.
 */
const SHOW_TULLY: boolean = false;

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
 * And the sizing from before that, for while Tully is off: one ratio against
 * the shorter side, because with nothing above it the circle is no longer
 * competing for height with anything and can go back to owning the screen.
 */
const SOLO_DIAMETER_RATIO = 0.6;
const SOLO_MAX_DIAMETER = 300;

/**
 * Tully, bounded on the same two axes as the circle so the pair keep their
 * relative sizes on any screen rather than one of them hitting a cap first.
 *
 * Sized as a square, and the artwork's 1.15 aspect means `contain` fits them to
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
    /**
     * Eases in, and then keeps going. It must not coast to a stop, because the
     * phase after it is the top-up and the handover is the whole shape of a sigh.
     *
     * This was `Easing.out(Easing.cubic)`, which had covered 99.2% of its travel
     * by 80% of the phase — the last half-second of the first inhale moved the
     * circle by under a point of scale, so it read as already finished and the
     * second inhale looked like it arrived after a pause. There was never a pause
     * in the machine; the phases are back to back. The stall was the curve.
     *
     * The bezier still starts gently — a breath doesn't jerk into motion — but
     * leaves about 12% of the travel in the final fifth and hands over with real
     * speed on the circle. The top-up now interrupts the first inhale, which is
     * what it is supposed to do.
     */
    // `bezierFn`, not `bezier`: the latter returns a factory, and every other
    // entry in this table is a plain easing function.
    easing: Easing.bezierFn(0.33, 0, 0.55, 0.85),
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

/**
 * How long a cue takes to trade places with the next one, at most.
 *
 * At most, because 600ms is longer than the second inhale is allowed to be
 * interesting for. "In again" fades in over the same 600ms it used to take on
 * every other cue, inside a phase that only lasts `secondInhaleMs` — so the word
 * for the fastest movement in the breath was still arriving when the movement
 * was over, and the top-up read as late for the same reason the circle did.
 *
 * `cueFadeFor` caps it against the phase the cue belongs to. Long phases are
 * untouched; only the top-up is short enough for the cap to bite.
 */
const CUE_FADE_MS = 600;

/**
 * No cue may spend more than this share of its own phase arriving. A third
 * leaves the word fully up for the middle of the phase and still reads as a
 * fade rather than a cut.
 */
const CUE_FADE_SHARE = 0.34;

const cueFadeFor = (ms: number) => Math.min(CUE_FADE_MS, Math.round(ms * CUE_FADE_SHARE));

interface BreathingGuideProps {
  /** Called once, after the last full cycle. Never mid-exhale. */
  onDone: () => void;
}

export function BreathingGuide({ onDone }: BreathingGuideProps) {
  const theme = useTheme();
  const { width, height } = useWindowDimensions();
  const reducedMotion = useReducedMotion();

  const diameter = SHOW_TULLY
    ? Math.min(width * DIAMETER_RATIO, height * DIAMETER_HEIGHT_RATIO, MAX_DIAMETER)
    : Math.min(Math.min(width, height) * SOLO_DIAMETER_RATIO, SOLO_MAX_DIAMETER);
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
    // Tully's beats inside the current phase. At most six are ever pending,
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
        // No timers for a Tully nobody can see: with the flag down this is the
        // only thing between the phase machine and up to six pending callbacks
        // per phase, for a whole minute, driving a state update that renders
        // nothing.
        if (SHOW_TULLY) schedulePoses(posesFor(current.phase));
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

  const at = step === null ? null : step % CYCLE.length;
  const cue = at === null ? null : CYCLE[at].cue;

  /**
   * A cue arrives no slower than its own phase can afford, and leaves no slower
   * than the next one arrives.
   *
   * The second half is why `exiting` reads the *next* step rather than this one.
   * Each word's fade-out plays after its element has been removed, so it is a
   * statement about the handover, not about the phase it belongs to — and "In"
   * dissolving over 600ms across the whole of a 700ms top-up is the other half
   * of what made the second inhale feel late. The lookup is static: the cycle is
   * a fixed ring, so the phase after this one is always known.
   */
  const cueEnterMs = at === null ? CUE_FADE_MS : cueFadeFor(CYCLE[at].ms);
  const cueExitMs =
    at === null ? CUE_FADE_MS : cueFadeFor(CYCLE[(at + 1) % CYCLE.length].ms);

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

          The artwork's canvas is identical across all nine poses, so Tully
          grow up and out of a fixed footprint as the breath fills them instead
          of shifting around as the pose changes. */}
      {SHOW_TULLY ? (
        <View style={styles.tullyHalf}>
          <BreathingTully pose={shownPose} size={tullySize} still={reducedMotion} />
        </View>
      ) : null}

      <View style={styles.breathHalf}>
        <View style={styles.cueSlot}>
          {cue ? (
            <Animated.View
              // Keyed on the word: this is a swap of one element for another,
              // which is what gives each cue its own fade.
              key={`${step}-${cue}`}
              entering={FadeIn.duration(cueEnterMs)}
              exiting={FadeOut.duration(cueExitMs)}
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
  // Two equal halves rather than one centred column, while there are two of
  // them. The split is the layout: Tully is who you are breathing with and the
  // circle is the breath, and stacking them at the same weight is what stops
  // either reading as decoration hung off the other.
  //
  // With `SHOW_TULLY` false the top half is not rendered at all, so `breathHalf`
  // is the only flex child and its `justifyContent: 'center'` centres the circle
  // on the screen rather than in a bottom half. Nothing here needs changing to
  // switch between the two.
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
