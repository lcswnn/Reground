import { Platform, StyleSheet, Text, type TextProps } from 'react-native';

import { Fonts, ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ThemedTextType =
  | 'default'
  | 'defaultSemiBold'
  | 'hero'
  | 'title'
  | 'subtitle'
  | 'sectionTitle'
  | 'eyebrow'
  | 'small'
  | 'smallBold'
  | 'link'
  | 'linkPrimary'
  | 'code';

export type ThemedTextProps = TextProps & {
  type?: ThemedTextType;
  themeColor?: ThemeColor;
};

export function ThemedText({ style, type = 'default', themeColor, ...rest }: ThemedTextProps) {
  const theme = useTheme();

  return (
    <Text
      style={[
        { color: theme[themeColor ?? 'text'] },
        styles[type],
        type === 'linkPrimary' && { color: theme.brandStrong },
        style,
      ]}
      {...rest}
    />
  );
}

// Nunito is loaded as three single-weight families, so `fontWeight` is absent
// throughout: naming a weight the family doesn't carry drops the text back to
// the system font. Emphasis comes from the semibold and display faces, color,
// and caps — never from a numeric weight.
//
// Line heights run generous (~1.5 on body) on purpose. Loose leading is most of
// what makes a screen feel unhurried, which is the whole point of the app.
const styles = StyleSheet.create({
  // Body moves with the small tier rather than staying put: `small` matching it
  // would make the two types indistinguishable and quietly flatten every screen
  // that pairs them.
  default: {
    fontFamily: Fonts.body,
    fontSize: 17,
    lineHeight: 26,
  },
  defaultSemiBold: {
    fontFamily: Fonts.semibold,
    fontSize: 17,
    lineHeight: 26,
  },
  hero: {
    fontFamily: Fonts.display,
    fontSize: 38,
    lineHeight: 46,
  },
  title: {
    fontFamily: Fonts.display,
    fontSize: 30,
    lineHeight: 38,
  },
  subtitle: {
    fontFamily: Fonts.display,
    fontSize: 23,
    lineHeight: 31,
  },
  sectionTitle: {
    fontFamily: Fonts.display,
    fontSize: 20,
    lineHeight: 28,
  },
  eyebrow: {
    fontFamily: Fonts.semibold,
    fontSize: 13,
    lineHeight: 18,
    textTransform: 'uppercase',
    letterSpacing: 1.1,
  },
  // A real step under body rather than the 17 the serif needed: Nunito sits
  // true to its point size, so secondary text no longer has to be bumped up to
  // stop reading as fine print.
  small: {
    fontFamily: Fonts.body,
    fontSize: 15,
    lineHeight: 22,
  },
  smallBold: {
    fontFamily: Fonts.semibold,
    fontSize: 15,
    lineHeight: 22,
  },
  link: {
    fontFamily: Fonts.body,
    lineHeight: 28,
    fontSize: 16,
  },
  linkPrimary: {
    fontFamily: Fonts.semibold,
    lineHeight: 28,
    fontSize: 16,
  },
  code: {
    fontFamily: Fonts.mono,
    fontWeight: Platform.select({ android: '700' as const }) ?? ('500' as const),
    fontSize: 14,
  },
});
