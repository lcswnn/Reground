/**
 * An answer on one of the picker screens: the opening question, the topic
 * follow-up, and the offer of one last thing at the end.
 *
 * A full-width card rather than a chip: they carry a line of explanation each,
 * and the first screen's pair are the single most consequential tap in the
 * session — everything downstream branches on which one that is.
 *
 * `compact` exists because the topic screen has six of these where the entry
 * screen has two, and six at the full size do not fit on a phone. It is a
 * density change and nothing else: same shape, same detail line, one step down
 * the type scale. The alternative was making the topic list scroll, and a
 * decision screen where some of the options are below the fold is a worse
 * trade than smaller text.
 *
 * The last screen's five are compact for the same reason, and it does scroll —
 * nothing branches on that answer and the session ends either way, so an option
 * below the fold there costs a flick rather than a decision.
 */

import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface OptionCardProps {
  label: string;
  detail: string;
  onPress: () => void;
  /** For lists long enough that the full size would not fit. See above. */
  compact?: boolean;
}

export function OptionCard({ label, detail, onPress, compact = false }: OptionCardProps) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}. ${detail}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        compact && styles.cardCompact,
        { backgroundColor: theme.backgroundElement, borderColor: theme.border },
        pressed && { backgroundColor: theme.backgroundSelected },
      ]}>
      <ThemedText type={compact ? 'defaultSemiBold' : 'subtitle'}>{label}</ThemedText>
      <ThemedText type={compact ? 'small' : 'default'} themeColor="textMuted">
        {detail}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: Spacing.four,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth * 2,
    gap: Spacing.two,
  },
  // Horizontal padding is left alone — the gutter is what makes it read as a
  // card, and it is the vertical stacking that runs out of room.
  cardCompact: {
    paddingVertical: Spacing.three,
    gap: Spacing.half,
  },
});
