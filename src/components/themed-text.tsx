import { Platform, StyleSheet, Text, type TextProps } from "react-native";

import { Fonts, ThemeColor } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { withAlpha } from "@/lib/color";

// The four display-tier types get a soft glow the same hue as their own text
// — ink haloing on paper in light mode, paper haloing on ink in dark — so a
// heading reads as sitting just above the page rather than printed flat on
// it. Nothing else gets one: at body size the same radius would just read as
// blur, not glow.
const GLOWS_SOFTLY = new Set<ThemedTextType>([
  "hero",
  "title",
  "subtitle",
  "sectionTitle",
]);

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

export type ThemedTextType =
  | "default"
  | "defaultSemiBold"
  | "hero"
  | "title"
  | "subtitle"
  | "sectionTitle"
  | "eyebrow"
  | "small"
  | "smallBold"
  | "link"
  | "linkPrimary"
  | "code";

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
// drops the text back to the system font on iOS. Literata ships a real 600, so
// `defaultSemiBold` resolves to it via `Fonts.semibold`, and the remaining
// tiers are separated by size, colour and caps — see the note on `Fonts` in
// `constants/theme.ts`.
//
// Every size here has now had 2pt taken off it, which is the type scale finally
// being judged on its own rather than inherited. The sizes it inherited sat
// ~10% above what the same tier ran at in Nunito — a bump bought for Playpen
// Sans, a handwriting face whose irregular letterforms needed the room. Neither
// Fredoka nor Literata does, and the bump rode through both swaps untouched
// because a type scale wants deciding on a device, not alongside a family
// change. This is that decision: the serif reads a size larger than the sans
// did at the same point size, so the tiers land where the sans's did.
//
// ## The leading is split down the middle, on purpose
//
// The four display tiers are set tight and the reading tiers stay loose, which
// is the one real rule in this file. A heading that wraps is a single phrase
// broken by the width of the phone, not two thoughts, and it has to read as one
// object — so `title` runs 25 on 30 and the tiers around it hold the same
// ~1.2, tightening as the type gets bigger the way display type wants to.
// They used to run at ~1.65, which is body leading wearing a heading's clothes:
// every two-line question on `/check-in`, `/mood`, `/topic` and `/close` fell
// apart into two separate lines with a corridor between them.
//
// The reading tiers did not move and should not. `default` is 15 on 28 — looser
// than the ~1.5 it was drawn for, since the sizes came down 2pt and the line
// heights stayed — and that generosity is the point of the app everywhere the
// user is actually reading rather than being addressed.
const styles = StyleSheet.create({
  // Body moves with the small tier rather than staying put: `small` matching it
  // would make the two types indistinguishable and quietly flatten every screen
  // that pairs them.
  default: {
    fontFamily: Fonts.body,
    fontSize: 15,
    lineHeight: 28,
  },
  defaultSemiBold: {
    fontFamily: Fonts.semibold,
    fontSize: 17,
    lineHeight: 28,
  },
  hero: {
    fontFamily: Fonts.display,
    fontSize: 40,
    lineHeight: 44,
  },
  title: {
    fontFamily: Fonts.display,
    fontSize: 25,
    lineHeight: 30,
  },
  subtitle: {
    fontFamily: Fonts.display,
    fontSize: 20,
    lineHeight: 25,
  },
  sectionTitle: {
    fontFamily: Fonts.display,
    fontSize: 18,
    lineHeight: 23,
  },
  // The one tier that stays close to where it was, and the one place emphasis
  // survives the loss of a bold: with a single weight in the family, caps plus
  // tracking is what an eyebrow has left to be an eyebrow with. The tracking
  // runs looser than the sans needed — a hand-drawn face has irregular
  // sidebearings, and the extra space is what keeps caps from clotting.
  eyebrow: {
    fontFamily: Fonts.semibold,
    fontSize: 12,
    lineHeight: 18,
    textTransform: "uppercase",
    letterSpacing: 1.4,
  },
  small: {
    fontFamily: Fonts.body,
    fontSize: 15,
    lineHeight: 24,
  },
  smallBold: {
    fontFamily: Fonts.semibold,
    fontSize: 15,
    lineHeight: 24,
  },
  link: {
    fontFamily: Fonts.body,
    lineHeight: 28,
    fontSize: 16,
  },
  linkPrimary: {
    fontFamily: Fonts.semibold,
    lineHeight: 28,
    fontSize: 16,
  },
  code: {
    fontFamily: Fonts.mono,
    fontWeight:
      Platform.select({ android: "700" as const }) ?? ("500" as const),
    fontSize: 12,
  },
});
