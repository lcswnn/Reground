/**
 * The sigh in miniature: a small circle running the real breath, with the three
 * steps beside it lit one at a time as it reaches them.
 *
 * It is the moving half of `sigh-example-modal.tsx`, which is what "See
 * example" on `breathe-intro.tsx` opens. Split from the panel around it because
 * the two are different things: that file is a card, a scrim and a way out,
 * and this one is the breath. Anywhere else that ever wants to show what a sigh
 * looks like — an aftercare screen, a settings page explaining the session —
 * wants this and not the modal.
 *
 * It is behind a tap because the intro screen exists to be still. The breath
 * starts when the user says so; something moving on arrival would take that
 * back with one hand while the Start button offered it with the other.
 *
 * ## Why an animation and not a diagram
 *
 * Three circles of increasing size with captions under them would fit in less
 * space and would be wrong in the one way that matters: the shape of a
 * physiological sigh is *when* the second inhale arrives — a snatched top-up on
 * a chest that is already most of the way full — and a still picture has no way
 * to say that. The whole reason someone taps this is that "two inhales, then a
 * long exhale" is a sentence they can read and still not know what to do with.
 *
 * ## It is the real breath, not an impression of one
 *
 * Every duration and every scale here comes from the same places
 * `breathing-guide.tsx` takes them from — `BREATHING` in `@/config/session`,
 * and the two scale constants below, which are that file's values. So the
 * example cannot promise a rhythm the next screen does not run, and
 * `SIGH_EXAMPLE.caption` can say so out loud. If the pacing is ever retuned,
 * this moves with it.
 *
 * What it deliberately does not share is the guide's haptics, its progress
 * track, its lead-in and its ending. This one has no end: it loops until the
 * disclosure is closed, which unmounts it and cancels the chain.
 */

import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
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

/**
 * Small enough to read as an illustration sitting beside its caption rather
 * than as a second breathing screen. The guide's circle is up to 300 points and
 * owns everything around it; this one has to share a row with three lines of
 * text and leave the Start button on screen underneath.
 */
const DIAMETER = 56;

/** Both from `breathing-guide.tsx`, and both load-bearing for the same reasons:
    an emptied circle reads as finished rather than as the bottom of a breath,
    and the first inhale has to stop short so the top-up has somewhere to go. */
const MIN_SCALE = 0.44;
const MID_SCALE = 0.82;

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
      <View style={styles.row}>
        {/* The stage is wider than the circle for the same reason the guide's
            is: the circle is drawn at full size and scaled down, so the box has
            to hold it at 1. */}
        <View style={styles.stage}>
          <Animated.View
            style={[
              styles.circle,
              haloStyle,
              { backgroundColor: theme.info },
            ]}
          />
          <Animated.View
            style={[
              styles.circle,
              coreStyle,
              { backgroundColor: withAlpha(theme.info, 0.2), borderColor: theme.info },
            ]}
          />
        </View>

        <View style={styles.steps}>
          {SIGH_EXAMPLE.steps.map((step, index) => (
            <Step key={step} label={step} active={index === active} />
          ))}
        </View>
      </View>

      <ThemedText type="small" themeColor="textMuted">
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
function Step({ label, active }: { label: string; active: boolean }) {
  const lit = useSharedValue(active ? 1 : STEP_DIM);

  useEffect(() => {
    lit.value = withTiming(active ? 1 : STEP_DIM, {
      duration: STEP_FADE_MS,
      reduceMotion: ReduceMotion.System,
    });
  }, [active, lit]);

  const style = useAnimatedStyle(() => ({ opacity: lit.value }));

  return (
    <Animated.View style={style}>
      {/* The tier stays `small` in both states and only the ink moves. Growing
          the active line would reflow the other two every phase, which is a
          list that fidgets rather than a list being read down. */}
      <ThemedText type="small" themeColor={active ? 'text' : 'textSecondary'}>
        {label}
      </ThemedText>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: Spacing.three,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.four,
  },
  stage: {
    width: DIAMETER,
    height: DIAMETER,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circle: {
    position: 'absolute',
    width: DIAMETER,
    height: DIAMETER,
    borderRadius: DIAMETER / 2,
    borderWidth: StyleSheet.hairlineWidth * 3,
    borderColor: 'transparent',
  },
  steps: {
    flex: 1,
    gap: Spacing.two,
  },
});
