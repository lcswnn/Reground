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

// Caveat is loaded as four single-weight families, so `fontWeight` is absent
// throughout: naming a weight the family doesn't carry drops the text back to
// the system font. Emphasis comes from the semibold and display faces, color,
// and caps — never from a numeric weight.
//
// Every size below is ~20% above what the same tier ran at in Nunito. Caveat is
// a handwriting face with a short x-height and a lot of its mass in the
// ascenders, so it reads a full step smaller than its point size claims — 17pt
// body was fine print. The line heights did *not* grow with it: the extra point
// size already fills the leading, and holding them steady keeps the generous
// ~1.5 rhythm that makes the screen feel unhurried, which is the whole point of
// the app.
const styles = StyleSheet.create({
  // Body moves with the small tier rather than staying put: `small` matching it
  // would make the two types indistinguishable and quietly flatten every screen
  // that pairs them.
  default: {
    fontFamily: Fonts.body,
    fontSize: 20,
    lineHeight: 28,
  },
  defaultSemiBold: {
    fontFamily: Fonts.semibold,
    fontSize: 20,
    lineHeight: 28,
  },
  hero: {
    fontFamily: Fonts.display,
    fontSize: 46,
    lineHeight: 54,
  },
  title: {
    fontFamily: Fonts.display,
    fontSize: 36,
    lineHeight: 44,
  },
  subtitle: {
    fontFamily: Fonts.display,
    fontSize: 28,
    lineHeight: 36,
  },
  sectionTitle: {
    fontFamily: Fonts.display,
    fontSize: 24,
    lineHeight: 32,
  },
  // The one tier that stays close to where it was. It is set in caps with
  // tracking, and Caveat's capitals are its tallest letterforms — the size
  // problem the rest of the scale has doesn't apply here. Tracking is looser
  // than the sans needed, because a joined face fights being letterspaced.
  eyebrow: {
    fontFamily: Fonts.semibold,
    fontSize: 14,
    lineHeight: 18,
    textTransform: 'uppercase',
    letterSpacing: 1.4,
  },
  small: {
    fontFamily: Fonts.body,
    fontSize: 18,
    lineHeight: 24,
  },
  smallBold: {
    fontFamily: Fonts.semibold,
    fontSize: 18,
    lineHeight: 24,
  },
  link: {
    fontFamily: Fonts.body,
    lineHeight: 28,
    fontSize: 19,
  },
  linkPrimary: {
    fontFamily: Fonts.semibold,
    lineHeight: 28,
    fontSize: 19,
  },
  code: {
    fontFamily: Fonts.mono,
    fontWeight: Platform.select({ android: '700' as const }) ?? ('500' as const),
    fontSize: 14,
  },
});
