import {
  ActivityIndicator,
  StyleSheet,
  Text,
  type PressableProps,
} from "react-native";

import { softGlow } from "@/components/themed-text";
import { PressableScale } from "@/components/ui/pressable-scale";
import { Fonts, MaxFontScale, Radius, Spacing, Type } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

type Variant = "primary" | "secondary" | "positive" | "ghost";

/**
 * How much room a button takes.
 *
 * `regular` is every button in the session. `large` exists for one job: the
 * single button on a screen whose only purpose is to start something — right
 * now that is Start on the breath's intro, which is the first thing the app
 * ever asks anybody to press and the one press that decides whether the next
 * four minutes happen. A screen with one action on it can afford to make that
 * action look like the point of the screen.
 *
 * It is a variant rather than a one-off style on that screen so that the second
 * screen wanting it gets the same button, and so the two cannot drift the way
 * two copies of a padding value do.
 */
type Size = "regular" | "large";

export interface ButtonProps extends Omit<
  PressableProps,
  "children" | "style"
> {
  title: string;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  /**
   * Fill the parent instead of hugging the label. For buttons that share a row
   * as a set — the two-up answer pairs — where equal halves are the point and
   * content-width would leave one side stubbier than the other.
   */
  stretch?: boolean;
}

export function Button({
  title,
  variant = "primary",
  size = "regular",
  loading = false,
  stretch = false,
  disabled,
  ...rest
}: ButtonProps) {
  const theme = useTheme();
  const isDisabled = disabled || loading;

  const background =
    variant === "primary"
      ? theme.brand
      : variant === "positive"
        ? theme.positive
        : variant === "secondary"
          ? theme.backgroundElement
          : "transparent";
  const foreground =
    variant === "primary"
      ? theme.textOnBrand
      : variant === "positive"
        ? theme.textOnPositive
        : variant === "ghost"
          ? theme.textSecondary
          : theme.text;

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityState={{ disabled: !!isDisabled, busy: loading }}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        size === "large" && styles.large,
        stretch && styles.stretch,
        { backgroundColor: background },
        variant === "ghost" && [styles.ghost, { borderColor: theme.border }],
        pressed && styles.pressed,
        isDisabled && styles.disabled,
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={foreground} />
      ) : (
        <Text
          // The same Dynamic Type ceiling `ThemedText` applies — this is the
          // one piece of type in the app that doesn't go through it.
          maxFontSizeMultiplier={MaxFontScale}
          style={[
            styles.label,
            size === "large" && styles.labelLarge,
            { color: foreground },
            softGlow(foreground),
          ]}
        >
          {title}
        </Text>
      )}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  base: {
    // Sized to the label, not to the page. A button that runs the full width of
    // the screen stops reading as a thing you press and starts reading as a
    // banner — the width is the affordance, so it has to end somewhere short of
    // the margins. `minWidth` keeps a two-letter label from becoming a lozenge;
    // `maxWidth` lets the longest labels give up and go full width rather than
    // overflow. Height is a minimum so a label that does wrap isn't clipped.
    minHeight: 52,
    minWidth: 200,
    maxWidth: "100%",
    alignSelf: "center",
    borderRadius: Radius.button,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.five,
  },
  // Taller, wider and set a tier up. Every number here is one step along a
  // scale the app already has rather than a new value: the height clears the
  // 52 the regular one sits at by a comfortable margin, the padding moves from
  // `two` to `three`, and the label moves from the body tier to the heading
  // one. See `Size`.
  //
  // The floor is 300 rather than the 240 it started at. Both screens that use
  // this size — Begin on the door, Start on the breath's intro — are a column
  // of centred content with one button at the bottom, and at 240 the button was
  // visibly narrower than the text above it, which reads as the screen's one
  // action being the smallest thing on it. At 300 it is wider than most of what
  // it sits under while `maxWidth` still keeps it inside the gutters: on a
  // narrow phone the column is the limit and the button gives up and matches
  // it, which is the one case where full width is right — there is nothing left
  // for it to be narrower than.
  large: {
    minHeight: 62,
    minWidth: 330,
    paddingVertical: Spacing.three,
  },
  stretch: {
    alignSelf: "stretch",
    minWidth: 0,
    paddingHorizontal: Spacing.four,
  },
  ghost: {
    // Outlined rather than bare text. A ghost button is still the way off the
    // screen — "I'm done", "Let's finish up" — and without an edge it read as a
    // caption the user could ignore. The border is the same hairline the rest of
    // the app uses, so it says "button" without competing with a filled one.
    minHeight: 48,
    borderWidth: 1,
  },
  label: {
    // The body tier in the semibold cut — the same size as the copy the button
    // sits under, which is what a label is: a sentence you can press. Weight is
    // what separates it, not size, now that a semibold face is actually loaded.
    fontFamily: Fonts.semibold,
    fontSize: Type.body.fontSize,
  },
  labelLarge: {
    fontSize: Type.heading.fontSize,
  },
  pressed: {
    // Just a shade off, now that the press is a movement. This used to be 0.75
    // and a static 0.985 scale, which was the whole of the feedback — a button
    // that dimmed and sat still. `PressableScale` does the travel; the dim is
    // left in at a fraction of its old depth as the highlight going out of the
    // fill, and it must stay subtle or it reads as the button disabling itself.
    opacity: 0.92,
  },
  disabled: {
    opacity: 0.45,
  },
});
