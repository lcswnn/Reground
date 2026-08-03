/**
 * The extra step offered to GROUP B when the rating didn't move: attention
 * out of the image and into the room. The full 5-4-3-2-1, one prompt at a time
 * — the whole list at once is a task, one at a time is a thing you do.
 *
 * The sequence is driven entirely by `GROUNDING.steps`, so the count lives in
 * one place: add or cut a sense there and the "Next"/"Done" switch follows.
 *
 * ## The fades
 *
 * Nothing here cuts. The block fades up when it arrives, each prompt fades out
 * and the next fades in with a beat of nothing between them, and the last one
 * fades the whole thing away before the check-in. Timings are in
 * `GROUNDING_FADE`.
 *
 * It is a controlled crossfade — fade out, swap the text, fade in — rather than
 * the keyed `FadeIn`/`FadeOut` pair the breathing cues use. Those two words are
 * short enough to sit in a fixed-height slot with the outgoing one stacked on
 * top of the incoming one; these prompts run to three lines on a narrow phone
 * and are different lengths from each other, so overlapping them would mean
 * either a slot tall enough for the longest (a hole under the short ones) or a
 * button that jumps as they trade places. Only one prompt is ever mounted here.
 *
 * Nothing is typed, nothing is checked off, nothing is recorded.
 */

import { useRef, useState } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { GROUNDING_FADE } from '@/config/session';
import { GROUNDING } from '@/content/strings';
import { Spacing } from '@/constants/theme';

const EASING = Easing.inOut(Easing.quad);

export function GroundingSequence({ onDone }: { onDone: () => void }) {
  const reducedMotion = useReducedMotion();
  const [step, setStep] = useState(0);
  const isLast = step === GROUNDING.steps.length - 1;

  /**
   * The whole block, for the fade at the end. The one on arrival is `entering`
   * below instead — a shared value written from an effect is treated by the
   * compiler's lint as owned by that effect, and this one has to be written
   * from a press handler too. Same trap as the one documented in
   * `bounce-game.tsx`.
   */
  const block = useSharedValue(1);
  /** Just the prompt, which is the only thing that changes between steps. */
  const prompt = useSharedValue(1);

  /**
   * Held in a ref rather than state so a tap during a fade is ignored without
   * re-rendering — a `disabled` button would visibly dim and come back every
   * time someone pressed Next, which is a flicker in the one part of the app
   * that should be still.
   */
  const fading = useRef(false);
  const clearFading = () => {
    fading.current = false;
  };

  const showNext = () => {
    setStep((current) => current + 1);
    prompt.value = withDelay(
      GROUNDING_FADE.holdMs,
      withTiming(1, { duration: GROUNDING_FADE.inMs, easing: EASING }, (finished) => {
        'worklet';
        if (finished) runOnJS(clearFading)();
      }),
    );
  };

  const advance = () => {
    if (fading.current) return;

    if (reducedMotion) {
      if (isLast) onDone();
      else setStep(step + 1);
      return;
    }

    fading.current = true;

    // The end fades the block, not the prompt: the title and the button go with
    // it, so the screen empties rather than losing its middle and sitting there
    // with a "Done" button on it.
    if (isLast) {
      block.value = withTiming(
        0,
        { duration: GROUNDING_FADE.outMs, easing: EASING },
        (finished) => {
          'worklet';
          if (finished) runOnJS(onDone)();
        },
      );
      return;
    }

    prompt.value = withTiming(
      0,
      { duration: GROUNDING_FADE.outMs, easing: EASING },
      (finished) => {
        'worklet';
        if (finished) runOnJS(showNext)();
      },
    );
  };

  const blockStyle = useAnimatedStyle(() => ({ opacity: block.value }));
  const promptStyle = useAnimatedStyle(() => ({ opacity: prompt.value }));

  return (
    // Reduce Motion: the same steps, arriving instantly. Reanimated honours the
    // system setting on its own here — `ReduceMotion.System` is the default for
    // both layout animations and `withTiming` — so this needs no branch. The
    // handler above still checks by hand, because that path depends on a
    // completion callback to advance and should not be waiting on the animation
    // system at all when there is no animation.
    <Animated.View
      entering={FadeIn.duration(GROUNDING_FADE.inMs)}
      style={[styles.root, blockStyle]}>
      <ThemedText type="title">{GROUNDING.title}</ThemedText>

      <Animated.View style={[styles.prompt, promptStyle]}>
        <ThemedText type="subtitle">{GROUNDING.steps[step]}</ThemedText>
      </Animated.View>

      <Button title={isLast ? GROUNDING.done : GROUNDING.next} onPress={advance} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'center',
    gap: Spacing.four,
  },
  prompt: {
    minHeight: 120,
    justifyContent: 'center',
  },
});
