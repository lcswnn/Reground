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

    /**
     * The tab bar's top edge, and only that.
     *
     * Deliberately not `border`: this is the one line in the app that separates
     * the chrome from the content rather than one card from another, and at
     * `border`'s 2.1:1 it read as part of the page. Each scheme borrows the
     * *other* scheme's background — near-black on paper, off-white on night —
     * which is the strongest either palette can go without introducing a hue
     * that belongs to neither.
     */
    barDivider: "#1A1510",

    /** Warm terracotta. The single orange in the app. */
    brand: "#e08659",
    /**
     * Same value as `brand` — used for link text and selected states, where it
     * lands at 4.3:1 on `background`, just under the 4.5:1 bar for body text.
     */
    brandStrong: "#e08659",
    brandSoft: "#FBEBE2",

    /** Progress / "up and to the right". Moss olive. Carries the bar charts. */
    positive: "#9bb05c",
    positiveSoft: "#EDEBD8",

    /**
     * Data moving the wrong way, wherever it appears. Brick rather than siren:
     * 5.2:1 here, so it can carry a delta line as well as a bar.
     */
    decline: "#B4453F",
    declineSoft: "#F6E7E6",

    /**
     * The blue: progress bars, the Progress tab, and the refresh wheel — one
     * hue for "how far along" throughout. Taken a touch deeper than the wheel's
     * old #3E7CA8 (4.3:1) so it clears 4.5:1 as text; this is 5.1:1.
     */
    info: "#37718F",
    infoSoft: "#E6F1F8",

    /** Secondary accent for humanity/people-flavored surfaces. */
    accent: "#DDBEDC",
    /**
     * The readable pink. `accent` is a wash — 1.4:1 on this paper, fine as a
     * large fill behind something else but invisible as text or as a bar on a
     * near-white page. This is the same hue taken down to 5.1:1 so it can carry
     * a number.
     */
    accentStrong: "#8E5A8B",
    accentSoft: "#F5EBF4",

    /** Form errors. Brick, not siren red — nothing here is an emergency. */
    danger: "#B4453F",
  },
  dark: {
    text: "#F2EDE6",
    textSecondary: "#B4ABA0",
    textMuted: "#857C71",
    textOnBrand: "#2A1A0C",

    /**
     * Near-black with the brown pushed further than it was: the old ramp only
     * had ~5 points between its red and blue channels, which at these levels
     * reads as plain charcoal. Doubling that gap is enough to see the warmth
     * without lifting the screens off black.
     *
     * Luminance is deliberately unmoved (0.0079 vs the old 0.0076), so every
     * contrast ratio noted below still holds.
     */
    background: "#1A1510",
    backgroundElement: "#251E17",
    backgroundSelected: "#2F281F",
    surface: "#211A13",

    border: "#362E24",

    /** See the light scheme: the light background, mirrored. */
    barDivider: "#FBFAF7",

    // The warm pair carries across schemes unchanged — both clear 4.9:1 on this
    // background, so neither needs a night-specific cut.
    brand: "#E67F4D",
    brandStrong: "#E67F4D",
    brandSoft: "#3A241A",

    positive: "#918737",
    positiveSoft: "#262316",

    // Was #80B5D9 — a blue under the name `decline`, which is why the wrong
    // direction read as calm at night and alarming by day. Now red in both.
    decline: "#E08A85",
    declineSoft: "#2E1B19",

    /**
     * Pulled down from #80B5D9 (8.2:1), which glared against the near-black.
     * 6.9:1 keeps it comfortably readable while letting the page stay the
     * brightest thing in the room rather than the bar on it.
     */
    info: "#74A6C9",
    infoSoft: "#14252F",

    /**
     * Same treatment as the blue: #DDBEDC was 10.6:1 here, brighter than the
     * body text. 7.8:1 still reads as the same lilac-pink, just no longer lit.
     */
    accent: "#C2A0C1",
    // Still one value at night — the dimmed wash carries text on its own, so
    // the split the light scheme needs would be a distinction without a use.
    accentStrong: "#C2A0C1",
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
