/**
 * The extra step offered to GROUP B when the rating didn't move: attention
 * out of the image and into the room. Three prompts, one at a time — a list of
 * all three at once is a task, one at a time is a thing you do.
 *
 * Nothing is typed, nothing is checked off, nothing is recorded.
 */

import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { GROUNDING } from '@/content/strings';
import { Spacing } from '@/constants/theme';

export function GroundingSequence({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState(0);
  const isLast = step === GROUNDING.steps.length - 1;

  return (
    <View style={styles.root}>
      <ThemedText type="title">{GROUNDING.title}</ThemedText>

      <View style={styles.prompt}>
        <ThemedText type="subtitle">{GROUNDING.steps[step]}</ThemedText>
      </View>

      <Button
        title={isLast ? GROUNDING.done : GROUNDING.next}
        onPress={() => (isLast ? onDone() : setStep(step + 1))}
      />
    </View>
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
