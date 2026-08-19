/**
 * An answer on one of the picker screens: the opening question, the topic
 * follow-up, and the offer of one last thing at the end.
 *
 * A full-width row rather than a chip: they carry a line of explanation each,
 * and the first screen's pair are the single most consequential tap in the
 * session — everything downstream branches on which one that is.
 *
 * It was a card until recently — a fill, an outline and a corner radius, with a
 * gap to the next one. `OptionList` draws the rules that replaced all of that,
 * and the note there is where the reasoning lives. What is left here is the
 * type, the padding that gives it a target, and the press.
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

import { StyleSheet } from 'react-native';

import { softGlow, ThemedText } from '@/components/themed-text';
import { PressableScale } from '@/components/ui/pressable-scale';
import { Spacing } from '@/constants/theme';
import { LIST_INSET } from '@/session/ui/option-list';
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
    // `card` depth — the shallowest. These run the full width of the column,
    // and a full-width surface travelling as far as a pill does reads as the
    // page moving rather than the row.
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`${label}. ${detail}`}
      onPress={onPress}
      depth="card"
      style={({ pressed }) => [
        styles.row,
        compact && styles.rowCompact,
        // Full width, unlike the rules above and below it: the highlight is the
        // target lighting up, and the target is the whole row.
        pressed && { backgroundColor: theme.backgroundElement },
      ]}>
      {/* `subtitle` glows on its own — see `GLOWS_SOFTLY` in `themed-text.tsx`
          — but `defaultSemiBold` doesn't, so the compact size needs the glow
          named explicitly to still read as a button rather than a caption. */}
      <ThemedText
        type={compact ? 'defaultSemiBold' : 'subtitle'}
        style={compact ? softGlow(theme.text) : undefined}>
        {label}
      </ThemedText>
      <ThemedText type={compact ? 'small' : 'default'} themeColor="textMuted">
        {detail}
      </ThemedText>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  // Indented to exactly where the rules above and below it start — see
  // `LIST_INSET`, which is that number and is derived from the line's width so
  // the two cannot come apart. The padding is on the row rather than the text
  // so the tap target keeps the full measure.
  row: {
    paddingVertical: Spacing.four,
    paddingHorizontal: LIST_INSET,
    gap: Spacing.two,
  },
  rowCompact: {
    paddingVertical: Spacing.three,
    gap: Spacing.half,
  },
});
