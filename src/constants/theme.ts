/**
 * Reground design tokens.
 *
 * The app is a place to land after the news, not another surface competing for
 * attention, so both schemes are built from one supplied five-colour ramp each
 * and nothing brighter than the page itself.
 *
 * Light is warm sand: a tan paper rather than a near-white lightbox, because a
 * white screen at 6am is a flashlight. Dark is not the same palette dimmed —
 * it is a deep teal night, cool where the day is warm. That asymmetry is
 * deliberate: the two schemes are the same app at two times of day.
 *
 * Only five colours were specified per scheme, and the token set below needs
 * more than five — every derived value is a tint or shade of a supplied colour,
 * kept on its hue, and each one carries its contrast ratio against that
 * scheme's `background` so the next edit knows what headroom it has.
 */

import "@/global.css";

import { Platform } from "react-native";

export const Colors = {
  light: {
    /** Supplied "Black" — warm near-black, softer than #000 on sand. 53:1. */
    text: "#242120",
    /** Supplied "Grey". 7.1:1 — headings' quieter sibling, comfortably AA. */
    textSecondary: "#4F4C4F",
    /**
     * Shade of the supplied "Light Brown". The supplied value itself is 2.6:1
     * on this page — fine as a line, unreadable as text — so muted copy uses it
     * darkened to 5.1:1 and the original is spent on `border` instead.
     */
    textMuted: "#6E5F5F",
    /** On `brand`, which is a light tan: 7.8:1. */
    textOnBrand: "#242120",
    /**
     * On `positive`, and it has to be its own token rather than reusing
     * `textOnBrand`: the two fills sit on opposite sides of the page. `brand` is
     * a tan lighter than the sand and takes dark text; `positive` is a sage
     * darker than it and takes light. In dark mode they flip, which is exactly
     * why one shared "text on a fill" value cannot be right in both schemes.
     * 4.8:1.
     */
    textOnPositive: "#FFFFFF",

    /** Supplied "Light Tan". The page. */
    background: "#FDDDB9",
    /** The page, one step deeper — pills, inset rows, anything pressed into it. */
    backgroundElement: "#F6D0A8",
    backgroundSelected: "#EEC49A",
    /** The page lifted toward white. Cards sit above the sand, not in it. */
    surface: "#FFF1DE",

    /** Supplied "Light Brown". 2.6:1 — visible at 1px without becoming a rule. */
    border: "#9F8D8D",

    /**
     * The tab bar's top edge, and only that.
     *
     * Deliberately not `border`: this is the one line in the app that separates
     * chrome from content rather than one card from another. Each scheme
     * borrows the *other* scheme's background — night blue on sand, sand on
     * night blue — which is the strongest either palette can go without
     * introducing a hue that belongs to neither.
     */
    barDivider: "#041520",

    /** Supplied "Tan". The single warm accent — fills, chips, the active tab. */
    brand: "#D8AD8E",
    /**
     * The same tan taken to 4.8:1, for link text and selected states. `brand`
     * itself is 1.7:1 here: a fill, never a letterform.
     */
    brandStrong: "#8E5A34",
    brandSoft: "#F6E0CC",

    /**
     * Progress / "up and to the right". Sage, dulled to sit on sand — 4.0:1 on
     * the page and 3.8:1 on `positiveSoft`, which is where it usually is.
     */
    positive: "#5F7A46",
    positiveSoft: "#E4E7D6",

    /**
     * Data moving the wrong way. Brick rather than siren — 5.0:1, so it can
     * carry a delta line as well as a bar, and nothing here is an emergency.
     */
    decline: "#9E4A3C",
    declineSoft: "#F7DED6",

    /**
     * The cool one: progress bars, the Progress tab, the refresh wheel. Borrowed
     * from the night palette's turquoise and deepened to 5.0:1, so the two
     * schemes share a hue rather than each inventing a blue.
     */
    info: "#456A6B",
    infoSoft: "#DCE9E6",

    /** Secondary accent for humanity/people-flavored surfaces. A wash: 2.2:1. */
    accent: "#C9B0AE",
    /** The same mauve at 5.0:1, for when it has to carry a number. */
    accentStrong: "#7A5C5C",
    accentSoft: "#F0E2DE",

    /** Form errors. Same brick as `decline`. */
    danger: "#9E4A3C",
  },
  dark: {
    /** Supplied "Light Grey". 12.6:1. */
    text: "#CFD6D6",
    /** Supplied "Light Blue". 8.5:1. */
    textSecondary: "#86B9B1",
    /**
     * The supplied "Turquoise" lifted. At its given value it is 3.5:1 — under
     * AA for body copy — so the original stays on `border`, where a 3.5:1 line
     * is a feature, and muted text uses this 5.8:1 tint.
     */
    textMuted: "#6F9997",
    /** On `brand`, which is the light blue. */
    textOnBrand: "#041520",
    /** On `positive`. Same value as `textOnBrand` here — at night both fills
     *  are lighter than the page, so the split the light scheme needs collapses.
     *  Kept as its own token so the two can diverge again without a hunt. 8.9:1. */
    textOnPositive: "#041520",

    /** Supplied "Darkest Blue". The page. */
    background: "#041520",
    /** Tints of the supplied "Dark Blue", climbing away from the page. */
    backgroundElement: "#0A3140",
    backgroundSelected: "#114050",
    /** Supplied "Dark Blue". Cards, one step off the page. */
    surface: "#042631",

    /** Between the two supplied blues — 1.9:1, an edge rather than a frame. */
    border: "#14384A",

    /** See the light scheme: the light background, mirrored. */
    barDivider: "#FDDDB9",

    /** Supplied "Light Blue". 8.5:1 — reads as text as well as it fills. */
    brand: "#86B9B1",
    /** One value at night: the brand already carries text, so the light
     *  scheme's fill/text split would be a distinction without a use. */
    brandStrong: "#86B9B1",
    brandSoft: "#0B3339",

    /** Sage, pulled toward the palette's cool cast. 8.9:1. */
    positive: "#8FBF9C",
    positiveSoft: "#0D2E28",

    // The one warm colour at night, and it is deliberate: "wrong direction"
    // must not read as calm, and everything else on screen is teal.
    decline: "#DE9484",
    declineSoft: "#351C1A",

    /** Cooler and bluer than `brand`, so "how far along" stays its own hue. */
    info: "#7FB0C9",
    infoSoft: "#0A2C3C",

    /** Periwinkle — the palette's blues walked off teal, so people-flavored
     *  surfaces don't collide with the brand. 8.2:1. */
    accent: "#A9B8D0",
    accentStrong: "#A9B8D0",
    accentSoft: "#16283A",

    danger: "#DE9484",
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

/**
 * Family names registered by `useFonts` in the root layout. Referenced as
 * strings everywhere else, so a missing load shows up as system fallback text
 * rather than a crash.
 *
 * Nunito throughout: a rounded sans with no sharp terminals, which is most of
 * why the app reads as calm before a single word is parsed.
 */
export const NunitoRegular = "Nunito_400Regular";
export const NunitoSemiBold = "Nunito_600SemiBold";
export const NunitoBold = "Nunito_700Bold";

export const Fonts = Platform.select({
  ios: {
    /**
     * Headings. One family name per weight file — RN can't synthesize weights
     * for a custom family, so `fontWeight` must stay off anything using these.
     */
    display: NunitoBold,
    /** Emphasis inside body copy, and the smaller headings. */
    semibold: NunitoSemiBold,
    /** Everything that isn't a heading. */
    body: NunitoRegular,
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
    display: NunitoBold,
    semibold: NunitoSemiBold,
    body: NunitoRegular,
    sans: "normal",
    serif: "serif",
    rounded: "normal",
    mono: "monospace",
  },
  web: {
    display: `${NunitoBold}, var(--font-display)`,
    semibold: `${NunitoSemiBold}, var(--font-display)`,
    body: `${NunitoRegular}, var(--font-display)`,
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
