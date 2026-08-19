/**
 * One game on the picker.
 *
 * A row on a ruled list rather than a card — `OptionList` draws the lines and
 * carries the reasoning. What is left here is the title, the blurb, the lock
 * badge and the press.
 *
 * The locked variant is a `View` rather than a disabled `Pressable` on purpose:
 * there is nothing behind it yet, and a card that depresses under the finger
 * and then does nothing is worse than one that plainly isn't a button. It is
 * still in the reading order, and its accessibility label carries the lock and
 * the tier — neither is left to the badge and the section heading alone.
 */

import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { PressableScale } from '@/components/ui/pressable-scale';
import { GAME_PICKER } from '@/content/strings';
import { Radius, Spacing } from '@/constants/theme';
import { LIST_BLEED, LIST_INSET } from '@/session/ui/option-list';
import { useTheme } from '@/hooks/use-theme';

interface GameCardProps {
  title: string;
  blurb: string;
  onPress?: () => void;
  locked?: boolean;
}

export function GameCard({ title, blurb, onPress, locked = false }: GameCardProps) {
  const theme = useTheme();

  const body = (
    <View style={styles.content}>
      <View style={styles.heading}>
        <ThemedText type="subtitle" style={styles.title}>
          {title}
        </ThemedText>
        {locked ? (
          <View style={[styles.badge, { borderColor: theme.border }]}>
            <ThemedText type="eyebrow" themeColor="textMuted">
              {GAME_PICKER.lockedLabel}
            </ThemedText>
          </View>
        ) : null}
      </View>
      <ThemedText type="small" themeColor="textMuted">
        {blurb}
      </ThemedText>
    </View>
  );

  if (locked) {
    return (
      <View
        accessible
        accessibilityLabel={`${title}. ${blurb} ${GAME_PICKER.lockedLabel}. ${GAME_PICKER.lockedHeading}.`}
        style={[styles.row, styles.locked]}>
        {body}
      </View>
    );
  }

  return (
    // The row is a picker, not a game — it is the same row as `OptionCard`
    // wearing a different label, and it takes the same press. Nothing inside a
    // game does; see `PressableScale`.
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${blurb}`}
      onPress={onPress}
      depth="card"
      // No tint on press — the row gives instead. Same as `OptionCard`, and
      // the note is there.
      style={styles.row}>
      {body}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  // The pressable box, out past the column on both sides — see the note on
  // `row` in `option-card.tsx`, which this matches exactly.
  row: {
    marginHorizontal: -LIST_BLEED,
    paddingHorizontal: LIST_BLEED,
    paddingVertical: Spacing.four,
  },
  // And the part that lines up with the rules.
  content: {
    paddingHorizontal: LIST_INSET,
    gap: Spacing.two,
  },
  // Faded rather than filled differently: with the card gone there is no
  // surface left to draw a locked one on, and the badge and the section heading
  // say the rest. Held above the point where the blurb stops being legible.
  locked: {
    opacity: 0.55,
  },
  heading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  title: {
    flexShrink: 1,
  },
  badge: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: Radius.pill,
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
});
