/**
 * The extra step offered to GROUP A when the rating didn't move:
 * worry-postponement. The worry is not argued with and not resolved — it is
 * given a time, which is the whole mechanism.
 *
 * No notification is scheduled and nothing is stored. That is deliberate for
 * this slice: a reminder that pulls the user back into the app would undo the
 * one promise the closing screen makes. If this is ever persisted, it should
 * be a note the user finds when they next open the app, not a push.
 */

import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { PressableScale } from '@/components/ui/pressable-scale';
import { PARK_WORRY } from '@/content/strings';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function ParkWorry({ onDone }: { onDone: () => void }) {
  const theme = useTheme();
  const [choice, setChoice] = useState<string | null>(null);

  return (
    <View style={styles.root}>
      <ThemedText type="title">{PARK_WORRY.title}</ThemedText>
      <ThemedText themeColor="textSecondary">{PARK_WORRY.body}</ThemedText>

      <View style={styles.options}>
        {PARK_WORRY.options.map((option) => {
          const selected = option === choice;
          return (
            // These had no press feedback at all — the fill only changed once
            // the choice had landed, so the tap itself was silent.
            <PressableScale
              key={option}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              onPress={() => setChoice(option)}
              depth="card"
              style={[
                styles.option,
                {
                  backgroundColor: selected ? theme.brand : theme.backgroundElement,
                  borderColor: selected ? theme.brand : theme.border,
                },
              ]}>
              <ThemedText style={{ color: selected ? theme.textOnBrand : theme.text }}>
                {option}
              </ThemedText>
            </PressableScale>
          );
        })}
      </View>

      <View style={styles.footer}>
        {choice ? (
          <ThemedText themeColor="textSecondary">{PARK_WORRY.confirmation}</ThemedText>
        ) : null}
        <Button title={PARK_WORRY.done} disabled={!choice} onPress={onDone} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'center',
    gap: Spacing.four,
  },
  options: {
    gap: Spacing.two,
  },
  option: {
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  footer: {
    gap: Spacing.three,
  },
});
