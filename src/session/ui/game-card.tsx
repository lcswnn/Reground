/**
 * One game on the picker.
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
    <>
      <View style={styles.heading}>
        <ThemedText type="sectionTitle" style={styles.title}>
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
    </>
  );

  if (locked) {
    return (
      <View
        accessible
        accessibilityLabel={`${title}. ${blurb} ${GAME_PICKER.lockedLabel}. ${GAME_PICKER.lockedHeading}.`}
        style={[
          styles.card,
          styles.locked,
          { backgroundColor: theme.background, borderColor: theme.border },
        ]}>
        {body}
      </View>
    );
  }

  return (
    // The card is a picker, not a game — it is the same card as `OptionCard`
    // wearing a different label, and it takes the same press. Nothing inside a
    // game does; see `PressableScale`.
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${blurb}`}
      onPress={onPress}
      depth="card"
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: theme.backgroundElement, borderColor: theme.border },
        pressed && { backgroundColor: theme.backgroundSelected },
      ]}>
      {body}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: Spacing.four,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth * 2,
    gap: Spacing.one,
  },
  // Sits *in* the page rather than on it — the unlocked cards are lifted off
  // the background, so a flat one reads as out of reach without needing to be
  // greyed into illegibility.
  locked: {
    opacity: 0.72,
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
