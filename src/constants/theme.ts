/**
 * Humanitas design tokens.
 *
 * The palette is deliberately warm and sunrise-leaning: this app exists to make
 * "things are getting better" feel true at a glance, so the primary accent is a
 * terracotta rather than a corporate blue. Around it sit three companions —
 * moss olive, dusty pink, soft sky — one per tab, so the bar reads as a set of
 * cozy siblings instead of one highlight color repeated. Surfaces stay a quiet
 * near-white so the stories and charts carry the color.
 *
 * Dark mode keeps the same hues but drops the luminance, so the app reads as the
 * same product at night instead of a different one.
 */

import "@/global.css";

import { Platform } from "react-native";

export const Colors = {
  light: {
    /**
     * Warm near-black rather than true black: softer, less clinical at 6am.
     *
     * The two greys below it are pulled down from where they started (#6B6459
     * and #9A9287) because the lighter pair washed out on this near-white
     * paper — muted sat at 2.94:1, under the 4.5:1 needed for body text.
     * Ratios here are against `background`; on `surface` they run ~4% higher.
     */
    text: "#221F1A",
    /** 8.5:1 — headings' quieter sibling, still comfortably readable. */
    textSecondary: "#4F493F",
    /** 4.9:1 — clears AA, where the old value did not. */
    textMuted: "#756D61",
    textOnBrand: "#3A2410",

    /** Near-white with a hair of warmth, so screens read as paper, not a lightbox. */
    background: "#FBFAF7",
    backgroundElement: "#F3F1EB",
    backgroundSelected: "#E9E5DC",
    surface: "#FFFFFF",

    /**
     * 2.1:1 against the page. The old #E8E4DA was 1.22:1 — technically a line,
     * but at 1px it read as a smudge and card edges disappeared.
     */
    border: "#B8AF9C",

    /** Warm terracotta. The single orange in the app. */
    brand: "#e08659",
    /**
     * Same value as `brand` — used for link text and selected states, where it
     * lands at 4.3:1 on `background`, just under the 4.5:1 bar for body text.
     */
    brandStrong: "#e08659",
    brandSoft: "#FBEBE2",

    /** Progress / "up and to the right". Moss olive. */
    positive: "#9bb05c",
    positiveSoft: "#EDEBD8",

    /** Used for declines that are *good* (poverty, child mortality). */
    decline: "#c84949",
    declineSoft: "#E6F1F8",

    /** Secondary accent for humanity/people-flavored surfaces. */
    accent: "#DDBEDC",
    accentSoft: "#F5EBF4",

    /** Form errors. Brick, not siren red — nothing here is an emergency. */
    danger: "#B4453F",
  },
  dark: {
    text: "#F2EDE6",
    textSecondary: "#B4ABA0",
    textMuted: "#857C71",
    textOnBrand: "#2A1A0C",

    background: "#171512",
    backgroundElement: "#211E1A",
    backgroundSelected: "#2B2823",
    surface: "#1D1A16",

    border: "#322E28",

    // The four hues carry across schemes unchanged — each one clears 4.9:1 on
    // this background, so dark mode needs no lightened cuts.
    brand: "#E67F4D",
    brandStrong: "#E67F4D",
    brandSoft: "#3A241A",

    positive: "#918737",
    positiveSoft: "#262316",

    decline: "#80B5D9",
    declineSoft: "#14252F",

    accent: "#DDBEDC",
    accentSoft: "#2A2130",

    danger: "#E08A85",
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

/**
 * Family names registered by `useFonts` in the root layout. Referenced as
 * strings everywhere else, so a missing load shows up as system fallback text
 * rather than a crash.
 */
export const LibertinusMath = "LibertinusMath";
export const LibertinusSerif = "LibertinusSerif";
export const LibertinusSerifSemibold = "LibertinusSerif-Semibold";
export const LibertinusSerifBold = "LibertinusSerif-Bold";

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
    sans: "system-ui",
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: "ui-serif",
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: "ui-rounded",
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: "ui-monospace",
  },
  default: {
    display: LibertinusSerifBold,
    body: LibertinusSerif,
    sans: "normal",
    serif: "serif",
    rounded: "normal",
    mono: "monospace",
  },
  web: {
    display: `${LibertinusSerifBold}, var(--font-serif)`,
    body: `${LibertinusSerif}, var(--font-serif)`,
    sans: "var(--font-display)",
    serif: "var(--font-serif)",
    rounded: "var(--font-rounded)",
    mono: "var(--font-mono)",
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

/**
 * Extra scroll padding under a tab screen's content. The custom tab bar takes
 * layout space instead of floating over the content the way the native bar did,
 * so screens no longer have to reserve its height — this is breathing room only.
 */
export const BottomTabInset = Spacing.two;
export const MaxContentWidth = 800;
