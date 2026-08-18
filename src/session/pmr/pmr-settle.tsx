/**
 * The moment after the routine, which is the point of the routine.
 *
 * This screen has a stronger claim to existing than either of the other two
 * settle beats. The somatic one is there because the sources say to end on
 * something settled; the breathing one is there to stop people treating a paced
 * breath as their new normal. This one is there because *noticing the
 * difference is the technique*. Tensing a shoulder is a way of finding it;
 * letting it go is a way of feeling the contrast; and the transferable part —
 * the reason this is taught as a skill rather than a treat — is being able to
 * spot a held shoulder later in the day without being told. That recognition
 * only happens in the half minute afterwards, and only if nobody moves.
 *
 * Hence "Don't move yet" rather than a summary. And hence a body that asks
 * which parts went straight back to holding on, which is a question with a
 * useful answer either way: the part that crept back is the one worth knowing
 * about.
 *
 * `settleBody` accepts "nothing feels different" as a real answer, for the
 * reason `somatic-settle.tsx` sets out at length. Nothing is recorded.
 *
 * ## Three ways out
 *
 * Done with the session, the same routine again, or a different one. Weighted
 * so the primary ends the session — someone who has just been told not to move
 * should not have to hunt for the door.
 */

import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { GROUNDING_FADE } from '@/config/session';
import { PMR_COPY } from '@/content/strings';
import { Spacing } from '@/constants/theme';

interface PmrSettleProps {
  /** Out of the session. */
  onDone: () => void;
  /** The same routine again, from the top. */
  onAgain: () => void;
  /** Back to the four. */
  onAnother: () => void;
}

export function PmrSettle({ onDone, onAgain, onAnother }: PmrSettleProps) {
  return (
    <Animated.View entering={FadeIn.duration(GROUNDING_FADE.inMs)} style={styles.root}>
      <View style={styles.heading}>
        <ThemedText type="title">{PMR_COPY.settleTitle}</ThemedText>
        <ThemedText themeColor="textSecondary">{PMR_COPY.settleBody}</ThemedText>
      </View>

      <View style={styles.actions}>
        <Button title={PMR_COPY.settleDone} onPress={onDone} />
        <Button title={PMR_COPY.settleAgain} variant="secondary" onPress={onAgain} />
        <Button title={PMR_COPY.another} variant="ghost" onPress={onAnother} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'center',
    gap: Spacing.four,
  },
  heading: {
    gap: Spacing.two,
  },
  actions: {
    gap: Spacing.three,
  },
});
