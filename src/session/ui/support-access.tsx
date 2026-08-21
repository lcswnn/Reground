/**
 * The way out of the app and into a phone call: a quiet line that opens a sheet
 * of real crisis numbers.
 *
 * Two pieces in one file because they are one thing — the line owns the sheet's
 * state, so a screen adds crisis routing by rendering `<SupportAccess />` and
 * nothing else. See `CRISIS` for the numbers and for the rules the copy was
 * written under.
 *
 * ## Two ways in
 *
 * `SupportAccess` is the line, and it sits on the three screens where the app
 * has just asked how bad things are: both ratings and the check-in. Asking the
 * question is what obliges the offer — a screen that takes "10, awful" as an
 * answer and moves on to a puzzle is a screen that heard nothing. It shows at a
 * 3 exactly as it shows at a 10, because a control that appears when you rate
 * yourself badly enough is a control that tells you what the app thinks of your
 * answer.
 *
 * `SupportButton` is the same sheet from the chrome row, next to the appearance
 * switch, on every screen in the session.
 *
 * That second one is a reversal worth recording. The argument against a
 * permanent crisis control was that it is a permanent suggestion the app thinks
 * you might be in crisis, which is its own pressure to put on somebody who
 * opened an anxiety app on a bad Tuesday. What that argument gets wrong is
 * *when* the control is needed: the three screens carrying the line are the
 * three screens a person in real trouble is least likely to be sitting on. They
 * are far more likely to be mid-puzzle, mid-breath, or on the screen where the
 * app just asked them to bring the thing back to mind. A way out that only
 * exists on the rating screens is a way out you have to finish the exercise to
 * reach.
 *
 * The pressure objection is answered by the drawing rather than by the absence:
 * a small `i` in a circle, the same size and weight as the appearance switch
 * beside it, is furniture. It is findable when looked for and unremarkable when
 * not, which is the bargain the whole chrome row makes.
 * ## Quiet, and not hidden
 *
 * The trigger is the app's quiet text-control treatment — muted, underlined, at
 * the caption tier, with no border and no fill. It is not a red button and it
 * is not an alert. Somebody who needs it is looking for it; somebody who does
 * not should be able to read past it without being asked a question.
 *
 * The size is not what makes it reachable, which is worth saying because it is
 * tempting to make it bigger: the `i` in the chrome row is on every screen in
 * the session and is the same size as the appearance switch, so this line is
 * the second way in rather than the only one.
 */

import { useState } from "react";
import {
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { useReducedMotion } from "react-native-reanimated";

import { ThemedText } from "@/components/themed-text";
import { Button } from "@/components/ui/button";
import { PressableScale } from "@/components/ui/pressable-scale";
import { Radius, Spacing } from "@/constants/theme";
import {
  DEFAULT_REGION,
  findRegion,
  HELPLINE_DIRECTORY,
} from "@/content/crisis";
import { CRISIS, SCOPE } from "@/content/strings";
import { useTheme } from "@/hooks/use-theme";
import { useRegionPreference } from "@/lib/region-preference";
import { useThemePreference } from "@/lib/theme-preference";
import { RegionPicker } from "@/session/ui/region-picker";
import { ScreenFilm } from "@/session/ui/screen-film";

/**
 * The scrim. Black rather than ink, for the reason written out in the example
 * modal this borrows its chrome from: a scrim has to be darker than the page it
 * dims, and in dark mode the page *is* the ink.
 */
const SCRIM_LIGHT = "rgba(0, 0, 0, 0.42)";
const SCRIM_DARK = "rgba(0, 0, 0, 0.62)";

const MAX_WIDTH = 420;

/**
 * Opens whatever the row points at and swallows a failure.
 *
 * Swallowed on purpose, and it is the one place in the app where that needed
 * thinking about rather than just doing. A device with no dialler — an iPad, a
 * managed phone — cannot open `tel:`, and there is nothing useful to say about
 * that in a toast. What saves it is the row's own label: every one of them
 * carries the number in words, so a tap that does nothing still leaves the
 * reader looking at "Text HOME to 741741" rather than at an error.
 */
function open(url: string) {
  void Linking.openURL(url).catch(() => {});
}

/**
 * Which panel is up, as one value rather than two booleans.
 *
 * The sheet and the country picker are separate native modals, and a native
 * modal is its own window — so "close that one, open this one" has to happen in
 * a single commit or the platform is briefly asked to hold both. One state
 * makes every move between them exactly that.
 *
 * The move worth naming is `onDone`: answering the country question returns to
 * the sheet instead of leaving the screen empty-handed. The only reason anybody
 * reaches the picker from here is to change which numbers the sheet prints, and
 * an app that closes both panels at that moment has made the reader open the
 * thing twice to see what their answer did. Android's back gesture inside the
 * picker lands in the same place, which is what back should mean.
 */
type Panel = "none" | "sheet" | "region";

function useSupportPanels() {
  const [panel, setPanel] = useState<Panel>("none");

  return {
    open: () => setPanel("sheet"),
    sheet: {
      visible: panel === "sheet",
      onClose: () => setPanel("none"),
      onChangeRegion: () => setPanel("region"),
    },
    picker: {
      visible: panel === "region",
      onDone: () => setPanel("sheet"),
    },
  };
}

export function SupportAccess() {
  const { open: show, sheet, picker } = useSupportPanels();

  return (
    <>
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={CRISIS.trigger}
        depth="text"
        hitSlop={Spacing.three}
        onPress={show}
        style={({ pressed }) => [styles.trigger, pressed && styles.pressed]}
      >
        <ThemedText
          type="small"
          themeColor="textMuted"
          style={styles.underline}
        >
          {CRISIS.trigger}
        </ThemedText>
      </PressableScale>

      <SupportSheet {...sheet} />
      <RegionPicker {...picker} />
    </>
  );
}

/**
 * The same sheet, from a round button in the chrome row.
 *
 * Drawn to match `ThemeToggle` exactly — same diameter, same hairline, same
 * fill, same corner — because the two sit side by side and any difference
 * between them would read as one of them being more important. It is the same
 * bargain the back button makes at the other end of the row: be findable when
 * looked for, be furniture when not.
 */
export function SupportButton() {
  const theme = useTheme();
  const { open: show, sheet, picker } = useSupportPanels();

  return (
    <>
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={CRISIS.buttonLabel}
        depth="text"
        hitSlop={Spacing.two}
        onPress={show}
        style={({ pressed }) => [
          styles.button,
          {
            borderColor: theme.border,
            backgroundColor: theme.backgroundElement,
          },
          pressed && styles.pressed,
        ]}
      >
        {/* A letter, not an icon — see `CRISIS.glyph`. The emphasis cut, so it
            holds its own against the sun and moon next to it, which are solid
            shapes rather than strokes. */}
        <ThemedText type="defaultSemiBold">{CRISIS.glyph}</ThemedText>
      </PressableScale>

      <SupportSheet {...sheet} />
      <RegionPicker {...picker} />
    </>
  );
}

function SupportSheet({
  visible,
  onClose,
  onChangeRegion,
}: {
  visible: boolean;
  onClose: () => void;
  /** Swaps this sheet for the country question — see `CRISIS.region`. */
  onChangeRegion: () => void;
}) {
  const theme = useTheme();
  const { region: chosen } = useRegionPreference();
  // `null` means nobody has been asked yet, which draws the same sheet as
  // "somewhere else": the directory, and no numbers this app cannot stand
  // behind. See `region-preference.tsx` on why the two states are not the same
  // thing everywhere else.
  const region = findRegion(chosen ?? DEFAULT_REGION);
  const { isDark } = useThemePreference();
  const reducedMotion = useReducedMotion();

  return (
    <Modal
      visible={visible}
      transparent
      animationType={reducedMotion ? "none" : "fade"}
      // Android's back gesture. Without it this is the one panel in the app a
      // person could be stuck inside, which would be a bad thing anywhere and
      // is a worse thing here.
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.root}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={CRISIS.close}
          onPress={onClose}
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: isDark ? SCRIM_DARK : SCRIM_LIGHT },
          ]}
        />

        <View
          accessibilityViewIsModal
          style={[
            styles.card,
            { backgroundColor: theme.surface, borderColor: theme.border },
          ]}
        >
          <ScrollView
            contentContainerStyle={styles.content}
            bounces={false}
            overScrollMode="never"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.heading}>
              <ThemedText type="subtitle">{CRISIS.title}</ThemedText>
              {/* The way back to the question the door asked once, and the
                  only route to changing an answer. It named the country until
                  recently — see `CRISIS.region` for why saying what it does
                  beats saying what the app knows. */}

              <ThemedText type="small" themeColor="textMuted">
                {SCOPE.full}
              </ThemedText>
              <PressableScale
                accessibilityRole="button"
                accessibilityLabel={CRISIS.region}
                depth="text"
                hitSlop={Spacing.two}
                onPress={onChangeRegion}
                style={({ pressed }) => pressed && styles.pressed}
              >
                <ThemedText
                  type="small"
                  themeColor="textMuted"
                  style={styles.underline}
                >
                  {CRISIS.region}
                </ThemedText>
              </PressableScale>
            </View>

            {/* What the app is and is not, and it sits here rather than at
                the foot of the sheet because of what is under it: the sentence
                ends by pointing at the numbers, and pointing works downward.
                See `SCOPE`, which is also shown on the door. */}

            {/* Each row is the whole target, and the number is in the label
                rather than in the detail line under it — the thing being tapped
                and the thing being read have to be the same thing when the
                person doing both is not at their best. */}
            <View style={styles.options}>
              {region.options.map((option) => (
                <PressableScale
                  key={option.id}
                  accessibilityRole="button"
                  accessibilityLabel={`${option.label}. ${option.detail}`}
                  depth="card"
                  onPress={() => open(option.url)}
                  style={({ pressed }) => [
                    styles.option,
                    { backgroundColor: theme.backgroundElement },
                    pressed && { backgroundColor: theme.backgroundSelected },
                  ]}
                >
                  <ThemedText type="defaultSemiBold">{option.label}</ThemedText>
                  <ThemedText type="small" themeColor="textMuted">
                    {option.detail}
                  </ThemedText>
                </PressableScale>
              ))}
            </View>

            {/* The directory, always — six countries is not the world, and
                the reader who needs this has already found that none of the
                numbers above are theirs. For `elsewhere` it is not a footnote
                but the whole sheet, so it gets its own sentence first. */}
            <View style={styles.directory}>
              {region.options.length === 0 ? (
                <ThemedText type="small" themeColor="textSecondary">
                  {CRISIS.directoryOnly}
                </ThemedText>
              ) : null}

              <PressableScale
                accessibilityRole="link"
                accessibilityLabel={CRISIS.directory}
                depth="text"
                hitSlop={Spacing.two}
                onPress={() => open(HELPLINE_DIRECTORY)}
                style={({ pressed }) => pressed && styles.pressed}
              >
                <ThemedText
                  type="small"
                  themeColor="textMuted"
                  style={styles.underline}
                >
                  {CRISIS.directory}
                </ThemedText>
              </PressableScale>
            </View>
          </ScrollView>

          {/* Outside the scroll, so the way out is on screen from the moment
              the card is, whatever the type size has done to the content. */}
          <Button title={CRISIS.close} variant="ghost" onPress={onClose} />
        </View>

        {/* The matte film again, because a native modal is its own window and
            the one in `app/_layout.tsx` does not reach into it. */}
        <ScreenFilm />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  // Sized to its own words rather than stretched: this sits under a scale or a
  // pair of answers, and a full-width target there would read as a third
  // option in whatever question is being asked above it.
  trigger: {
    alignSelf: "center",
    paddingVertical: Spacing.one,
  },
  underline: {
    textDecorationLine: "underline",
  },
  pressed: {
    opacity: 0.75,
  },
  // Every number here is `theme-toggle.tsx`'s and has to stay that way: the two
  // are a pair in the corner, and a circle a point off its neighbour reads as a
  // mistake rather than as a second control.
  button: {
    width: 34,
    height: 34,
    borderRadius: Radius.pill,
    borderWidth: StyleSheet.hairlineWidth * 2,
    alignItems: "center",
    justifyContent: "center",
  },
  root: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.four,
  },
  card: {
    width: "100%",
    maxWidth: MAX_WIDTH,
    maxHeight: "86%",
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth * 2,
    padding: Spacing.four,
    gap: Spacing.four,
  },
  content: {
    gap: Spacing.four,
  },
  heading: {
    gap: Spacing.two,
  },
  options: {
    gap: Spacing.two,
  },
  directory: {
    gap: Spacing.two,
  },
  // Filled rows rather than ruled ones — this is the one list in the app whose
  // items are actions rather than answers, and a fill is what says so.
  option: {
    padding: Spacing.three,
    borderRadius: Radius.md,
    gap: Spacing.half,
  },
});
