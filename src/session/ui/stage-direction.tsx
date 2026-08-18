/**
 * The quiet line that opens and closes the app.
 *
 * Two screens use it and they are the two ends of the same session: "Time to
 * reground." on the way in, "You may now close the app." on the way out. Both
 * are the app talking about itself rather than to the user — as close to a stage
 * direction as type gets — and neither is a thing to be done. Muted, so it
 * reads as an aside and gets out of the way, and set at the body tier, which is
 * the tier for anything written to be read. It carried a size of its own for a
 * while — three points over the body tier, on the argument that a line alone on
 * a screen needs the room — and then a spell at the caption tier, which is what
 * the app sets hints and legends at. Neither was right: it is not a caption,
 * because there is nothing beside it to be a caption to, and it does not need a
 * size of its own, because the emphasis is already in it being the only line on
 * the screen. Body copy, muted, alone.
 *
 * Extracted the moment the second one wanted it. Two copies of it would have
 * agreed on the day they were written and nowhere after that — these two
 * lines have to stay the same weight as each other or the session stops being
 * bookended.
 */

import { StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { Spacing } from "@/constants/theme";

export function StageDirection({ children }: { children: string }) {
  return (
    <View style={styles.root}>
      <ThemedText themeColor="textMuted" style={styles.line}>
        {children}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: "center",
    // `SessionScreen`'s chrome row (the appearance switch, always present even
    // on these two screens' no-back-button state) takes layout space above
    // `centered`'s content, so the true midpoint of that content sits half a
    // chrome-row below the screen's actual centre. Pulled back up by roughly
    // half of it — chrome row plus its margin — so the line lands on centre
    // rather than visibly under it.
    marginTop: -Spacing.four,
  },
  line: {
    textAlign: "center",
  },
});
