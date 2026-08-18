/**
 * Reground design tokens.
 *
 * The app is a place to land after the news, not another surface competing for
 * attention. Right now that is taken about as far as it goes: the whole app is
 * drawn from two colours — #F0EBDE paper and #4E4C50 ink — and every token below
 * is one of them, or a blend of the two along the line between them. No third
 * hue, so nothing on screen can shout.
 *
 * The blends are written as `ink at N% over paper`, which is the only way any
 * fill or line here is derived. Contrast ratios are against `background`.
 *
 * ## The paper is not the supplied paper any more
 *
 * The colour handed over was #F3F0E7, and the page had since drifted off it to
 * #F4F4F0 — a step brighter *and* a step cooler, which is to say most of the way
 * to plain white with the warmth taken out. Two things were wrong with that. It
 * read as a lit screen rather than a page in a dim room, which is the one thing
 * this app is trying not to be; and the blends below were all mixed against a
 * paper the page was no longer using, so every ratio in these comments was
 * quietly describing a palette that wasn't on screen.
 *
 * The page is now #F0EBDE: the supplied paper warmed slightly and dropped about
 * three points of L*. That costs 7.7:1 → 7.13:1 against ink, still AAA for body
 * copy, and buys back roughly a quarter of the light the screen emits.
 *
 * It is worth being clear about what that trade is *not*. Legibility in daylight
 * is contrast against the ink plus how hard the backlight is driven, and neither
 * moves when the paper dims — the ink keeps its AAA margin either way. What a
 * dimmer page does change is the quiet end of the ramp, and there it helps: the
 * washes below are anchored to the ink, so a secondary button separates from the
 * page at 1.19:1 rather than the 1.11:1 it had before, and a card at 1.08:1
 * rather than 1.02:1. The near-white page was the thing making those invisible
 * outdoors. Everything here is re-derived against the new paper.
 *
 * Do not take the page much past #EAE4D5 chasing this further: body copy drops
 * under 7:1 there, and the paper stops reading as paper and starts reading as
 * beige.
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
    /** Supplied ink. 7.13:1 on paper — comfortably AAA for body copy. */
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
    textMuted: "#656365",
    /**
     * On `brand`, which is solid ink. The page's own paper, so 7.13:1 the other
     * way round — the same pair as body copy, read backwards. It tracked the old
     * supplied paper for a while and was therefore a hair brighter than anything
     * else on screen; matching the page keeps light mode to two colours exactly,
     * and reversed type is better off a shade down anyway, since light-on-dark
     * letterforms bloom rather than thin.
     */
    textOnBrand: "#F0EBDE",
    /**
     * On `positive`. Same value as `textOnBrand` while every fill is ink — the
     * light/dark split this token existed to solve is currently moot. Kept
     * separate because it stops being moot the moment a real accent lands.
     */
    textOnPositive: "#F0EBDE",

    /** The paper. See the note at the top of the file for why it is this one. */
    background: "#F0EBDE",
    /** Ink at 5% — pills, inset rows, anything pressed into the page. */
    backgroundElement: "#E8E3D7",
    /** Ink at 9%, one step further in, for the pressed state of the above. */
    backgroundSelected: "#E1DDD1",
    /** Paper lifted toward white. Cards sit above the page, not in it. */
    surface: "#F7F4ED",

    /** Ink at 20%. Visible at 1px without becoming a rule. */
    border: "#D0CBC2",

    /**
     * The tab bar's top edge, and only that — the one line that separates chrome
     * from content rather than one card from another, so it runs heavier than
     * `border`. Ink at 35%.
     */
    barDivider: "#B7B3AC",

    /** Ink. Fills, chips, the active tab. */
    brand: "#4E4C50",
    /**
     * Ink again: it is already a letterform-grade colour, so the fill/text split
     * the old tan needed has nothing to do here.
     */
    brandStrong: "#4E4C50",
    /** Ink at 12% — the wash those fills sit on. */
    brandSoft: "#DDD8CD",

    /** Progress. Ink: direction is carried by the arrow and the label. */
    positive: "#4E4C50",
    /** Ink at 8%. */
    positiveSoft: "#E3DED3",

    /**
     * Data moving the wrong way. Also ink — but its wash is deliberately a step
     * denser than `positiveSoft`, which is the only signal left once hue is
     * gone. Ink at 14%: a wrong-way pill reads heavier on the page than a
     * right-way one of the same size.
     */
    decline: "#4E4C50",
    declineSoft: "#D9D5CA",

    /** Progress bars, the Progress tab, the refresh wheel. */
    info: "#4E4C50",
    infoSoft: "#E1DDD1",

    /** Humanity/people-flavoured surfaces. A wash: ink at 35%. */
    accent: "#B7B3AC",
    /** The same axis at 5.0:1, for when it has to carry a number. */
    accentStrong: "#656365",
    accentSoft: "#E8E3D7",

    /** Form errors. Ink — the message says what is wrong. */
    danger: "#4E4C50",
  },
  /**
   * The same two colours read from the other end: ink page, paper text. Every
   * blend is paper over ink at the percentage its light-mode counterpart used
   * ink over paper, so the two schemes have identical structure.
   *
   * Body contrast is no longer identical: this side still runs the supplied
   * #F3F0E7 at 7.5:1, where light mode now sits at 7.13:1 having moved its paper
   * down. The two were matched on purpose and could be matched again by bringing
   * this paper to #F0EBDE as well — which would also take a little glare off
   * reversed type in a dark room. Left alone for now because the brief was the
   * light scheme, and changing the dark one is its own decision to make on a
   * device rather than a side effect of this one.
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
 * Literata throughout: a text serif drawn for Google Play Books, which is to
 * say it was built for exactly this — long, unhurried reading on a screen
 * rather than a display face pressed into service for body copy. Landing here
 * as part of leaning the whole app toward an e-reader's page rather than an
 * app's; see `Colors` above for the paper-and-ink half of that and
 * `ScreenFilm` for the matte half.
 *
 * ## Two cuts
 *
 * Literata ships eight weights (200–900) plus italics, and two are loaded:
 * `400Regular` and `600SemiBold`, so `semibold` is a real semibold rather
 * than an alias. That carries emphasis on button labels and the
 * `defaultSemiBold` tier, which have nothing else to carry it with.
 *
 * `fontWeight` does not appear anywhere: naming a weight rather than the file
 * drops iOS back to the system font. The weight is selected by loading
 * `Literata_600SemiBold` as its own family and asking for it by name, which is
 * why both cuts are registered in the root layout.
 *
 * `display` uses the 600 as well — a heading wants the extra weight more than
 * it wants the extra points.
 *
 * ## The type scale is no longer inherited
 *
 * Every size in `themed-text.tsx` used to sit ~10% above where it ran before
 * Playpen Sans, bought at the time to give that handwriting face's irregular
 * letterforms room to be read. Neither Fredoka nor Literata needed the room,
 * and the bump rode through both swaps untouched because a type scale is its
 * own decision and worth making on a device rather than folded into a family
 * change. It has since been made: 2pt came off every tier. The line heights
 * stayed where they were, so the leading is looser than it was drawn for —
 * see the note above `styles` in `themed-text.tsx`.
 */
export const LiterataRegular = "Literata_400Regular";
export const LiterataSemiBold = "Literata_600SemiBold";

export const Fonts = Platform.select({
  ios: {
    /** Headings. The 600 cut — see above. */
    display: LiterataSemiBold,
    /** Emphasis inside body copy, and the smaller headings. */
    semibold: LiterataSemiBold,
    /** Everything that isn't a heading. */
    body: LiterataRegular,
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: "system-ui",
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: "ui-serif",
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: "ui-rounded",
    /**
     * iOS `UIFontDescriptorSystemDesignMonospaced`. Stays a system face:
     * Literata has no monospaced cut, and the one thing `code` has to do is
     * line digits up.
     */
    mono: "ui-monospace",
  },
  default: {
    display: LiterataSemiBold,
    semibold: LiterataSemiBold,
    body: LiterataRegular,
    sans: "normal",
    serif: "serif",
    rounded: "normal",
    mono: "monospace",
  },
  web: {
    // All three on the regular cut, as they were before the face changed. The
    // stack falls through to `--font-display` in `global.css`, which names the
    // family for a browser that already has it.
    display: `${LiterataRegular}, var(--font-display)`,
    semibold: `${LiterataRegular}, var(--font-display)`,
    body: `${LiterataRegular}, var(--font-display)`,
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

/**
 * The two controls in the chrome row — `BackButton` top-left and `ThemeToggle`
 * top-right — are drawn to match each other deliberately, so the one thing that
 * would break the match if it drifted lives here rather than in either file.
 *
 * They run a couple of points above the `small` tier they otherwise use. That
 * tier is body copy in fifty-odd other places and cannot move on their account,
 * but these two are not copy: they are the only tappable words on most screens,
 * they sit muted in the corners where the eye is not looking, and at the `small`
 * size they read as a caption someone has to hunt for rather than as a control.
 * The extra size is what makes them findable without giving them chrome, which
 * is the thing both files are at pains not to do.
 */
export const ChromeLabelSize = 17;
