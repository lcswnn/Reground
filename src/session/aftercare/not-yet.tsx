/**
 * What four of the five last-thing options currently do.
 *
 * The alternative was drawing them as locked cards, the way the game picker
 * draws its paid shelf. That is the right pattern for something behind a
 * purchase — the card is telling you what money would get you, and it would be
 * a lie for it to open. It is the wrong pattern here: nothing is being withheld,
 * the exercise simply hasn't been written yet, and a list where four of five
 * entries are greyed out reads as an app that is broken rather than one that is
 * young.
 *
 * So the cards are live and this is what is behind them, and it says the plain
 * thing. Two ways out and no dead end: back to the list, or done. "Done" is the
 * primary of the two because this is the last screen of the session either way,
 * and someone who has read "not built yet" has been given no reason to stay.
 *
 * This whole file goes when the last exercise lands.
 */

import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { GROUNDING_FADE } from '@/config/session';
import { NOT_YET } from '@/content/strings';
import { Spacing } from '@/constants/theme';

interface NotYetProps {
  /** The option they tapped, named back to them so the screen isn't a shrug. */
  title: string;
  /** Back to the list. Clears the choice — see `chooseOneMore`. */
  onBack: () => void;
  onDone: () => void;
}

export function NotYet({ title, onBack, onDone }: NotYetProps) {
  return (
    // Fades in for the same reason the grounding intro does: this is a phase of
    // a route rather than a route of its own, so no navigation animation covers
    // the handover and a straight swap would be a hard cut.
    <Animated.View
      entering={FadeIn.duration(GROUNDING_FADE.inMs)}
      style={styles.root}>
      <View style={styles.heading}>
        <ThemedText type="eyebrow" themeColor="textMuted">
          {NOT_YET.eyebrow}
        </ThemedText>
        <ThemedText type="title">{title}</ThemedText>
      </View>

      <ThemedText themeColor="textSecondary">{NOT_YET.body}</ThemedText>

      <View style={styles.actions}>
        <Button title={NOT_YET.done} onPress={onDone} />
        <Button title={NOT_YET.back} variant="ghost" onPress={onBack} />
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
    gap: Spacing.two,
    marginTop: Spacing.three,
  },
});
