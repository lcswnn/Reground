/**
 * The 0–10 rating, as eleven buttons.
 *
 * Not a slider, and that is the whole design: a slider asks someone who is
 * upset to place a value precisely with a drag, and gets a worse answer for
 * more effort. Eleven targets is one tap.
 *
 * Wraps onto two rows on a phone rather than shrinking the targets below 44pt.
 */

import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { MOOD_SCALE } from '@/config/session';
import { useTheme } from '@/hooks/use-theme';

const VALUES = Array.from(
  { length: MOOD_SCALE.max - MOOD_SCALE.min + 1 },
  (_, index) => MOOD_SCALE.min + index,
);

interface MoodScaleProps {
  value: number | null;
  onChange: (value: number) => void;
  lowLabel: string;
  highLabel: string;
}

export function MoodScale({ value, onChange, lowLabel, highLabel }: MoodScaleProps) {
  const theme = useTheme();

  return (
    <View style={styles.root}>
      <View style={styles.row}>
        {VALUES.map((option) => {
          const selected = option === value;
          return (
            <Pressable
              key={option}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={`${option} out of ${MOOD_SCALE.max}`}
              onPress={() => onChange(option)}
              style={({ pressed }) => [
                styles.option,
                {
                  backgroundColor: selected ? theme.brand : theme.backgroundElement,
                  borderColor: selected ? theme.brand : theme.border,
                },
                pressed && !selected && { backgroundColor: theme.backgroundSelected },
              ]}>
              <ThemedText
                type="defaultSemiBold"
                style={{ color: selected ? theme.textOnBrand : theme.text }}>
                {option}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>

      {/* The ends are labelled because "10" on its own doesn't say which way
          the scale runs, and getting that backwards makes the whole session's
          one measurement meaningless. */}
      <View style={styles.legend}>
        <ThemedText type="small" themeColor="textMuted">
          {MOOD_SCALE.min} — {lowLabel}
        </ThemedText>
        <ThemedText type="small" themeColor="textMuted">
          {MOOD_SCALE.max} — {highLabel}
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  option: {
    minWidth: 46,
    height: 46,
    paddingHorizontal: Spacing.two,
    borderRadius: Radius.pill,
    borderWidth: StyleSheet.hairlineWidth * 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.two,
  },
});
