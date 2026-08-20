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
 * What is left is the caller it was always most right for: a whole paragraph
 * set at the heading tier — see `close.tsx` — where the size is doing the work
 * of drawing the eye and the weight would turn a suggestion into a second
 * heading. Size and leading still come from the tier; this changes the face and
 * nothing else.
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
        GLOWS_SOFTLY.has(type) && softGlow(color),
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
