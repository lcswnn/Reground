import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type PressableProps,
} from 'react-native';

import { softGlow } from '@/components/themed-text';
import { Fonts, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Variant = 'primary' | 'secondary' | 'positive' | 'ghost';

export interface ButtonProps extends Omit<PressableProps, 'children' | 'style'> {
  title: string;
  variant?: Variant;
  loading?: boolean;
  /**
   * Fill the parent instead of hugging the label. For buttons that share a row
   * as a set — the two-up answer pairs — where equal halves are the point and
   * content-width would leave one side stubbier than the other.
   */
  stretch?: boolean;
}

export function Button({
  title,
  variant = 'primary',
  loading = false,
  stretch = false,
  disabled,
  ...rest
}: ButtonProps) {
  const theme = useTheme();
  const isDisabled = disabled || loading;

  const background =
    variant === 'primary'
      ? theme.brand
      : variant === 'positive'
        ? theme.positive
        : variant === 'secondary'
          ? theme.backgroundElement
          : 'transparent';
  const foreground =
    variant === 'primary'
      ? theme.textOnBrand
      : variant === 'positive'
        ? theme.textOnPositive
        : variant === 'ghost'
          ? theme.textSecondary
          : theme.text;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!isDisabled, busy: loading }}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        stretch && styles.stretch,
        { backgroundColor: background },
        variant === 'ghost' && [styles.ghost, { borderColor: theme.border }],
        pressed && styles.pressed,
        isDisabled && styles.disabled,
      ]}
      {...rest}>
      {loading ? (
        <ActivityIndicator color={foreground} />
      ) : (
        <Text style={[styles.label, { color: foreground }, softGlow(foreground)]}>{title}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    // Sized to the label, not to the page. A pill that runs the full width of
    // the screen stops reading as a thing you press and starts reading as a
    // banner — the width is the affordance, so it has to end somewhere short of
    // the margins. `minWidth` keeps a two-letter label from becoming a lozenge;
    // `maxWidth` lets the longest labels give up and go full width rather than
    // overflow. Height is a minimum so a label that does wrap isn't clipped.
    minHeight: 52,
    minWidth: 200,
    maxWidth: '100%',
    alignSelf: 'center',
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.five,
  },
  stretch: {
    alignSelf: 'stretch',
    minWidth: 0,
    paddingHorizontal: Spacing.four,
  },
  ghost: {
    // Outlined rather than bare text. A ghost button is still the way off the
    // screen — "I'm done", "Let's finish up" — and without an edge it read as a
    // caption the user could ignore. The border is the same hairline the rest of
    // the app uses, so it says "button" without competing with a filled one.
    minHeight: 48,
    borderWidth: 1,
  },
  label: {
    // Semibold, now that a semibold face is actually loaded: a button label is
    // the one place in the app that should read as heavier than the copy around
    // it, and the serif this replaced had no weight between regular and bold.
    fontFamily: Fonts.semibold,
    fontSize: 19,
  },
  pressed: {
    opacity: 0.75,
    transform: [{ scale: 0.985 }],
  },
  disabled: {
    opacity: 0.45,
  },
});
