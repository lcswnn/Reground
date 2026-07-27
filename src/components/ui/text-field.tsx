import { useState } from 'react';
import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
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
            borderColor: errorText ? '#E5484D' : focused ? theme.brand : theme.border,
          },
          style,
        ]}
        {...rest}
      />
      {errorText ? <Text style={styles.error}>{errorText}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: Spacing.two,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  input: {
    height: 52,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    paddingHorizontal: Spacing.three,
    fontSize: 16,
  },
  error: {
    color: '#E5484D',
    fontSize: 13,
    fontWeight: '600',
  },
});
