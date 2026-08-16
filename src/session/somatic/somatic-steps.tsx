/**
 * A movement's steps, numbered.
 *
 * Shared by the tutorial screen and the timer, which is the whole reason it is
 * a component: the list is the same list in both places, and it has to *look*
 * like the same list or the timer reads as having replaced the instructions
 * with a summary of them. `quiet` is the only difference — one step down the
 * type scale and into the muted colour, because under a running clock the steps
 * are a reference rather than the thing being read.
 *
 * Numbered rather than bulleted. These are in order and the order matters:
 * three of the six build on the position set up by the step before them, and a
 * bullet list says nothing about which comes first.
 *
 * The number is drawn in its own fixed-width column so that a step running to
 * three lines wraps against the text rather than under the digit. That is the
 * only thing the layout here is doing.
 */

import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';

interface SomaticStepsProps {
  steps: readonly string[];
  /** Under the clock, where the list is a reference and not the reading. */
  quiet?: boolean;
}

export function SomaticSteps({ steps, quiet = false }: SomaticStepsProps) {
  return (
    <View style={quiet ? styles.listQuiet : styles.list}>
      {steps.map((step, index) => (
        <View key={step} style={styles.row}>
          <ThemedText
            type={quiet ? 'small' : 'defaultSemiBold'}
            themeColor="textMuted"
            style={styles.number}>
            {index + 1}
          </ThemedText>
          <ThemedText
            type={quiet ? 'small' : 'default'}
            themeColor={quiet ? 'textMuted' : 'textSecondary'}
            style={styles.step}>
            {step}
          </ThemedText>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: Spacing.three,
  },
  listQuiet: {
    gap: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  number: {
    // Wide enough for a two-digit step it will never have, which costs nothing
    // and means the column cannot start jittering if a movement ever grows one.
    width: 22,
    textAlign: 'right',
  },
  step: {
    flex: 1,
  },
});
