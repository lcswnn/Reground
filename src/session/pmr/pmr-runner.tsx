/**
 * The routine, one instruction at a time.
 *
 * ## Why this is a script rather than a clock or a cycle
 *
 * It is the third thing in this step that runs on a timer and the first that is
 * neither of the other two shapes. The somatic timer counts down one duration,
 * because a movement is one instruction held for two minutes. The breath pacer
 * loops a fixed cycle, because a pattern is the same few seconds repeated. A
 * relaxation routine is a *script*: fourteen different instructions in a fixed
 * order, none of them repeating, each replacing the last.
 *
 * So the screen is the current instruction and nothing else — the cue, the part
 * of the body, and the sentence saying what to do to it. There is no list of
 * what is coming and no marker of where you are in it, which is a deliberate
 * difference from `somatic-timer.tsx`. That screen keeps the whole step list
 * under the clock because a movement is one thing you can lose track of inside.
 * Here, knowing that the legs are two instructions away is knowing something you
 * can do nothing with, and the entire instruction to the user is to have their
 * eyes shut and pay attention to one shoulder.
 *
 * ## Timing that cannot drift
 *
 * The steps are scheduled against one absolute anchor rather than each one
 * chaining the next. Fourteen chained timers would each contribute their own
 * overshoot and the last release would land measurably after where the progress
 * line says it should — the same failure `schedulePoses` avoids in
 * `breathing-guide.tsx`, over a longer run. Every step re-derives its delay from
 * `startAt`, so an error is at most one timer deep and never accumulates.
 *
 * ## The haptic is not decoration here
 *
 * Every routine's own instructions tell people to sit back and let their eyes
 * close, so for most of a run nobody is reading this. A missed boundary means
 * holding a squeeze through the release it was supposed to end — and the
 * contrast between those two is the whole technique. See `tickRelax`.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
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
import { Button } from '@/components/ui/button';
import { GROUNDING_FADE, PMR } from '@/config/session';
import { routineSteps, type PmrRoutine } from '@/content/pmr';
import { PMR_COPY } from '@/content/strings';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { tickRelax } from '@/session/ui/haptics';

/** How long a cue takes to trade places with the next one. */
const CUE_FADE_MS = 400;

interface PmrRunnerProps {
  routine: PmrRoutine;
  /** Called once, after the last release. */
  onDone: () => void;
  /** The user decided it was enough. */
  onStop: () => void;
}

export function PmrRunner({ routine, onDone, onStop }: PmrRunnerProps) {
  const theme = useTheme();
  const reducedMotion = useReducedMotion();

  const steps = useMemo(() => routineSteps(routine), [routine]);

  /** Where each step starts, and where the run ends, in ms from the first one. */
  const schedule = useMemo(() => {
    const offsets: number[] = [];
    let at = 0;
    for (const step of steps) {
      offsets.push(at);
      at += step.seconds * 1_000;
    }
    return { offsets, totalMs: at };
  }, [steps]);

  /** `null` for the lead-in, when there is nothing to do yet. */
  const [index, setIndex] = useState<number | null>(null);

  // Held in a ref so the effect below can stay mounted for the whole run
  // instead of tearing down and restarting the script on every step change.
  const onDoneRef = useRef(onDone);
  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

  useEffect(() => {
    // One anchor, fixed before anything runs. See the note above on drift.
    const startAt = Date.now() + PMR.leadInMs;
    let at = 0;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    let cancelled = false;

    const run = () => {
      if (cancelled) return;

      if (at >= steps.length) {
        onDoneRef.current();
        return;
      }

      setIndex(at);
      tickRelax();

      at += 1;
      const nextAt = at >= steps.length ? schedule.totalMs : schedule.offsets[at];
      // Clamped at zero: a device that slept through a step should land on the
      // next one immediately rather than being handed a negative delay.
      timeout = setTimeout(run, Math.max(0, startAt + nextAt - Date.now()));
    };

    timeout = setTimeout(run, PMR.leadInMs);

    return () => {
      cancelled = true;
      if (timeout) clearTimeout(timeout);
    };
  }, [schedule, steps]);

  /**
   * The whole run, filling. Delayed by the lead-in so it starts when the first
   * instruction does rather than while the user is still sitting back.
   */
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = 0;
    progress.value = withDelay(
      PMR.leadInMs,
      withTiming(1, { duration: schedule.totalMs, easing: Easing.linear }),
    );
  }, [progress, schedule.totalMs]);

  /**
   * The current instruction, filling. This is the one the user actually needs:
   * during a six-second squeeze the only question is how much longer, and it is
   * the question the cue word cannot answer. Reset and restarted per step
   * rather than animated continuously, because each step is its own promise.
   */
  const phase = useSharedValue(0);
  useEffect(() => {
    if (index === null) return;
    phase.value = 0;
    phase.value = withTiming(1, {
      duration: steps[index].seconds * 1_000,
      easing: Easing.linear,
    });
  }, [index, phase, steps]);

  const progressStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: progress.value }],
  }));
  const phaseStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: phase.value }],
  }));

  const step = index === null ? null : steps[index];

  /**
   * The cue word. On the cue-controlled routine it is the routine's own word
   * rather than "Let go" — that substitution is the entire technique, not a
   * flourish: the word is what is being attached to the feeling, so it has to
   * be the thing on screen at the moment of letting go. See its `evidence`.
   */
  const cue =
    step === null
      ? null
      : step.kind === 'tense'
        ? PMR_COPY.tense
        : (routine.word ?? PMR_COPY.release);

  return (
    <Animated.View entering={FadeIn.duration(GROUNDING_FADE.inMs)} style={styles.root}>
      <ThemedText type="eyebrow" themeColor="textMuted">
        {routine.count}
      </ThemedText>

      <View style={styles.stage}>
        {step === null || cue === null ? (
          // The lead-in. Says which way this is going, so the wait reads as part
          // of the exercise rather than as the app hesitating — the same job
          // `SOMATIC_COPY.leadIn` does, over a longer hold, because this one is
          // asking somebody to settle rather than to stand up.
          <Animated.View
            key="lead"
            entering={FadeIn.duration(GROUNDING_FADE.inMs)}
            exiting={FadeOut.duration(CUE_FADE_MS)}
            style={styles.beat}>
            <ThemedText type="subtitle" themeColor="textMuted" style={styles.centred}>
              {PMR_COPY.leadIn}
            </ThemedText>
          </Animated.View>
        ) : (
          <Animated.View
            // Keyed on the index, not the cue: consecutive steps often share a
            // word — every release in a routine says the same thing — and a key
            // that only tracked the word would leave one element's text
            // changing underneath a single animation.
            key={index}
            entering={FadeIn.duration(CUE_FADE_MS)}
            exiting={FadeOut.duration(CUE_FADE_MS)}
            style={styles.beat}>
            <ThemedText type="hero" style={styles.centred}>
              {cue}
            </ThemedText>
            <ThemedText type="subtitle" themeColor="textSecondary" style={styles.centred}>
              {step.group}
            </ThemedText>
            <ThemedText type="small" themeColor="textMuted" style={styles.centred}>
              {step.instruction}
            </ThemedText>

            {/* Skipped under Reduce Motion rather than animated more gently:
                Reanimated resolves `withTiming` instantly under that setting, so
                the bar would sit full for the whole step and read as an
                instruction that had already finished. The cue changing is what
                marks the boundary either way. Same call `somatic-timer.tsx`
                makes about its own track. */}
            {reducedMotion ? null : (
              <View style={[styles.phaseTrack, { backgroundColor: theme.border }]}>
                <Animated.View
                  style={[styles.fill, phaseStyle, { backgroundColor: theme.textMuted }]}
                />
              </View>
            )}
          </Animated.View>
        )}
      </View>

      {/* How far through the whole routine, as a hairline. Quieter than the
          per-step bar above it on purpose: which instruction you are on is
          worth knowing, and how many are left is not something anyone should be
          counting with their eyes shut. */}
      {reducedMotion ? null : (
        <View style={[styles.track, { backgroundColor: theme.border }]}>
          <Animated.View
            style={[styles.fill, progressStyle, { backgroundColor: theme.textMuted }]}
          />
        </View>
      )}

      <View style={styles.actions}>
        <Button title={PMR_COPY.stop} variant="ghost" onPress={onStop} />
        <ThemedText type="small" themeColor="textMuted" style={styles.hint}>
          {PMR_COPY.stopHint}
        </ThemedText>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignSelf: 'stretch',
    alignItems: 'center',
    gap: Spacing.four,
  },
  stage: {
    flex: 1,
    alignSelf: 'stretch',
    justifyContent: 'center',
  },
  // Absolute so an outgoing instruction sits on top of the incoming one instead
  // of being laid out beside it — the same arrangement, and the same reason, as
  // the cue slot in `breathing-guide.tsx`. Without it the two would stack for
  // the length of the fade and shunt the screen around on every boundary.
  beat: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    gap: Spacing.three,
  },
  centred: {
    textAlign: 'center',
  },
  phaseTrack: {
    width: 180,
    height: StyleSheet.hairlineWidth * 4,
    opacity: 0.5,
    overflow: 'hidden',
    marginTop: Spacing.two,
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
  actions: {
    alignSelf: 'stretch',
    gap: Spacing.two,
  },
  hint: {
    textAlign: 'center',
  },
});
