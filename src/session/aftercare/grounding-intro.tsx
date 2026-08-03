/**
 * What the 5-4-3-2-1 is, and a Start button. The front half of the grounding
 * step, in the same shape as `breathe-intro.tsx`.
 *
 * A phase of the aftercare screen rather than a route of its own, deliberately:
 * which aftercare a person gets is decided in exactly one place, and putting
 * this on its own route would mean deciding it a second time to know whether to
 * show it.
 *
 * It exists because the sequence used to open cold on "Find five things you can
 * see", which is an instruction arriving with no idea what it is the first of.
 *
 * Being a phase rather than a route also means no navigation animation covers
 * the handover, so it fades itself out before standing aside — otherwise Start
 * would cut straight to the first prompt, which is the one hard edge in an
 * exercise made of soft ones.
 */

import { useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { GROUNDING_FADE } from '@/config/session';
import { GROUNDING } from '@/content/strings';
import { Spacing } from '@/constants/theme';

const EASING = Easing.inOut(Easing.quad);

export function GroundingIntro({ onStart }: { onStart: () => void }) {
  const reducedMotion = useReducedMotion();
  /** For the fade out only; arriving is `entering` below. */
  const opacity = useSharedValue(1);
  /** See the note in `grounding-sequence.tsx`: a ref, so Start doesn't dim. */
  const leaving = useRef(false);

  const start = () => {
    if (leaving.current) return;

    if (reducedMotion) {
      onStart();
      return;
    }

    leaving.current = true;
    opacity.value = withTiming(
      0,
      { duration: GROUNDING_FADE.outMs, easing: EASING },
      (finished) => {
        'worklet';
        if (finished) runOnJS(onStart)();
      },
    );
  };

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      entering={FadeIn.duration(GROUNDING_FADE.inMs)}
      style={[styles.root, style]}>
      <ThemedText type="subtitle">{GROUNDING.intro}</ThemedText>

      <View style={styles.action}>
        <Button title={GROUNDING.start} onPress={start} />
        <ThemedText type="small" themeColor="textMuted" style={styles.hint}>
          {GROUNDING.introHint}
        </ThemedText>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'center',
    gap: Spacing.six,
  },
  action: {
    gap: Spacing.three,
  },
  hint: {
    textAlign: 'center',
  },
});
