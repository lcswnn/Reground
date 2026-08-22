/**
 * The frame every session screen sits in: safe area, one gutter, and a column
 * that doesn't run wider than a comfortable measure on a tablet.
 *
 * There is a sky behind all of it, and which one depends on the scheme: stars
 * in dark mode (`NightSky`), clouds in light (`DaySky`). Both are mounted here
 * and nowhere else. The sheets that draw their own frames (the crisis numbers,
 * the region picker, the sharing panel) deliberately get neither: those are
 * cards over a scrim rather than the page, and a sky inside a card is a picture
 * of a sky.
 *
 * No header beyond one thin row of chrome: a back button top-left on the
 * screens that have somewhere to go back to — see `previousRoute` for which do
 * and where each one lands — a pair of round buttons top-right on all of them
 * without exception (the crisis numbers, and the appearance switch), and
 * between the two ends, three marks saying which part of the session this is. All of it is drawn here rather than by each screen so that
 * they are in exactly the same place on every one, which for the switch is the
 * whole point: a control that moves between screens is a control that has to be
 * found again each time.
 *
 * The progress row is the one thing here that is not chrome — see
 * `progress-lines.tsx`
 * for why a session this long needs to say how much of it is left, and
 * `stageOf` in `routing.ts` for which screen counts as which part.
 *
 * The row takes layout space rather than floating over the content: the screens
 * that start with a heading at the top of the page (`/games`, `/calibration`)
 * have nothing to spare up there, and a button overlapping a title is worse than
 * a title sitting a line lower. It is drawn even on the screens with no back
 * button, because the switch is on those too — `/`, `/category` and `/closed`
 * now open with an empty row and the switch at the end of it.
 */

import { usePathname } from "expo-router";
import { StyleSheet, View, type ViewProps } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { MaxContentWidth, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { useThemePreference } from "@/lib/theme-preference";
import { stageOfPath } from "@/session/routing";
import { BackButton } from "@/session/ui/back-button";
import { DaySky } from "@/session/ui/day-sky";
import { NightSky } from "@/session/ui/night-sky";
import { ProgressLines } from "@/session/ui/progress-lines";
import { SupportButton } from "@/session/ui/support-access";
import { ThemeToggle } from "@/session/ui/theme-toggle";

interface SessionScreenProps extends ViewProps {
  /** Centres the column vertically. Off for screens that scroll. */
  centered?: boolean;
  /**
   * What the back button does. Omitted — which is what `useSessionBack` returns
   * for the door and the dead end — draws no button at all.
   */
  onBack?: () => void;
}

export function SessionScreen({
  centered = false,
  onBack,
  style,
  children,
  ...rest
}: SessionScreenProps) {
  const theme = useTheme();
  const { isDark } = useThemePreference();
  const insets = useSafeAreaInsets();
  /**
   * Read off the router rather than passed in by each screen. Which part a
   * screen belongs to is a fact about the flow, and the flow already knows it —
   * a `stage` prop would be the same fact written down sixteen more times, in
   * sixteen places that could each get it wrong. It also means the screens
   * inside `/one-more` — the breathwork, the PMR, the soundscape, each of which
   * draws its own frame — inherit the part they are nested in for free.
   */
  const stage = stageOfPath(usePathname());

  return (
    <View
      style={[
        styles.root,
        {
          backgroundColor: theme.background,
          paddingTop: insets.top + Spacing.four,
          paddingBottom: insets.bottom + Spacing.four,
        },
        style,
      ]}
      {...rest}
    >
      {/* Under everything and outside the column, so it fills the frame rather
          than the gutter the text sits in. Mounted here rather than beside
          `ScreenFilm` in `app/_layout.tsx` because that layer is drawn *over*
          the app: this one is the page, and this root is the view holding the
          page colour. Anything root-level would be behind the opaque background
          below and never seen.

          One per scheme and never both. The dark page is a lit screen in an
          unlit room and gets a night sky; the light page is paper in daylight
          and gets a day one. Each is what its own background already was rather
          than an ornament laid over it, which is the only footing decoration
          gets in this app. */}
      {isDark ? <NightSky /> : <DaySky />}

      <View style={styles.column}>
        {/* The spacer, not `space-between`, is what pins the switch to the
            right on the screens that have no back button to sit opposite. */}
        <View style={styles.chrome}>
          {onBack ? <BackButton onPress={onBack} /> : null}
          <View style={styles.spacer} />

          {/* Two round buttons, in this order: the numbers first, the
              appearance second. Reading order is left to right and the pair are
              not equals — one changes how the app looks and one is how you
              reach a person. The switch keeps the outside edge because it is
              the one that has always been there and the corner is where a
              thumb goes for it. */}
          <View style={styles.corner}>
            <SupportButton />
            <ThemeToggle />
          </View>

          {/* Centred on the screen rather than laid out between the controls:
              the back button is two words wide and the pair opposite are two
              34-point circles, so a row in the flow would sit off-centre by the
              difference and move again on the screens with no back button.
              Absolute keeps it on the middle of the page, which is where a
              progress indicator has to stay to read as one thing that is not
              moving. */}
          {stage ? (
            <View style={styles.progress} pointerEvents="none">
              <ProgressLines stage={stage} />
            </View>
          ) : null}
        </View>

        {/* Its own flex child so that `centered` still centres the screen's
            content, not the content plus the chrome above it. */}
        <View style={[styles.content, centered && styles.centered]}>
          {children}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingHorizontal: Spacing.four,
    alignItems: "center",
  },
  column: {
    flex: 1,
    width: "100%",
    maxWidth: MaxContentWidth,
  },
  chrome: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.three,
  },
  spacer: {
    flex: 1,
  },
  // The two round controls, at the gap the app puts between the lines of one
  // block. Close enough to read as a pair rather than as two things that
  // happen to be in the same corner.
  corner: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
  },
  // Pinned to all four edges of the row so the dots sit on the same line as
  // the two controls rather than at the top of whatever height the row ended
  // up being. It takes no layout space and no touches — the row's height is
  // still set by the back button and the switch.
  progress: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    flex: 1,
  },
  centered: {
    justifyContent: "center",
  },
});
