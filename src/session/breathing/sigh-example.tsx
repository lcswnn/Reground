/**
 * The example run: the real breath, looping, with its three steps numbered
 * underneath and lit one at a time as the circle reaches them.
 *
 * It is the whole content of `app/example.tsx`, which is a screen of its own
 * reached from the breath's intro. It has been a disclosure and then a modal,
 * and both were the same mistake at different sizes: what is being shown is a
 * breath, a breath is watched rather than read, and a panel is what you put a
 * paragraph in.
 *
 * Split from the screen around it because the two are different things — that
 * file is a title, a way out and a route, and this is the breath. Anywhere else
 * that ever wants to show what a sigh looks like wants this and not that.
 *
 * ## Why an animation and not a diagram
 *
 * Three circles of increasing size with captions under them would fit in less
 * space and would be wrong in the one way that matters: the shape of a
 * physiological sigh is *when* the second inhale arrives — a snatched top-up on
 * a chest that is already most of the way full — and a still picture has no way
 * to say that. The whole reason somebody comes here is that "two inhales, then
 * a long exhale" is a sentence they can read and still not know what to do
 * with.
 *
 * ## It is the real breath, not an impression of one
 *
 * Every duration and every scale comes from the same places
 * `breathing-guide.tsx` takes them from — `BREATHING` in `@/config/session`,
 * and the two scale constants below, which are that file's values. So the
 * example cannot promise a rhythm the next screen does not run, and
 * `SIGH_EXAMPLE.caption` can say so out loud. If the pacing is ever retuned,
 * this moves with it.
 *
 * What it deliberately does not share is the guide's haptics, its progress
 * track and its ending. This one has no end: it loops until the screen is left,
 * which unmounts it and cancels the chain. No haptics because nobody is
 * breathing yet — a tap in the hand is an instruction, and the whole point of
 * this screen is that nothing is being asked of you on it.
 */

import { useEffect, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { BREATHING } from '@/config/session';
import { SIGH_EXAMPLE } from '@/content/strings';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { withAlpha } from '@/lib/color';
import {
  breathGlowSize,
  BreathGlow,
  GlowStage,
} from '@/session/ui/breath-glow';

/**
 * Bounded on both axes, like every circle in this app. It is deliberately
 * smaller than the real one — that is up to 300 points and owns its screen,
 * where this shares a page with three numbered steps and a button — and
 * deliberately far larger than the 56 points it was when this lived in a modal.
 * At that size it was an icon of a breath. This is meant to be watched.
 */
const DIAMETER_RATIO = 0.4;
const DIAMETER_HEIGHT_RATIO = 0.19;
const MAX_DIAMETER = 168;

/** Both from `breathing-guide.tsx`, and both load-bearing for the same reasons:
    an emptied circle reads as finished rather than as the bottom of a breath,
    and the first inhale has to stop short so the top-up has somewhere to go. */
const MIN_SCALE = 0.44;
const MID_SCALE = 0.82;

/**
 * The same reach the two full-size breathing circles run at — see `GLOW_REACH`
 * in `breathing-guide.tsx`. It is a multiplier rather than a distance, so a
 * 56-point circle gets a 56-point circle's worth of glow without anything here
 * being tuned for the size.
 */
const GLOW_REACH = 1.45;

/**
 * Stillness before the loop starts, and again before it starts over.
 *
 * The modal fades in around it, so without this the first inhale is already
 * underway while the card is still arriving — the same complaint
 * `BREATHING.leadInMs` exists to answer on the screen itself, at the smaller
 * size that a 56-point circle and an opening panel warrant.
 */
const LEAD_IN_MS = 320;

interface Beat {
  ms: number;
  scale: number;
  easing: (value: number) => number;
  /** Which of `SIGH_EXAMPLE.steps` is lit while this beat runs. */
  step: number;
}

/**
 * One round. The easings are the guide's, phase for phase — the first inhale
 * hands over with speed still on the circle so the top-up interrupts it, and
 * the top-up accelerates into the top so it reads as snatched. Those two curves
 * are the sigh; a pair of symmetric eases would play the same durations and
 * look like ordinary deep breathing.
 */
const ROUND: readonly Beat[] = [
  {
    ms: BREATHING.firstInhaleMs,
    scale: MID_SCALE,
    easing: Easing.bezierFn(0.33, 0, 0.55, 0.85),
    step: 0,
  },
  {
    ms: BREATHING.secondInhaleMs,
    scale: 1,
    easing: Easing.in(Easing.quad),
    step: 1,
  },
  // The beat at the top keeps the second step lit: nothing is being asked of
  // anyone during it, and there is no fourth line for it to move on to.
  {
    ms: BREATHING.holdMs,
    scale: 1,
    easing: Easing.linear,
    step: 1,
  },
  {
    ms: BREATHING.exhaleMs,
    scale: MIN_SCALE,
    easing: Easing.inOut(Easing.quad),
    step: 2,
  },
  {
    ms: BREATHING.restMs,
    scale: MIN_SCALE,
    easing: Easing.linear,
    step: 2,
  },
];

/** How long a step takes to come up or go down. Short: it trails the circle,
    and a step still brightening when the next phase begins would put two lines
    at full ink at once, which is the one thing this layout cannot say. */
const STEP_FADE_MS = 220;

/** Where an inactive line sits. Not invisible — all three are readable the
    whole time, because the list is also just the instructions. */
const STEP_DIM = 0.4;

export function SighExample() {
  const theme = useTheme();
  const reducedMotion = useReducedMotion();
  const { width, height } = useWindowDimensions();

  const diameter = Math.min(
    width * DIAMETER_RATIO,
    height * DIAMETER_HEIGHT_RATIO,
    MAX_DIAMETER,
  );

  const scale = useSharedValue(MIN_SCALE);
  const [active, setActive] = useState(0);

  useEffect(() => {
    let index = 0;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    let cancelled = false;

    // Reduce Motion: the circle opens once and stays open, exactly as the guide
    // handles it. The steps still take their turns — that is emphasis moving
    // rather than anything on screen moving, and it is what makes this a
    // sequence rather than a paragraph.
    if (reducedMotion) scale.value = withTiming(1, { duration: 400 });

    const run = () => {
      if (cancelled) return;

      const beat = ROUND[index % ROUND.length];
      setActive(beat.step);

      if (!reducedMotion) {
        scale.value = withTiming(beat.scale, {
          duration: beat.ms,
          easing: beat.easing,
        });
      }

      index += 1;
      // A round ends where it began, so the pause before starting over lands at
      // the bottom of the breath — the same place the lead-in holds.
      const nextIsRound = index % ROUND.length === 0;
      timeout = setTimeout(run, beat.ms + (nextIsRound ? LEAD_IN_MS : 0));
    };

    timeout = setTimeout(run, LEAD_IN_MS);

    return () => {
      cancelled = true;
      if (timeout) clearTimeout(timeout);
    };
  }, [reducedMotion, scale]);

  const coreStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const haloStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value + (1 - scale.value) * 0.3 }],
    opacity: 0.14 + (scale.value - MIN_SCALE) * 0.18,
  }));

  return (
    <View style={styles.root}>
      {/* Sized to the glow rather than to the circle — see `breathGlowSize`.
          The same rings and the same reach the real breathing screen wears:
          this is a picture of that screen, and a version of it that gave off a
          different amount of light would be a picture of something else. */}
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
            {
              width: diameter,
              height: diameter,
              borderRadius: diameter / 2,
              backgroundColor: theme.info,
            },
          ]}
        />
        <Animated.View
          style={[
            styles.circle,
            coreStyle,
            {
              width: diameter,
              height: diameter,
              borderRadius: diameter / 2,
              backgroundColor: withAlpha(theme.info, 0.2),
              borderColor: theme.info,
            },
          ]}
        />
      </GlowStage>

      {/* Under the circle rather than beside it, which is what the screen
          bought: three lines of instruction in a column beside a circle are a
          caption to it, and three numbered lines under it are the steps of the
          thing above them. */}
      <View style={styles.steps}>
        {SIGH_EXAMPLE.steps.map((step, index) => (
          <Step
            key={step}
            // The numbers are the component's rather than the copy's, so a step
            // cannot be written out of order or a number repeated when the
            // sentences are next rewritten.
            number={index + 1}
            label={step}
            active={index === active}
          />
        ))}
      </View>

      <ThemedText type="small" themeColor="textMuted" style={styles.caption}>
        {SIGH_EXAMPLE.caption}
      </ThemedText>
    </View>
  );
}

/**
 * One line of the list, holding its own dimming.
 *
 * A component rather than three animated styles in the parent because a hook
 * per step, written out in a loop, is the kind of thing that is fine until the
 * list is a different length. This way the list is data and the animation
 * belongs to the row.
 */
function Step({
  number,
  label,
  active,
}: {
  number: number;
  label: string;
  active: boolean;
}) {
  const lit = useSharedValue(active ? 1 : STEP_DIM);

  useEffect(() => {
    lit.value = withTiming(active ? 1 : STEP_DIM, {
      duration: STEP_FADE_MS,
      reduceMotion: ReduceMotion.System,
    });
  }, [active, lit]);

  const style = useAnimatedStyle(() => ({ opacity: lit.value }));

  return (
    <Animated.View style={[styles.step, style]}>
      {/* The number in the emphasis cut and the step in the reading one, so the
          column of numerals reads as a column rather than as the first word of
          each line. */}
      <ThemedText type="defaultSemiBold" themeColor={active ? 'text' : 'textSecondary'}>
        {number}
      </ThemedText>
      <ThemedText
        themeColor={active ? 'text' : 'textSecondary'}
        style={styles.stepText}>
        {label}
      </ThemedText>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    gap: Spacing.four,
  },
  circle: {
    position: 'absolute',
    borderWidth: StyleSheet.hairlineWidth * 3,
    borderColor: 'transparent',
  },
  steps: {
    alignSelf: 'stretch',
    gap: Spacing.three,
  },
  // Number and step on one line, at the gap the app puts between the lines of a
  // block. `flex-start` rather than centred: a step that wraps to two lines
  // should hang under its own first line, not straddle the numeral.
  step: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.three,
  },
  stepText: {
    flex: 1,
  },
  caption: {
    alignSelf: 'stretch',
  },
});
