import { StyleSheet, Text, type TextProps } from "react-native";

import { Fonts, MaxFontScale, ThemeColor, Type } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { withAlpha } from "@/lib/color";

// The display tiers get a soft glow the same hue as their own text — ink
// haloing on paper in light mode, paper haloing on ink in dark — so a heading
// reads as sitting just above the page rather than printed flat on it. Nothing
// else gets one: at body size the same radius would just read as blur, not
// glow.
const GLOWS_SOFTLY = new Set<ThemedTextType>(["hero", "title", "subtitle"]);

const GLOW_ALPHA = 0.13;
const GLOW_RADIUS = 5;

/**
 * The reading halo: the *page's* colour, spread softly around the glyphs of body
 * text so it stays readable over whatever the page has drawn on it.
 *
 * Both schemes now put something behind the words — stars overhead in the dark
 * one, clouds in the light — and text laid straight onto that is text whose
 * background changes from line to line, sometimes mid-word. This is the fix, and
 * it is the one that mapmakers reached for a century before there were screens:
 * a place name crossing a coastline is not boxed, it is haloed in the colour of
 * the paper, and nobody looking at the map ever notices.
 *
 * That is the whole of why this and not a panel behind the text. A panel has
 * edges and corners, so it is a *thing on the page* — one more rectangle to
 * account for on every screen, and one that has to be sized, cornered and
 * spaced. The halo has no edge at any point, because it is the same colour as
 * what surrounds it: over bare page it is strictly invisible, and it only becomes
 * anything at all where a cloud or a star passes behind a letter. It does its
 * whole job in exactly the places where there is a job, and nowhere else.
 *
 * Alpha is near-solid on purpose. This is not a shadow and is not meant to read
 * as one — it is the page reasserting itself in the two or three points around
 * each letterform. Anything translucent enough to see through would let the very
 * thing it is masking come back.
 *
 * The radius is small for the same reason. At 4 the halo is gone within a couple
 * of points of the stroke, so the space between lines and between words still
 * shows whatever is behind. Wider closes those gaps and the text starts to sit in
 * a pale cloud of its own — which is the panel again, drawn badly.
 */
const HALO_ALPHA = 0.92;
const HALO_RADIUS = 4;

/**
 * The glow itself, exported so anything that draws its own label outside
 * `ThemedText` — `Button`, `OptionCard` — can match it exactly rather than
 * carrying a second copy of `GLOW_ALPHA`/`GLOW_RADIUS` that drifts the next
 * time these are tuned.
 */
export function softGlow(color: string) {
  return {
    textShadowColor: withAlpha(color, GLOW_ALPHA),
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: GLOW_RADIUS,
  };
}

export function readingHalo(background: string) {
  return {
    textShadowColor: withAlpha(background, HALO_ALPHA),
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: HALO_RADIUS,
  };
}

/**
 * The text colours that mean "this is sitting on a filled shape", which are
 * exactly the ones that must not get a halo.
 *
 * A halo is the page's colour, and it is invisible only while the page is what
 * is actually behind the letters. On a filled control — paper-coloured type on
 * the ink of a primary button, or on the terracotta of a selected rating chip —
 * the page colour is not the backdrop at all, so haloing there would ring every
 * glyph in a bright fringe that has nothing to do with the surface it is on. It
 * would be the most visible thing on the screen, which is the exact opposite of
 * the point.
 *
 * Those controls are opaque in the first place. Nothing is drawn behind their
 * labels, so there is nothing for a halo to mask and no legibility to recover.
 */
const ON_FILL = new Set<ThemeColor>([
  "textOnBrand",
  "textOnAccent",
  "textOnPositive",
]);

/**
 * Four roles and one numeral, and every one of them is a size from `Type`.
 *
 * `title` for the screen's title, `subtitle` for any secondary header — a
 * section heading, a card's name, a lead sentence — `default` for prose, and
 * `small` for anything said quietly beside something else. The rest are those
 * same four in a different face or with caps on, never a different size:
 * `defaultSemiBold` and `linkPrimary` are the body size, `smallBold` and
 * `eyebrow` the caption size. `hero` is the clock.
 *
 * `sectionTitle` used to sit between `subtitle` and the body at 18 and was the
 * only tier doing a job another tier already had a name for — a section heading
 * *is* a secondary header, and two sizes two points apart read as one size that
 * failed to hold still. It is gone, and its screens are on `subtitle`. `link`
 * and `code` went with it, unused.
 */
/**
 * The reading cut, at whatever size the tier it is applied to carries.
 *
 * The one sanctioned override of a tier's own face. It had three callers — the
 * door's line, the breath's intro heading, and the parting suggestion on the
 * closing screen — on the argument that a large line alone on a page does not
 * need the display weight as well as the size.
 *
 * The two headings have given it up. That argument was written when the display
 * cut was a serif's 600 against a serif's 400, which is a difference in voice;
 * the app now runs one sans in two weights, so on a heading the reading cut
 * bought nothing except less ink. Titles are titles again, in the cut drawn for
 * them.
 *
 * Its last caller has now gone too. `close.tsx` used it for the unwinding idea,
 * which was a whole paragraph at the heading tier and exactly the case this was
 * kept for — and that paragraph has since come down to the body tier, which is
 * set in the reading cut already.
 *
 * So this currently overrides nothing anywhere. It is kept rather than deleted
 * because the case it answers is a real one that recurs — a long line set large,
 * where the display weight turns a sentence into a heading — and the argument
 * for it is worth more than the four tokens it costs. If a second release goes
 * by with no caller, delete it; the reasoning is in git.
 */
export const readingCut = { fontFamily: Fonts.body } as const;

export type ThemedTextType =
  | "default"
  | "defaultSemiBold"
  | "hero"
  | "title"
  | "subtitle"
  | "eyebrow"
  | "small"
  | "smallBold"
  | "fine"
  | "linkPrimary";

export type ThemedTextProps = TextProps & {
  type?: ThemedTextType;
  themeColor?: ThemeColor;
};

export function ThemedText({
  style,
  type = "default",
  themeColor,
  ...rest
}: ThemedTextProps) {
  const theme = useTheme();
  const color =
    type === "linkPrimary" ? theme.brandStrong : theme[themeColor ?? "text"];

  return (
    <Text
      // Dynamic Type, to a ceiling: the layouts are drawn around these tiers'
      // fixed leading, and text scaled past it climbs out of them. See
      // `MaxFontScale`.
      maxFontSizeMultiplier={MaxFontScale}
      style={[
        { color },
        styles[type],
        // One `textShadow` per `Text`, so these are alternatives rather than
        // layers, and the split follows what each tier needs. The display tiers
        // keep the glow they were given: they are large, heavy and already the
        // most legible thing on any screen they appear on, and their glow is a
        // deliberate lift off the page rather than a legibility fix. Everything
        // else — which is all the body copy, all the captions, every quiet line
        // in the app — gets the halo, because those are the sizes a cloud behind
        // a letter actually costs something.
        GLOWS_SOFTLY.has(type)
          ? softGlow(color)
          : !ON_FILL.has(themeColor ?? "text") && readingHalo(theme.background),
        style,
      ]}
      {...rest}
    />
  );
}

// `fontWeight` is absent throughout: naming a weight rather than the family
// drops the text back to the system font on iOS. The family ships a real 600, so
// `defaultSemiBold` resolves to it via `Fonts.semibold`, and the remaining
// tiers are separated by size, colour and caps — see the note on `Fonts` in
// `constants/theme.ts`.
//
// No number is written down here. Every size and leading comes from `Type` in
// `constants/theme.ts`, which is where the scale is decided and explained; this
// file only says which face each role wears. A tier that wants a size of its
// own is a tier that has not worked out what it is.
const styles = StyleSheet.create({
  default: {
    fontFamily: Fonts.body,
    ...Type.body,
  },
  defaultSemiBold: {
    fontFamily: Fonts.semibold,
    ...Type.body,
  },
  hero: {
    fontFamily: Fonts.display,
    ...Type.numeral,
  },
  title: {
    fontFamily: Fonts.display,
    ...Type.title,
  },
  subtitle: {
    fontFamily: Fonts.display,
    ...Type.heading,
  },
  // The caption size in caps, and the one place emphasis survives the loss of a
  // bold: with a single weight in the family, caps plus tracking is what an
  // eyebrow has left to be an eyebrow with. The tracking runs loose because
  // caps set at a caption size clot together without it.
  eyebrow: {
    fontFamily: Fonts.semibold,
    ...Type.caption,
    textTransform: "uppercase",
    letterSpacing: 1.4,
  },
  small: {
    fontFamily: Fonts.body,
    ...Type.caption,
  },
  // The app's only small print, and it has one caller — see `Type.fine`, where
  // the role is written down and the size is argued for.
  fine: {
    fontFamily: Fonts.body,
    ...Type.fine,
  },
  smallBold: {
    fontFamily: Fonts.semibold,
    ...Type.caption,
  },
  // The body tier in the semibold cut; the brand colour is applied above rather
  // than here, because it is the one tier whose colour is not the caller's to
  // choose.
  linkPrimary: {
    fontFamily: Fonts.semibold,
    ...Type.body,
  },
});
