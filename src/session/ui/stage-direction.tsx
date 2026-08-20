/**
 * The line that opens and closes the app.
 *
 * Two screens use it and they are the two ends of the same session: the opening
 * line on the way in, "You may now close the app." on the way out. Both are the
 * app talking about itself rather than to the user — as close to a stage
 * direction as type gets — and neither is a thing to be done.
 *
 * Extracted the moment the second one wanted it. Two copies of it would have
 * agreed on the day they were written and nowhere after that.
 *
 * ## The two ends are no longer drawn alike, and that is the point
 *
 * They were, for a long time: the same muted body copy at both ends, so the
 * session was bookended by one voice. What broke the symmetry is that the two
 * ends stopped doing the same job. The last screen is an aside said on the way
 * out — it should get out of the way, and it now has the tip jar under it to
 * share the screen with. The first screen is the whole of the app's first
 * impression, and a sentence set at reading size in the middle of a page reads
 * as a caption to a picture that failed to load.
 *
 * So the opening takes `opening`: the title tier, full ink, and nothing else.
 *
 * ## It used to be framed, and the sphere is why it isn't
 *
 * There were two short rules, one above the line and one below, on the argument
 * that a line with nothing around it is ambiguous about whether it was placed
 * or merely left there. That was true of the screen it was written for, which
 * held one sentence on an empty page. The door has a slowly breathing sphere
 * above the line and a Begin button under it now, and on that screen the marks
 * were a third and fourth horizontal element stacked in the same column — the
 * eye read a rule, a line, a rule, a button, and had to work out which of them
 * went together. The sphere places the sentence better than a hairline can: it
 * is unmistakably above it and unmistakably part of the same screen.
 *
 * The size took over the rest of the job. The line ran at the heading tier
 * while it was framed, because the frame was doing the placing; unframed it
 * goes back to the title tier, which is the size a line gets when it is the
 * thing on the page rather than a heading over something else. `Rule` itself is
 * unchanged and still used — the breath's intro heads with one, and the closing
 * screen takes one under its title and another beside its parting idea.
 *
 * It is set in the display cut, weight and all. It spent a while in the reading
 * cut instead — see `readingCut` — which was the right call while the display
 * cut was a serif's 600 against a serif's 400 and the two read as different
 * voices rather than as one voice at two weights. On a single sans they are the
 * same letterforms with more or less ink in them, and the only thing the
 * lighter cut bought this line was less presence than the app's other headings
 * have.
 */

import { StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { Spacing } from "@/constants/theme";

interface StageDirectionProps {
  children: string;
  /**
   * The opening treatment: title tier, full ink. Off by default, which is the
   * closing line — muted body copy — see the note above on why the two ends
   * stopped matching.
   */
  opening?: boolean;
}

export function StageDirection({ children, opening = false }: StageDirectionProps) {
  return (
    <View style={styles.root}>
      <ThemedText
        type={opening ? "title" : "default"}
        themeColor={opening ? "text" : "textMuted"}
        style={styles.line}>
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
