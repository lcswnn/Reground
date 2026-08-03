import { StyleSheet, View, type StyleProp, type TextStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface ValueTransitionProps {
  /** What this device displayed before the new measurement landed. */
  previous: string;
  /** What it displays now. */
  current: string;
  /** Colour for the new value — the caller already knows if this is good news. */
  color: string;
  /** Type scale, so the same component can lead a card or a section. */
  type?: 'title' | 'subtitle';
  style?: StyleProp<TextStyle>;
}

/**
 * `previous → current`, with the old number greyed and the new one in colour.
 *
 * Only rendered when a source actually published a new measurement — see
 * `lib/fresh-data`. Every metric here is a daily nowcast, so showing this on any
 * numeric difference would put an arrow on all thirteen cards every launch and
 * teach the reader to ignore it.
 *
 * One flowing row rather than two aligned columns: the pair wraps as a unit on
 * narrow screens, and a long value pushes the arrow rather than clipping it.
 */
export function ValueTransition({
  previous,
  current,
  color,
  type = 'title',
  style,
}: ValueTransitionProps) {
  const theme = useTheme();

  return (
    <View
      accessible
      // Read as a sentence: VoiceOver would otherwise announce a bare arrow
      // glyph between two numbers, which lands as "seventy three point two,
      // right arrow, seventy three point four".
      accessibilityLabel={`Previous value ${previous}, now ${current}`}
      style={styles.row}>
      <ThemedText type={type} style={[{ color: theme.textMuted }, style]}>
        {previous}
      </ThemedText>
      <ThemedText type={type} style={[styles.arrow, { color: theme.textMuted }, style]}>
        →
      </ThemedText>
      <ThemedText type={type} style={[{ color }, style]}>
        {current}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: Spacing.one,
  },
  arrow: {
    // The glyph carries more optical weight than the digits around it, and at
    // full opacity it reads as the loudest thing in the row.
    opacity: 0.7,
  },
});
