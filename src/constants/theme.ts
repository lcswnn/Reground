/**
 * Humanitas design tokens.
 *
 * The palette is deliberately warm and sunrise-leaning: this app exists to make
 * "things are getting better" feel true at a glance, so the primary accent is a
 * golden amber rather than a corporate blue. Surfaces stay a quiet near-white so
 * the stories and charts carry the color.
 *
 * Dark mode keeps the same hues but drops the luminance, so the app reads as the
 * same product at night instead of a different one.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    /** Warm near-black rather than true black: softer, less clinical at 6am. */
    text: '#221F1A',
    textSecondary: '#6B6459',
    textMuted: '#9A9287',
    textOnBrand: '#3A2410',

    /** Near-white with a hair of warmth, so screens read as paper, not a lightbox. */
    background: '#FBFAF7',
    backgroundElement: '#F3F1EB',
    backgroundSelected: '#E9E5DC',
    surface: '#FFFFFF',

    border: '#E8E4DA',

    /** Early sun on a wall — apricot rather than saturated orange. */
    brand: '#E9A567',
    /** The text-safe cut of the brand (4.9:1 on `background`). */
    brandStrong: '#AC5C2D',
    brandSoft: '#FBEEDF',

    /** Progress / "up and to the right". Muted sage keeps it from shouting. */
    positive: '#4F8F6B',
    positiveSoft: '#E3EFE8',

    /** Used for declines that are *good* (poverty, child mortality). */
    decline: '#4A7FA5',
    declineSoft: '#E2ECF3',

    /** Secondary accent for humanity/people-flavored surfaces. */
    accent: '#7C86B8',
    accentSoft: '#EAEAF4',

    /** Form errors. Brick, not siren red — nothing here is an emergency. */
    danger: '#B4453F',
  },
  dark: {
    text: '#F2EDE6',
    textSecondary: '#B4ABA0',
    textMuted: '#857C71',
    textOnBrand: '#2A1A0C',

    background: '#171512',
    backgroundElement: '#211E1A',
    backgroundSelected: '#2B2823',
    surface: '#1D1A16',

    border: '#322E28',

    brand: '#E9A567',
    /** Inverted from light: the *lighter* cut is the readable one on dark. */
    brandStrong: '#F0B67F',
    brandSoft: '#3A2A1B',

    positive: '#6FBF95',
    positiveSoft: '#172B21',

    decline: '#6FA8CE',
    declineSoft: '#14252F',

    accent: '#9AA2D6',
    accentSoft: '#22233A',

    danger: '#E08A85',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

/**
 * Family names registered by `useFonts` in the root layout. Referenced as
 * strings everywhere else, so a missing load shows up as system fallback text
 * rather than a crash.
 */
export const LibertinusMath = 'LibertinusMath';
export const LibertinusSerif = 'LibertinusSerif';
export const LibertinusSerifSemibold = 'LibertinusSerif-Semibold';
export const LibertinusSerifBold = 'LibertinusSerif-Bold';

export const Fonts = Platform.select({
  ios: {
    /**
     * Headings. One family name per weight file — RN can't synthesize weights
     * for a custom family, so `fontWeight` must stay off anything using these.
     */
    display: LibertinusSerifBold,
    /** Everything that isn't a heading. */
    body: LibertinusSerif,
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    display: LibertinusSerifBold,
    body: LibertinusSerif,
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    display: `${LibertinusSerifBold}, var(--font-serif)`,
    body: `${LibertinusSerif}, var(--font-serif)`,
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const Radius = {
  sm: 10,
  md: 16,
  lg: 22,
  xl: 30,
  pill: 999,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
