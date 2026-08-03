/**
 * Reground design tokens.
 *
 * The app is a place to land after the news, not another surface competing for
 * attention. Right now that is taken about as far as it goes: the whole app is
 * drawn from two supplied colours — #F3F0E7 paper and #4E4C50 ink — and every
 * token below is one of them, or a blend of the two along the line between
 * them. No third hue, so nothing on screen can shout.
 *
 * The blends are written as `ink at N% over paper`, which is the only way any
 * fill or line here is derived. Contrast ratios are against `background`.
 *
 * Semantic tokens (`positive`, `decline`, `info`, `accent`) still exist and are
 * still used at their call sites, but they all resolve to ink for now — the
 * *meaning* is carried by the label and the arrow, not by colour. When a real
 * accent hue is chosen, this is the only file that changes.
 *
 * Dark mode is the same two colours swapped: ink page, paper text. It is not a
 * second palette, and deliberately so — one ramp, read from either end.
 */

import "@/global.css";

import { Platform } from "react-native";

export const Colors = {
  light: {
    /** Supplied ink. 7.5:1 on paper — comfortably AAA for body copy. */
    text: "#4E4C50",
    /**
     * Also ink, and that is the spec: headings and their quieter sibling are the
     * same colour for now. Hierarchy is carried by size and leading instead —
     * kept as its own token so the two can part company later without a hunt.
     */
    textSecondary: "#4E4C50",
    /**
     * Ink at 85% over paper. The one place a blend is load-bearing rather than
     * decorative: full ink would leave captions indistinguishable from body, and
     * anything lighter than this drops under 4.5:1. Exactly 5.0:1.
     */
    textMuted: "#676567",
    /** On `brand`, which is solid ink. Paper, so 7.5:1 the other way round. */
    textOnBrand: "#F3F0E7",
    /**
     * On `positive`. Same value as `textOnBrand` while every fill is ink — the
     * light/dark split this token existed to solve is currently moot. Kept
     * separate because it stops being moot the moment a real accent lands.
     */
    textOnPositive: "#F3F0E7",

    /** Supplied paper. The page. */
    background: "#F3F0E7",
    /** Ink at 5% — pills, inset rows, anything pressed into the page. */
    backgroundElement: "#EBE8DF",
    /** Ink at 9%, one step further in, for the pressed state of the above. */
    backgroundSelected: "#E5E2DA",
    /** Paper lifted toward white. Cards sit above the page, not in it. */
    surface: "#F8F6EF",

    /** Ink at 20%. Visible at 1px without becoming a rule. */
    border: "#D2CFC9",

    /**
     * The tab bar's top edge, and only that — the one line that separates chrome
     * from content rather than one card from another, so it runs heavier than
     * `border`. Ink at 35%.
     */
    barDivider: "#B9B7B2",

    /** Ink. Fills, chips, the active tab. */
    brand: "#4E4C50",
    /**
     * Ink again: it is already a letterform-grade colour, so the fill/text split
     * the old tan needed has nothing to do here.
     */
    brandStrong: "#4E4C50",
    /** Ink at 12% — the wash those fills sit on. */
    brandSoft: "#DFDCD5",

    /** Progress. Ink: direction is carried by the arrow and the label. */
    positive: "#4E4C50",
    /** Ink at 8%. */
    positiveSoft: "#EDEAE2",

    /**
     * Data moving the wrong way. Also ink — but its wash is deliberately a step
     * denser than `positiveSoft`, which is the only signal left once hue is
     * gone. Ink at 14%: a wrong-way pill reads heavier on the page than a
     * right-way one of the same size.
     */
    decline: "#4E4C50",
    declineSoft: "#DCD9D2",

    /** Progress bars, the Progress tab, the refresh wheel. */
    info: "#4E4C50",
    infoSoft: "#E5E2DA",

    /** Humanity/people-flavoured surfaces. A wash: ink at 35%. */
    accent: "#B9B7B2",
    /** The same axis at 5.0:1, for when it has to carry a number. */
    accentStrong: "#676567",
    accentSoft: "#EBE8DF",

    /** Form errors. Ink — the message says what is wrong. */
    danger: "#4E4C50",
  },
  /**
   * The same two colours read from the other end: ink page, paper text. Every
   * blend is paper over ink at the percentage its light-mode counterpart used
   * ink over paper, so the two schemes have identical structure and identical
   * body contrast — 7.5:1 either way.
   */
  dark: {
    text: "#F3F0E7",
    textSecondary: "#F3F0E7",
    /** Paper at 85% over ink. 5.1:1. */
    textMuted: "#D6D3CE",
    textOnBrand: "#4E4C50",
    textOnPositive: "#4E4C50",

    /** Supplied ink. The page. */
    background: "#4E4C50",
    /** Paper at 5% / 9%, climbing away from the page. */
    backgroundElement: "#565459",
    backgroundSelected: "#5D5B5F",
    /** Paper at 12% — cards, one step off the page. */
    surface: "#5F5D61",

    /** Paper at 20%. */
    border: "#767476",

    /** See the light scheme. Paper at 35%. */
    barDivider: "#8B898B",

    brand: "#F3F0E7",
    brandStrong: "#F3F0E7",
    brandSoft: "#67656A",

    positive: "#F3F0E7",
    positiveSoft: "#5B595E",

    decline: "#F3F0E7",
    declineSoft: "#636166",

    info: "#F3F0E7",
    infoSoft: "#5D5B5F",

    accent: "#8B898B",
    accentStrong: "#D6D3CE",
    accentSoft: "#565459",

    danger: "#F3F0E7",
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

/**
 * Family names registered by `useFonts` in the root layout. Referenced as
 * strings everywhere else, so a missing load shows up as system fallback text
 * rather than a crash.
 *
 * Caveat throughout: a handwriting face, so the whole app reads as something
 * jotted down rather than published at you — which is most of why it feels calm
 * before a single word is parsed. It also runs small and wide for its point
 * size, which is why the type scale in `themed-text` sits higher than a sans
 * would need; see the note there before shrinking anything.
 */
export const CaveatRegular = "Caveat_400Regular";
export const CaveatMedium = "Caveat_500Medium";
export const CaveatSemiBold = "Caveat_600SemiBold";
export const CaveatBold = "Caveat_700Bold";

export const Fonts = Platform.select({
  ios: {
    /**
     * Headings. One family name per weight file — RN can't synthesize weights
     * for a custom family, so `fontWeight` must stay off anything using these.
     */
    display: CaveatBold,
    /** Emphasis inside body copy, and the smaller headings. */
    semibold: CaveatSemiBold,
    /** Everything that isn't a heading. */
    body: CaveatRegular,
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: "system-ui",
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: "ui-serif",
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: "ui-rounded",
    /**
     * iOS `UIFontDescriptorSystemDesignMonospaced`. Stays a system face:
     * Caveat has no monospaced cut, and the one thing `code` has to do is line
     * digits up.
     */
    mono: "ui-monospace",
  },
  default: {
    display: CaveatBold,
    semibold: CaveatSemiBold,
    body: CaveatRegular,
    sans: "normal",
    serif: "serif",
    rounded: "normal",
    mono: "monospace",
  },
  web: {
    display: `${CaveatBold}, var(--font-display)`,
    semibold: `${CaveatSemiBold}, var(--font-display)`,
    body: `${CaveatRegular}, var(--font-display)`,
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
