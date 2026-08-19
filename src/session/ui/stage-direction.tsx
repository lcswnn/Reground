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
 * So the opening takes `framed`: the title tier, full ink, and a short rule
 * above and below it. Everything the frame does is say *this is deliberate* —
 * a line with nothing around it is ambiguous about whether it was placed or
 * merely left there, and two hairlines are the cheapest way in typography to
 * settle that. The rules are deliberately far shorter than the text they hold,
 * because a rule that runs the measure is a divider between things and there is
 * nothing here to divide; held in the middle, they read as a frame around one
 * object instead. What they are not is faint: they are drawn in ink at two
 * points with rounded ends, because a frame nobody can see is not a frame. See
 * `RULE_HEIGHT`.
 *
 * The voice is unchanged. It is the same sentence in the same reading cut the
 * closing line is set in — see `framedLine`, which holds the title tier's size
 * and hands back its weight — given the size the moment actually has.
 */

import { StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { Fonts, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

/**
 * How wide the two rules run.
 *
 * Short of the text on purpose — see above. Fixed rather than a share of the
 * line's width, because the line wraps: a rule sized to the text would be one
 * length on a phone and another on a tablet, and this is a mark rather than a
 * measurement.
 */
const RULE_WIDTH = 64;

/**
 * And how thick, which is the one measurement here that is not a hairline.
 *
 * The rest of the app rules at `hairlineWidth * 2` — a third of a point on a
 * 3× screen — in `border`, which is ink at 20%. That is the right weight for a
 * line whose job is to separate two things without being looked at. These two
 * are the opposite: they are the frame, they are half of what makes the opening
 * line read as placed rather than left there, and at a hairline in `border`
 * they were a rumour. Two points of full ink is still a small mark at this
 * width — it is a pen stroke rather than a divider.
 */
const RULE_HEIGHT = 2;

interface StageDirectionProps {
  children: string;
  /**
   * The opening treatment: title tier, full ink, a rule above and below. Off by
   * default, which is the closing line — see the note above on why the two ends
   * stopped matching.
   */
  framed?: boolean;
}

export function StageDirection({ children, framed = false }: StageDirectionProps) {
  const theme = useTheme();
  // `text`, not `border`: ink on paper in light mode and paper on ink in dark,
  // so the frame carries the same weight as the line it holds in either. See
  // `RULE_HEIGHT`.
  const rule = <View style={[styles.rule, { backgroundColor: theme.text }]} />;

  return (
    <View style={[styles.root, framed && styles.framed]}>
      {framed ? rule : null}

      <ThemedText
        type={framed ? "title" : "default"}
        themeColor={framed ? "text" : "textMuted"}
        style={[styles.line, framed && styles.framedLine]}>
        {children}
      </ThemedText>

      {framed ? rule : null}
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
  // ascenders and descenders of a title-sized face.
  framed: {
    gap: Spacing.three,
  },
  rule: {
    width: RULE_WIDTH,
    height: RULE_HEIGHT,
    borderRadius: RULE_HEIGHT / 2,
  },
  // The title tier's size in the reading cut rather than its own semibold one.
  // The only override of a tier's face in the app, and it earns it: the display
  // cut is drawn for headings that have copy under them to outweigh, and this
  // line has nothing under it at all — set in 600 at 28 points it read as
  // shouting the app's first sentence at somebody who opened it wound up. The
  // size is doing the work the weight was doing, and the frame is doing the
  // rest.
  framedLine: {
    fontFamily: Fonts.body,
  },
  line: {
    textAlign: "center",
  },
});
