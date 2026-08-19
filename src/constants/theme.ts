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
 * ## There is now a third colour, and only just
 *
 * An accent hue exists: `accent`, `accentStrong`, `accentSoft`, and `info`,
 * which points at the same hue because the thing `info` colours is the breath.
 * Everything else — body copy, headings, buttons, cards, game pieces, the whole
 * of the two ramps above — is still paper and ink. That is the deal the accent
 * is admitted under: it marks a handful of things the *app* says, and never
 * anything the user typed, tapped or is playing with.
 *
 * Where it appears, and why those three:
 *
 *  - **The breath.** `info` is the breathing circle on the opening sigh, its
 *    miniature in the example, the breathwork pacer, and the sphere that swells
 *    slowly on the door — which is the same object seen from outside, before
 *    anybody has been asked to breathe with it. It is the one thing in the app
 *    you are asked to watch for half a minute, and the one place a colour does
 *    something an ink circle cannot: it is warm, so the circle reads as
 *    something lit rather than something drawn.
 *  - **The mark.** `Rule` — the stroke under the breath's heading, under
 *    "That's all.", and standing beside the parting suggestion. It is the app's
 *    own punctuation and the least functional thing on any screen it appears
 *    on, which is exactly what an accent is for.
 *  - **Progress.** The filled dots in the chrome row, which are the app
 *    reporting on itself.
 *
 * `positive` and `decline` are deliberately *not* on it. Direction in this app
 * is carried by the label and the arrow — see the note those two tokens carry —
 * and a green/red pair would be the first colour here that means something,
 * which is a much larger decision than a warm circle.
 *
 * ## The accent is the one thing that changes hue with the scheme
 *
 * Light mode's accent is a dusty terracotta; dark mode's is a soft slate blue.
 * Not the same hue at two lightnesses — a different colour entirely, which is a
 * deliberate exception to everything above.
 *
 * The reason is that the two schemes are two different rooms rather than two
 * renderings of one. The light scheme is paper in daylight, and the paper is
 * warm: a warm mark belongs to it, the way a red pencil belongs on a page. The
 * dark scheme is a lit screen in an unlit room, and warmth there reads as heat
 * — an orange circle glowing on a dark page at night is a notification, not a
 * breath. Cool blue is what a screen in the dark is allowed to be.
 *
 * Both are chosen against their own page rather than against each other:
 * #A9603A is 3.99:1 on paper and #A6C0D9 is 4.51:1 on ink, so each clears 3:1
 * as a graphic mark with room to spare, and `accentStrong` on each side clears
 * 4.5:1 for the day one of them has to carry a word.
 *
 * Dark mode is otherwise the same two colours swapped: ink page, paper text. It
 * is not a second palette, and deliberately so — one ramp, read from either
 * end, plus one hue that knows which end it is on.
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
    /**
     * On `accentStrong`, which is the fill the rating chips take when selected.
     * The page's own paper again, and 4.99:1 on the terracotta — the numeral it
     * carries is 17pt semibold, which is under the size where 3:1 would do, so
     * the fill is the strong step of the accent rather than the accent itself.
     * Its own token rather than borrowing `textOnBrand` because the two sit on
     * different colours now and only agree by coincidence.
     */
    textOnAccent: "#F0EBDE",

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

    /**
     * The breathing circle, on all three screens that draw one, and the bounce
     * game's ball. Points at the accent rather than at ink — see the note at
     * the top of the file for why the breath is the one animation that gets a
     * colour.
     */
    info: "#A9603A",
    infoSoft: "#E7D9C7",

    /**
     * The accent: a dusty terracotta, warm enough to belong to the paper and
     * dark enough to be a mark rather than a highlight. 3.99:1 on the page,
     * which is what a 2-point rule and a 7-point dot need — both are graphics,
     * so 3:1 is the bar and this clears it without becoming a traffic light.
     *
     * Saturation is the thing to be careful with if this is ever retuned. The
     * hue can move a fair way and still read as clay; take the chroma up and it
     * stops being a mark on a page and starts being a brand colour, which is
     * the one thing an app that opens on somebody's worst half-hour should not
     * have.
     */
    accent: "#A9603A",
    /** The same hue at 4.99:1, for the day it has to carry a word or a number. */
    accentStrong: "#8E5636",
    /** The accent at about 14% over paper — a wash, for anything it fills. */
    accentSoft: "#E7D9C7",

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
    /** On `accentStrong` — ink on the slate blue, 5.23:1. See the light side. */
    textOnAccent: "#4E4C50",

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

    info: "#A6C0D9",
    infoSoft: "#585A60",

    /**
     * The accent on this side: a soft slate blue, 4.51:1 on the ink page. Not
     * the terracotta at another lightness — see the note at the top of the file
     * on why the two schemes get different hues rather than one hue read from
     * both ends.
     *
     * Desaturated for the same reason as its counterpart, and with one more
     * behind it: this is the colour of a circle breathing on a dark screen in a
     * dark room, and anything brighter than this is a light source rather than
     * a shape.
     */
    accent: "#A6C0D9",
    /** The same hue at 5.23:1, for when it has to carry a word or a number. */
    accentStrong: "#B5CEE6",
    /** The accent at about 12% over ink. */
    accentSoft: "#585A60",

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

/**
 * The spacing ramp, and — below — the one job each step has. A scale is only
 * consistent if the same relationship gets the same step everywhere, so the
 * roles are written down here rather than decided again on each screen:
 *
 * - `half`, `one` — inside a single element: the padding in a badge, the gap
 *   between a number and the step it labels.
 * - `two` — between lines of one block: a heading and the line under it, and
 *   between two buttons sharing a row.
 * - `three` — between the items of a list, and inside an actions block (a
 *   button, the hint under it, the way out under that).
 * - `four` — between the blocks of a screen. The default screen gap: if a
 *   screen's outermost `gap` is anything else, it wants a reason.
 * - `five` — the run-out under a scrolling screen's content.
 * - `six` — the one long pause, between the reading and the doing. Used on the
 *   handful of screens that ask for something and then wait.
 */
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
  /**
   * What anything you can press is rounded by, from the primary buttons down to
   * the numbers on the mood scale. Squarer than the pill these used to be: a
   * fully rounded end reads as a tag or a status more than as a control.
   *
   * It came down twice — 999 to 14, then 14 to 10 — and 10 is where it stops
   * being worth touching again. The corner is still plainly a corner, which is
   * the whole requirement; a step further and the small controls (the mood
   * chips, the glyph buttons) start reading as cut squares, because a fixed
   * radius is a larger share of a 46-point box than of a 52-point one.
   *
   * Cards keep `md` — a pressable surface is allowed to be a touch rounder than
   * the button sitting on it.
   */
  button: 10,
} as const;

/**
 * Extra scroll padding under a tab screen's content. The custom tab bar takes
 * layout space instead of floating over the content the way the native bar did,
 * so screens no longer have to reserve its height — this is breathing room only.
 */
export const BottomTabInset = Spacing.two;
export const MaxContentWidth = 800;

/**
 * The type scale. Four sizes, one for each thing text is ever doing here, plus
 * the numeral.
 *
 * Every size in the app comes from this object — `ThemedText`'s tiers, the
 * button label, the chrome in the corners. The rule is that a tier is chosen by
 * what the text *is*, never by how a particular screen wants it to look: the
 * moment one screen sets its own size because its line felt small there, the
 * scale stops being a scale and the app stops looking like one app. There were
 * five such one-offs before this existed — 19 on the opening line, 20 on the
 * closing suggestion, 17 in the chrome, 14 and 13 in a chart card — and no two
 * of them agreed with each other.
 *
 * The sizes step up the scale (13 · 17 · 20 · 28) by enough that two tiers next
 * to each other read as two different things rather than as one thing that
 * wobbled — and each lands on a size Apple's own text styles use, so the app
 * sits in an iPhone user's hand at the weights their other apps have taught
 * them: caption is the footnote (13), body is the body (17), heading is
 * title3 (20), and the screen title is title1 (28). It ran 25 for a while,
 * which is a size no system style uses — close enough to the 20 under it to
 * read as hierarchy going soft rather than as two ranks of heading. Body sits
 * nearer the header above it than the caption below it, on purpose: prose is
 * what most of these screens are, and the caption tier is the one that should
 * have to be leaned in for. The numeral sits above the lot — it is a clock,
 * not a heading, and it is the only text on its screen.
 *
 * Leading splits the scale in half, and this is the one real rule in it. The
 * display sizes are set tight — a heading that wraps is one phrase broken by
 * the width of a phone, and it has to read as a single object. The reading
 * sizes stay loose, at about 1.6, because that generosity is the whole feel of
 * the app everywhere someone is actually reading rather than being addressed.
 */
export const Type = {
  /** The screen's title. One per screen, and the first thing read on it. */
  title: { fontSize: 28, lineHeight: 34 },
  /**
   * The secondary header: a section's heading, a card's name, and the lead line
   * on the screens whose first line is a sentence rather than a title.
   */
  heading: { fontSize: 20, lineHeight: 26 },
  /** Body copy — anything written to be read as prose, and the button labels. */
  body: { fontSize: 17, lineHeight: 28 },
  /**
   * Captions, hints, the eyebrow, and the two stage directions that open and
   * close the app. Everything said quietly beside something else.
   */
  caption: { fontSize: 13, lineHeight: 21 },
  /** The clock and the countdown. Not a text tier — the one big numeral. */
  numeral: { fontSize: 40, lineHeight: 46 },
} as const;

/**
 * How far the system's text-size setting may scale this app's type.
 *
 * Dynamic Type is honoured — a person who asked for bigger text gets bigger
 * text — but not without a ceiling, because every tier here carries a fixed
 * line height and a layout drawn around it: at the full accessibility multiple
 * (~3×) the lines overlap, the buttons clip their labels, and the breathing
 * screen's cue collides with its circle. 1.4 is far enough to cover the whole
 * of the standard Dynamic Type range while keeping every screen intact, and it
 * is the convention fixed-leading apps settle on for exactly this reason.
 *
 * Applied in `ThemedText` and on the button label, which between them are every
 * piece of type in the app.
 */
export const MaxFontScale = 1.4;
