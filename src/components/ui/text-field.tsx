import { useState } from 'react';
import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import { Fonts, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export interface TextFieldProps extends TextInputProps {
  label: string;
  errorText?: string | null;
}

export function TextField({ label, errorText, style, ...rest }: TextFieldProps) {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.wrapper}>
      <Text style={[styles.label, { color: theme.textSecondary }]}>{label}</Text>
      <TextInput
        placeholderTextColor={theme.textMuted}
        onFocus={(e) => {
          setFocused(true);
          rest.onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          rest.onBlur?.(e);
        }}
        style={[
          styles.input,
          {
            backgroundColor: theme.surface,
            color: theme.text,
            borderColor: errorText ? theme.danger : focused ? theme.brandStrong : theme.border,
          },
          style,
        ]}
        {...rest}
      />
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
    // Barely moved where the rest of the app went up a step: this is set in
    // caps, and Caveat's capitals are already its tallest letters. Tracking is
    // looser than the sans wanted, because a joined face resists being spaced.
    fontSize: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.9,
  },
  input: {
    fontFamily: Fonts.body,
    height: 52,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    paddingHorizontal: Spacing.three,
    fontSize: 20,
  },
  error: {
    fontFamily: Fonts.body,
    fontSize: 18,
  },
});
