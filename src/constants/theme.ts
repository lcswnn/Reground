/**
 * Humanitas design tokens.
 *
 * The palette is deliberately warm and sunrise-leaning: this app exists to make
 * "things are getting better" feel true at a glance, so the default surface is a
 * warm cream rather than a clinical white, and the primary accent is a golden
 * amber rather than a corporate blue.
 *
 * Dark mode keeps the same hues but drops the luminance, so the app reads as the
 * same product at night instead of a different one.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#1B1524',
    textSecondary: '#6B6480',
    textMuted: '#948CA8',
    textOnBrand: '#3D2500',

    background: '#FFFBF4',
    backgroundElement: '#FFF4E4',
    backgroundSelected: '#FFE9CB',
    surface: '#FFFFFF',

    border: '#F0E4D2',

    /** Golden hour. The primary brand accent. */
    brand: '#F5A524',
    brandStrong: '#D9860A',
    brandSoft: '#FFF0D4',

    /** Progress / "up and to the right". */
    positive: '#12B76A',
    positiveSoft: '#DCFAE9',

    /** Used for declines that are *good* (poverty, child mortality). */
    decline: '#0BA5EC',
    declineSoft: '#DCF3FD',

    /** Secondary accent for humanity/people-flavored surfaces. */
    accent: '#7C5CFF',
    accentSoft: '#EDE9FF',
  },
  dark: {
    text: '#FDF8F2',
    textSecondary: '#B3ABC2',
    textMuted: '#7E7691',
    textOnBrand: '#2A1900',

    background: '#14101B',
    backgroundElement: '#201A2B',
    backgroundSelected: '#2C2438',
    surface: '#1B1624',

    border: '#2F2740',

    brand: '#FFBE4D',
    brandStrong: '#F5A524',
    brandSoft: '#3A2B12',

    positive: '#3DDC93',
    positiveSoft: '#12331F',

    decline: '#4FC3F7',
    declineSoft: '#0E2B38',

    accent: '#A48BFF',
    accentSoft: '#251E42',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

/** Sunrise gradient used on the daily-proof hero. */
export const Gradients = {
  light: {
    sunrise: ['#FFD98A', '#FFAE6B', '#FF8FA0'] as const,
    dawn: ['#FFF0D4', '#FFE3E8'] as const,
  },
  dark: {
    sunrise: ['#5A3A12', '#6B2F3C', '#3B2352'] as const,
    dawn: ['#221A2E', '#2B1F33'] as const,
  },
} as const;

export const Fonts = Platform.select({
  ios: {
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
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
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
