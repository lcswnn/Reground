/**
 * The quiet line that opens and closes the app.
 *
 * Two screens use it and they are the two ends of the same session: "Time to
 * reground." on the way in, "You may now close the app." on the way out. Both
 * are the app talking about itself rather than to the user — as close to a stage
 * direction as type gets — and neither is a thing to be done. Muted, so it reads
 * as an aside and gets out of the way — but sized above the body tier it takes
 * its family and colour from: each is the only line on its screen, and anything
 * at reading size leaves it looking like a footnote to a page that wasn't
 * there. It is the page. The size is set here rather than by picking a named
 * tier because no tier fits — the display tiers are a heading's face and these
 * two are not headings, and the body tiers are drawn for paragraphs of copy
 * rather than for one line alone in the middle of the screen.
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
      <ThemedText type="default" themeColor="textMuted" style={styles.line}>
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
    // Three points over `default`, which came down with the rest of the scale
    // and took these two with it. Still short of `subtitle` at 20, and still
    // the reading face rather than the display one, so it reads as an aside
    // that happens to be alone rather than as the heading of a page.
    fontSize: 19,
  },
});
