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

// `fontWeight` is absent throughout: naming a weight rather than the family
// drops the text back to the system font on iOS. Fredoka ships a real 600, so
// `defaultSemiBold` resolves to it via `Fonts.semibold`, and the remaining
// tiers are separated by size, colour and caps — see the note on `Fonts` in
// `constants/theme.ts`.
//
// Every size sits ~10% above what the same tier ran at in Nunito. That bump was
// bought for Playpen Sans, a handwriting face whose irregular letterforms
// needed the room; Fredoka is even and wide and does not, so the sizes here are
// now larger than the face strictly asks for. They were left alone when it
// changed — a type scale is its own decision and wants judging on a device, not
// alongside a family swap. The line heights did *not* grow with the sizes: the
// extra point size fills the leading, and holding them steady keeps the
// generous ~1.5 rhythm that makes the screen feel unhurried, which is the whole
// point of the app.
const styles = StyleSheet.create({
  // Body moves with the small tier rather than staying put: `small` matching it
  // would make the two types indistinguishable and quietly flatten every screen
  // that pairs them.
  default: {
    fontFamily: Fonts.body,
    fontSize: 19,
    lineHeight: 28,
  },
  defaultSemiBold: {
    fontFamily: Fonts.semibold,
    fontSize: 19,
    lineHeight: 28,
  },
  hero: {
    fontFamily: Fonts.display,
    fontSize: 42,
    lineHeight: 50,
  },
  title: {
    fontFamily: Fonts.display,
    fontSize: 33,
    lineHeight: 41,
  },
  subtitle: {
    fontFamily: Fonts.display,
    fontSize: 25,
    lineHeight: 33,
  },
  sectionTitle: {
    fontFamily: Fonts.display,
    fontSize: 22,
    lineHeight: 30,
  },
  // The one tier that stays close to where it was, and the one place emphasis
  // survives the loss of a bold: with a single weight in the family, caps plus
  // tracking is what an eyebrow has left to be an eyebrow with. The tracking
  // runs looser than the sans needed — a hand-drawn face has irregular
  // sidebearings, and the extra space is what keeps caps from clotting.
  eyebrow: {
    fontFamily: Fonts.semibold,
    fontSize: 14,
    lineHeight: 18,
    textTransform: 'uppercase',
    letterSpacing: 1.4,
  },
  small: {
    fontFamily: Fonts.body,
    fontSize: 17,
    lineHeight: 24,
  },
  smallBold: {
    fontFamily: Fonts.semibold,
    fontSize: 17,
    lineHeight: 24,
  },
  link: {
    fontFamily: Fonts.body,
    lineHeight: 28,
    fontSize: 18,
  },
  linkPrimary: {
    fontFamily: Fonts.semibold,
    lineHeight: 28,
    fontSize: 18,
  },
  code: {
    fontFamily: Fonts.mono,
    fontWeight: Platform.select({ android: '700' as const }) ?? ('500' as const),
    fontSize: 14,
  },
});
