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
 * impression, and a sentence set at reading size in the middle of an empty page
 * reads as a caption to a picture that failed to load.
 *
 * So the opening takes `framed`: the heading tier, full ink, and a short rule
 * above and below it. It ran a tier higher than that for a while, at the screen
 * title's 28, which is the size a line gets when it is the only thing on the
 * page. This one is not quite that: it is a sentence about what the next four
 * minutes are, and set at 28 it wrapped to three lines on a phone and read as a
 * headline being announced rather than as the app saying hello. At 20 it holds
 * on two, and the frame is doing more of the work of placing it than the size
 * is — which is what the frame is for. Everything the frame does is say *this
 * is deliberate* —
 * a line with nothing around it is ambiguous about whether it was placed or
 * merely left there, and two hairlines are the cheapest way in typography to
 * settle that. The rules are deliberately far shorter than the text they hold,
 * because a rule that runs the measure is a divider between things and there is
 * nothing here to divide; held in the middle, they read as a frame around one
 * object instead. What they are not is faint — see `Rule`, which is the mark
 * itself and is shared with the breath's intro screen.
 *
 * The voice is unchanged. It is the same sentence in the same reading cut the
 * closing line is set in — see `readingCut`, which holds the tier's size and
 * hands back its weight — given the size the moment actually has.
 */

import { StyleSheet, View } from "react-native";

import { readingCut, ThemedText } from "@/components/themed-text";
import { Spacing } from "@/constants/theme";
import { Rule } from "@/session/ui/rule";

interface StageDirectionProps {
  children: string;
  /**
   * The opening treatment: heading tier, full ink, a rule above and below. Off
   * by default, which is the closing line — see the note above on why the two
   * ends stopped matching.
   */
  framed?: boolean;
}

export function StageDirection({ children, framed = false }: StageDirectionProps) {
  return (
    <View style={[styles.root, framed && styles.framed]}>
      {framed ? <Rule /> : null}

      <ThemedText
        type={framed ? "subtitle" : "default"}
        themeColor={framed ? "text" : "textMuted"}
        style={[styles.line, framed && readingCut]}>
        {children}
      </ThemedText>

      {framed ? <Rule /> : null}
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
  // The rules sit off the text by a block's gap rather than a line's: they are
  // not another line of the sentence, and at a line's distance they crowd the
  // ascenders and descenders of a display-sized face.
  framed: {
    gap: Spacing.three,
  },
  line: {
    textAlign: "center",
  },
});
