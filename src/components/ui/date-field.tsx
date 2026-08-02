import { DateTimePicker } from '@expo/ui/community/datetime-picker';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { Fonts, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatBirthday, toISODate } from '@/lib/format';

interface DateFieldProps {
  label: string;
  /** `YYYY-MM-DD`, or null while nothing has been picked. */
  value: string | null;
  onChange: (value: string) => void;
  placeholder?: string;
  minimumDate?: Date;
  maximumDate?: Date;
  errorText?: string | null;
  /**
   * Controlled open state. Omit and the field manages its own, which is what
   * every form wants until something outside the field needs to close it —
   * saving, for instance, where leaving the wheel standing over a value that is
   * already committed reads as the save not having taken.
   */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

/**
 * A tap-to-open date picker wearing `TextField`'s clothes, so a form can mix
 * the two without the seams showing.
 *
 * The picker stays collapsed until tapped: it is a tall piece of chrome, and on
 * a sign-up form it would otherwise dominate a screen where it is one field of
 * four.
 */
export function DateField({
  label,
  value,
  onChange,
  placeholder = 'Select a date',
  minimumDate,
  maximumDate,
  errorText,
  open: controlledOpen,
  onOpenChange,
}: DateFieldProps) {
  const theme = useTheme();
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);

  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : uncontrolledOpen;

  // The internal state is still updated when uncontrolled, so a form that
  // passes neither prop behaves exactly as it did before this existed.
  function setOpen(next: boolean) {
    if (!isControlled) setUncontrolledOpen(next);
    onOpenChange?.(next);
  }

  // Android presents a modal dialog that opens on mount and expects the caller
  // to unmount it; iOS and web render inline. Either way it only exists while
  // open, so the two behaviors need no branching here.
  const selected = value ? new Date(`${value}T00:00:00`) : (maximumDate ?? new Date());

  return (
    <View style={styles.wrapper}>
      <Text style={[styles.label, { color: theme.textSecondary }]}>{label}</Text>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={value ? `${label}: ${formatBirthday(value)}` : label}
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen(!open)}
        style={[
          styles.input,
          {
            backgroundColor: theme.surface,
            borderColor: errorText ? theme.danger : open ? theme.brandStrong : theme.border,
          },
        ]}>
        <Text style={[styles.value, { color: value ? theme.text : theme.textMuted }]}>
          {value ? formatBirthday(value) : placeholder}
        </Text>
      </Pressable>

      {open ? (
        <View style={[styles.picker, Platform.OS === 'ios' && styles.pickerInline]}>
          <DateTimePicker
            value={selected}
            mode="date"
            // The wheel beats a calendar grid for a birthday: it starts on a
            // year rather than making you page back through decades of months.
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            minimumDate={minimumDate}
            maximumDate={maximumDate}
            accentColor={theme.brand}
            onValueChange={(_event, date) => {
              onChange(toISODate(date));
              // iOS keeps the wheel up so the choice can be adjusted; the
              // Android dialog has already dismissed itself by this point.
              if (Platform.OS !== 'ios') setOpen(false);
            }}
            onDismiss={() => setOpen(false)}
          />
        </View>
      ) : null}

      {errorText ? <Text style={[styles.error, { color: theme.danger }]}>{errorText}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: Spacing.two,
  },
  label: {
    fontFamily: Fonts.body,
    fontSize: 15,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  // Matches TextField's box exactly, minus the text cursor.
  input: {
    height: 52,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    paddingHorizontal: Spacing.three,
    justifyContent: 'center',
  },
  value: {
    fontFamily: Fonts.body,
    fontSize: 17,
  },
  picker: {
    justifyContent: 'center',
  },
  // The iOS wheel has no intrinsic height in a flex container.
  pickerInline: {
    height: 180,
  },
  error: {
    fontFamily: Fonts.body,
    fontSize: 15,
  },
});
