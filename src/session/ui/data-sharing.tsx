/**
 * The one switch in the app, and the one panel that puts it in front of
 * somebody.
 *
 * Two pieces in one file because they are one thing: the panel is the row with a
 * title and a button around it. `DataSharingRow` lives permanently in the
 * support sheet — the ⓘ in the chrome row, which is on every screen — and
 * `DataSharingSheet` is shown once, on the door, on the first launch.
 *
 * ## Why the first launch gets a panel of its own
 *
 * Because the alternative is a default that nobody was told about, and this app
 * in particular cannot afford one. Its own copy makes a virtue of keeping
 * nothing: the door says what the app is, the country question says the answer
 * "stays on this phone", and the session is thrown away on the way out. All
 * still true — none of them survive a reader finding out later that two mood
 * ratings had been going somewhere.
 *
 * It is the second panel on the first launch, after the country question, which
 * is a real cost and was weighed. Three things bring it down to something worth
 * paying once: it is the *only* other one, ever; it is one tap; and it arrives
 * on the door, which is the one screen in the app that is not in the middle of
 * something. See `index.tsx`, which chains them so they are never both up.
 *
 * ## Why the switch is on when it arrives
 *
 * Because that is what was asked for, and it is what nearly every app does. The
 * honest version of it is this panel: on, visible, and one tap from off, rather
 * than a line in a policy. `consent.tsx` has the note about what would have to
 * change if this ever shipped to the EU, where an analytics default of on is not
 * a default anybody is allowed.
 *
 * ## The control
 *
 * A platform `Switch`, which is the one place in this app that reaches for a
 * stock component instead of drawing its own. Everything else here is a button
 * or a card and gets the app's treatment; a switch is a control with a *state*,
 * and the platform's is the one every user on that platform already knows how to
 * read at a glance — including the ones reading it with a screen reader or with
 * a high-contrast setting on, both of which a hand-rolled pair of rounded views
 * would quietly break.
 */

import { Modal, StyleSheet, Switch, View } from "react-native";
import { useReducedMotion } from "react-native-reanimated";

import { ThemedText } from "@/components/themed-text";
import { Button } from "@/components/ui/button";
import { Radius, Spacing } from "@/constants/theme";
import { DATA_SHARING } from "@/content/strings";
import { useTheme } from "@/hooks/use-theme";
import { useDataSharing } from "@/lib/analytics/consent";
import { useThemePreference } from "@/lib/theme-preference";
import { ScreenFilm } from "@/session/ui/screen-film";

/** The same scrim both other sheets use, for the reason written out on them. */
const SCRIM_LIGHT = "rgba(0, 0, 0, 0.42)";
const SCRIM_DARK = "rgba(0, 0, 0, 0.62)";

const MAX_WIDTH = 420;

/**
 * The label, the switch, and the two sentences under them.
 *
 * The whole block is one accessibility node with the switch's role on it, so a
 * screen reader announces the thing being decided and its state together rather
 * than reading a paragraph and then finding a control with no subject.
 */
export function DataSharingRow() {
  const theme = useTheme();
  const { sharing, setSharing } = useDataSharing();

  return (
    <View style={styles.row}>
      <View style={styles.control}>
        {/* Takes the remaining width so a long label wraps rather than pushing
            the switch off the edge at the top of the Dynamic Type range. */}
        <ThemedText type="defaultSemiBold" style={styles.label}>
          {DATA_SHARING.label}
        </ThemedText>

        <Switch
          value={sharing}
          onValueChange={setSharing}
          accessibilityRole="switch"
          accessibilityLabel={DATA_SHARING.label}
          accessibilityHint={DATA_SHARING.detail}
          trackColor={{ false: theme.backgroundSelected, true: theme.accentStrong }}
          thumbColor={theme.surface}
          ios_backgroundColor={theme.backgroundSelected}
        />
      </View>

      {/* What is sent and what is not — see `DATA_SHARING`, where the rules
          this was written under are set out. Muted and at the caption tier: it
          is there to be read by whoever wants it, and it is not an argument. */}
      <ThemedText type="small" themeColor="textMuted">
        {DATA_SHARING.detail}
      </ThemedText>

      {/* Only shown while the switch is on, because it is a sentence about what
          turning it off would do. Under it, it would be a receipt for a decision
          already made. */}
      {sharing ? (
        <ThemedText type="fine" themeColor="textMuted">
          {DATA_SHARING.off}
        </ThemedText>
      ) : null}
    </View>
  );
}

/**
 * The same row, once, over the door.
 *
 * `visible` is the caller's to decide — see `index.tsx`, which shows it only
 * after the country question has been answered and only while
 * `acknowledged` is false. There is no dismiss beyond the button: the panel is
 * a notice, not a question, so there is nothing to escape without answering.
 * Android's back gesture takes the same route as the button, which is the right
 * meaning of back for something that is telling you rather than asking you.
 */
export function DataSharingSheet({
  visible,
  onDone,
}: {
  visible: boolean;
  onDone: () => void;
}) {
  const theme = useTheme();
  const { acknowledge } = useDataSharing();
  const { isDark } = useThemePreference();
  const reducedMotion = useReducedMotion();

  const done = () => {
    // Writes whatever the switch currently says, which is what turns "on and
    // never mentioned" into "on and read". See `consent.tsx`.
    acknowledge();
    onDone();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType={reducedMotion ? "none" : "fade"}
      onRequestClose={done}
      statusBarTranslucent
    >
      <View style={styles.root}>
        {/* Not pressable, for the country picker's reason: a tap outside a
            panel this small is far more likely to be a mis-aimed tap on the
            switch than a considered dismissal. */}
        <View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: isDark ? SCRIM_DARK : SCRIM_LIGHT },
          ]}
          pointerEvents="none"
        />

        <View
          accessibilityViewIsModal
          style={[
            styles.card,
            { backgroundColor: theme.surface, borderColor: theme.border },
          ]}
        >
          <ThemedText type="subtitle">{DATA_SHARING.title}</ThemedText>

          <DataSharingRow />

          {/* Said once, here, and then never again — a permanent pointer to a
              settings row would be the app reminding people it is measuring
              them. */}
          <ThemedText type="fine" themeColor="textMuted">
            {DATA_SHARING.later}
          </ThemedText>

          <Button title={DATA_SHARING.done} onPress={done} />
        </View>

        {/* The matte film, because a native modal is its own window — the same
            reason the other two sheets draw one. */}
        <ScreenFilm />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: Spacing.two,
  },
  control: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.three,
  },
  label: {
    flexShrink: 1,
  },
  root: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.four,
  },
  // Every number here is the other two sheets', and has to stay that way: they
  // are the same object with different things in it.
  card: {
    width: "100%",
    maxWidth: MAX_WIDTH,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth * 2,
    padding: Spacing.four,
    gap: Spacing.four,
  },
});
