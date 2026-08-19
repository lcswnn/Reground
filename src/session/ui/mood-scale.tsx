/**
 * The 0–10 rating, as eleven buttons.
 *
 * Not a slider, and that is the whole design: a slider asks someone who is
 * upset to place a value precisely with a drag, and gets a worse answer for
 * more effort. Eleven targets is one tap.
 *
 * Wraps onto two rows on a phone rather than shrinking the targets below 44pt.
 */

import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { PressableScale } from '@/components/ui/pressable-scale';
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
            // The deepest press in the app — see `chip` in `DEPTH`. These are
            // small enough to take it, there are eleven of them, and this is
            // the screen where a control that is fun to press is worth having.
            <PressableScale
              key={option}
              accessibilityRole="radio"
              depth="chip"
              accessibilityState={{ selected }}
              accessibilityLabel={`${option} out of ${MOOD_SCALE.max}`}
              onPress={() => onChange(option)}
              // Selected takes the accent rather than the ink it used to fill
              // with. The number a person picks here is the one answer the
              // whole session is measured on, and it is the one place in the
              // app where the user can see their own choice sitting on the
              // page — worth the hue, on a screen that is otherwise eleven
              // identical grey targets and two labels.
              //
              // `accentStrong` and not `accent`: the chip carries a numeral at
              // 17pt semibold, which is below the size where 3:1 would do, and
              // the accent proper is 3.99:1 against the paper it would have to
              // put paper-coloured type on. The strong step is the same hue
              // taken to 4.99:1 for exactly this. See `constants/theme.ts`.
              style={({ pressed }) => [
                styles.option,
                {
                  backgroundColor: selected
                    ? theme.accentStrong
                    : theme.backgroundElement,
                  borderColor: selected ? theme.accentStrong : theme.border,
                },
                pressed && !selected && { backgroundColor: theme.backgroundSelected },
              ]}>
              <ThemedText
                type="defaultSemiBold"
                style={{ color: selected ? theme.textOnAccent : theme.text }}>
                {option}
              </ThemedText>
            </PressableScale>
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
    borderRadius: Radius.button,
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
