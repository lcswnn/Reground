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

// Libertinus is loaded as two single-weight families, so `fontWeight` is absent
// throughout: naming a weight the family doesn't carry drops the text back to
// the system font. Emphasis comes from the display face, color, and caps.
const styles = StyleSheet.create({
  // Body moves with the small tier rather than staying put: `small` at 18 would
  // have matched it, which makes the two types indistinguishable and quietly
  // flattens every screen that pairs them.
  default: {
    fontFamily: Fonts.body,
    fontSize: 18,
    lineHeight: 26,
  },
  defaultSemiBold: {
    fontFamily: Fonts.body,
    fontSize: 18,
    lineHeight: 26,
  },
  hero: {
    fontFamily: Fonts.display,
    fontSize: 40,
    lineHeight: 48,
  },
  title: {
    fontFamily: Fonts.display,
    fontSize: 32,
    lineHeight: 40,
  },
  subtitle: {
    fontFamily: Fonts.display,
    fontSize: 24,
    lineHeight: 32,
  },
  sectionTitle: {
    fontFamily: Fonts.display,
    fontSize: 20,
    lineHeight: 28,
  },
  eyebrow: {
    fontFamily: Fonts.body,
    fontSize: 14,
    lineHeight: 19,
    textTransform: 'uppercase',
    letterSpacing: 1.1,
  },
  // Libertinus runs small for its point size — a 14pt line here read closer to
  // 12 on device, which is why the secondary text throughout the app was
  // squinty. 17 keeps it one clear step under body without being fine print.
  small: {
    fontFamily: Fonts.body,
    fontSize: 17,
    lineHeight: 24,
  },
  smallBold: {
    fontFamily: Fonts.body,
    fontSize: 17,
    lineHeight: 24,
  },
  link: {
    fontFamily: Fonts.body,
    lineHeight: 30,
    fontSize: 17,
  },
  linkPrimary: {
    fontFamily: Fonts.body,
    lineHeight: 30,
    fontSize: 17,
  },
  code: {
    fontFamily: Fonts.mono,
    fontWeight: Platform.select({ android: '700' as const }) ?? ('500' as const),
    fontSize: 14,
  },
});
