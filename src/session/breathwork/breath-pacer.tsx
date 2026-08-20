/**
 * The circle, paced by whichever pattern was picked.
 *
 * ## Why this is not `breathing-guide.tsx`
 *
 * The two are the same idea and deliberately not the same file. That one paces
 * the opening physiological sigh: a fixed five-phase cycle whose lengths are
 * tuning rather than instruction, with per-phase easings chosen to make a
 * snatched top-up read as snatched, and with Tully's nine poses scheduled
 * against phase names it hard-codes. Generalising it would mean making every
 * one of those decisions a parameter, and the parameter values that produced
 * the sigh are exactly the ones nobody should be able to change by accident.
 *
 * This one is the other case: a cycle read off data, of any length, where the
 * numbers are a promise made to the user by name — "4 in, hold 7, out 8" — and
 * the screen's whole job is to be exactly that long. So the phase machine here
 * is the same machine, and the differences are all in what the data is allowed
 * to say. Where a decision was made the same way twice, the note is over there.
 *
 * Three things this does differently, each because of what these patterns are:
 *
 *  - **Every phase gets a cue and a haptic, including the holds.** The sigh
 *    gives its still phases neither, on the argument that nothing is being
 *    asked of anyone during them. In a box breath a hold *is* what is being
 *    asked, and the boundary out of it is the moment a person with their eyes
 *    shut most needs telling about. A hold nobody is told to end is a hold that
 *    ends when they get uncomfortable, which is the pattern falling apart. It
 *    is a single tap rather than a train: a hold has nothing to pace.
 *  - **One easing for everything that moves.** `Easing.inOut(Easing.sin)`, which
 *    is what a paced-breathing guide is: constant speed through the middle of a
 *    phase, easing at each turn. The sigh needs four different curves because it
 *    is imitating one particular breath; these are metronomes.
 *  - **It counts rounds off the pattern rather than off a target duration.**
 *    `BREATH_CYCLES` exists over there because the sigh is asked for a minute
 *    and has to round to whole cycles. A pattern here carries its own round
 *    count, so there is nothing to round.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
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
import { Button } from '@/components/ui/button';
import { BREATHWORK, GROUNDING_FADE } from '@/config/session';
import {
  patternRunMs,
  type BreathPattern,
  type BreathPhaseKind,
} from '@/content/breathwork';
import { BREATHWORK_COPY } from '@/content/strings';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { withAlpha } from '@/lib/color';
import {
  breathGlowSize,
  BreathGlow,
  GlowStage,
} from '@/session/ui/breath-glow';
import { pulseBreath, tickBreath } from '@/session/ui/haptics';

/**
 * Not zero, and not near it: an emptied circle reads as "finished" rather than
 * as the bottom of a breath. Same value, same reason, as the sigh's.
 */
const MIN_SCALE = 0.44;

/**
 * How far the glow reaches past the circle. The same number the opening sigh
 * runs at, for the same reason — see `GLOW_REACH` in `breathing-guide.tsx`, and
 * `BreathGlow` for what it is reaching with. These two circles are drawn at the
 * same size on the same kind of screen, so a different reach here would be two
 * breathing screens giving off different amounts of light.
 */
const GLOW_REACH = 1.45;

/** The sigh's solo sizing — one ratio against the shorter side, and a cap. */
const DIAMETER_RATIO = 0.6;
const MAX_DIAMETER = 300;

/** How long a cue takes to trade places with the next one, at most. */
const CUE_FADE_MS = 600;
/**
 * And no cue may spend more than this share of its own phase arriving. Nothing
 * on this list is short enough for the cap to bite today — the briefest phase in
 * the four patterns is four seconds — but a pattern with a two-second phase in
 * it would otherwise show a word that was still fading up as it was due to
 * leave. See the same pair in `breathing-guide.tsx`, where it bites every cycle.
 */
const CUE_FADE_SHARE = 0.34;

const cueFadeFor = (ms: number) => Math.min(CUE_FADE_MS, Math.round(ms * CUE_FADE_SHARE));

const CUES: Readonly<Record<BreathPhaseKind, string>> = {
  in: BREATHWORK_COPY.in,
  full: BREATHWORK_COPY.hold,
  out: BREATHWORK_COPY.out,
  empty: BREATHWORK_COPY.hold,
};

/** Where the circle is by the end of each kind of phase. */
const SCALES: Readonly<Record<BreathPhaseKind, number>> = {
  in: 1,
  full: 1,
  out: MIN_SCALE,
  empty: MIN_SCALE,
};

interface Step {
  ms: number;
  scale: number;
  cue: string;
  /** Holds hold. Everything else swings on the one curve. See the note above. */
  moving: boolean;
  /**
   * What the phase does in the hand: a train of pulses through the two that are
   * a movement, and a single tap on the boundary of the two that are not. See
   * `breath-pulse.ts`, and the note at the top of this file on why a hold is
   * given a boundary here and not on the sigh.
   */
  kind: BreathPhaseKind;
}

interface BreathPacerProps {
  pattern: BreathPattern;
  /** Called once, after the last round. Never mid-phase. */
  onDone: () => void;
  /** The user decided it was enough. */
  onStop: () => void;
}

export function BreathPacer({ pattern, onDone, onStop }: BreathPacerProps) {
  const theme = useTheme();
  const { width, height } = useWindowDimensions();
  const reducedMotion = useReducedMotion();

  const diameter = Math.min(Math.min(width, height) * DIAMETER_RATIO, MAX_DIAMETER);

  const cycle = useMemo<readonly Step[]>(
    () =>
      pattern.phases.map((phase) => ({
        ms: phase.seconds * 1_000,
        scale: SCALES[phase.kind],
        cue: CUES[phase.kind],
        moving: phase.kind === 'in' || phase.kind === 'out',
        kind: phase.kind,
      })),
    [pattern],
  );

  const scale = useSharedValue(MIN_SCALE);
  const progress = useSharedValue(0);
  /** `null` until the lead-in is over. Nothing is cued before the breath starts. */
  const [step, setStep] = useState<number | null>(null);

  // Held in a ref so the effect below can stay mounted for the whole run
  // instead of tearing down and restarting the pattern on every phase change.
  const onDoneRef = useRef(onDone);
  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

  useEffect(() => {
    const steps = cycle.length * pattern.rounds;
    let index = 0;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    let cancelled = false;
    /** The pulse train of the phase now running. Stopped before the next one. */
    let stopPulses: (() => void) | undefined;

    // Delayed by the same lead-in as the breath, so the line starts moving when
    // the first inhale does rather than while the circle is still.
    progress.value = withDelay(
      BREATHWORK.leadInMs,
      withTiming(1, { duration: patternRunMs(pattern), easing: Easing.linear }),
    );

    // Reduce Motion: the circle opens once and stays open. Everything below
    // still runs, so the cues and the ticks keep the pattern — which matters
    // more here than on the sigh, because with the circle still they are the
    // only thing saying when a hold ends.
    if (reducedMotion) scale.value = withTiming(1, { duration: 400 });

    const run = () => {
      if (cancelled) return;

      if (index >= steps) {
        onDoneRef.current();
        return;
      }

      const current = cycle[index % cycle.length];
      setStep(index);

      // Every boundary is marked, holds included — see the note at the top of
      // this file. What differs is what happens after it: the two phases that
      // are a movement are paced all the way through, and a hold is left silent
      // until its own end.
      stopPulses?.();
      if (current.kind === 'in' || current.kind === 'out') {
        stopPulses = pulseBreath(current.kind === 'in' ? 'inhale' : 'exhale', current.ms);
      } else {
        stopPulses = undefined;
        tickBreath();
      }

      // Honouring Reduce Motion by holding the circle still rather than by
      // animating it more gently: someone who asked the system to stop things
      // moving asked for exactly that.
      if (!reducedMotion) {
        scale.value = withTiming(current.scale, {
          duration: current.ms,
          easing: current.moving ? Easing.inOut(Easing.sin) : Easing.linear,
        });
      }

      index += 1;
      timeout = setTimeout(run, current.ms);
    };

    // The circle sits at `MIN_SCALE` and the cue slot stays empty until this
    // fires. See `BREATHWORK.leadInMs`.
    timeout = setTimeout(run, BREATHWORK.leadInMs);

    return () => {
      cancelled = true;
      if (timeout) clearTimeout(timeout);
      stopPulses?.();
    };
  }, [cycle, pattern, progress, reducedMotion, scale]);

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

  const at = step === null ? null : step % cycle.length;
  const cue = at === null ? null : cycle[at].cue;

  /**
   * A cue arrives no slower than its own phase can afford, and leaves no slower
   * than the next one arrives — which is why `exiting` reads the *next* step.
   * Each word's fade-out plays after its element has been removed, so it is a
   * statement about the handover rather than about the phase it belongs to. The
   * lookup is static: the cycle is a fixed ring.
   */
  const cueEnterMs = at === null ? CUE_FADE_MS : cueFadeFor(cycle[at].ms);
  const cueExitMs =
    at === null ? CUE_FADE_MS : cueFadeFor(cycle[(at + 1) % cycle.length].ms);

  return (
    <Animated.View entering={FadeIn.duration(GROUNDING_FADE.inMs)} style={styles.root}>
      {/* The pattern's name, quiet and at the top. Four rounds in, "was this
          the one that holds for seven?" is a real question, and the alternative
          to answering it here is backing out of a running breath to find out. */}
      <ThemedText type="eyebrow" themeColor="textMuted">
        {pattern.count}
      </ThemedText>

      <View style={styles.stageArea}>
        <View style={styles.cueSlot}>
          {cue ? (
            <Animated.View
              // Keyed on the step: this is a swap of one element for another,
              // which is what gives each cue its own fade rather than one
              // element's text changing underneath a single animation. The index
              // is in the key because two rounds of a two-phase pattern would
              // otherwise re-use "In" and never animate.
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

        {/* Sized to the glow rather than to the circle — see `breathGlowSize`.
            The same rings the opening sigh and the door's sphere wear, at the
            sigh's tighter reach: this circle is the same size as that one and
            has the same amount of screen around it. */}
        <GlowStage size={breathGlowSize(diameter, GLOW_REACH)}>
          <BreathGlow
            scale={scale}
            minScale={MIN_SCALE}
            diameter={diameter}
            reach={GLOW_REACH}
            color={theme.info}
          />

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
        </GlowStage>

        {/* The only indication of how far through this is, and it is a hairline
            at a third opacity. A round counter here would be something to watch
            instead of the breath — the same call the sigh makes, and the reason
            the somatic clock is allowed to make the opposite one.

            Dropped entirely under Reduce Motion rather than animated more
            gently, for the reason `somatic-timer.tsx` gives about its own:
            Reanimated resolves `withTiming` instantly under that setting, so
            the line would fill the moment the pattern started and read as a
            run that had already finished. The cues are still pacing it. */}
        {reducedMotion ? null : (
          <View style={[styles.track, { backgroundColor: theme.border }]}>
            <Animated.View
              style={[styles.fill, progressStyle, { backgroundColor: theme.textMuted }]}
            />
          </View>
        )}
      </View>

      <View style={styles.actions}>
        <Button title={BREATHWORK_COPY.stop} variant="ghost" onPress={onStop} />
        <ThemedText type="small" themeColor="textMuted" style={styles.hint}>
          {BREATHWORK_COPY.stopHint}
        </ThemedText>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignSelf: 'stretch',
    gap: Spacing.four,
  },
  stageArea: {
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
  actions: {
    gap: Spacing.three,
  },
  hint: {
    textAlign: 'center',
  },
});
