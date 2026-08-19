/**
 * A list of choices, ruled rather than boxed.
 *
 * Three screens offer a list you pick from — the opening question, the game
 * picker, the offer of one last thing — and all three used to draw their
 * options as cards: a fill, an outline, a corner radius, a gap between each.
 * Four kinds of chrome to say "this is one item, and here is where it ends",
 * which is a job one line does. Stacked three or five deep, the cards were the
 * loudest thing on their screens, and on the opening question they made a
 * two-answer choice look like a form.
 *
 * So the chrome is gone and what is left is the type, separated by a rule above
 * the first row, between every pair, and below the last. The list reads as a
 * table of contents rather than a control panel, which is nearer what it is:
 * these are things to read and then choose between, not switches.
 *
 * ## The rules are inset, and so is the type — but not the target
 *
 * The lines run to `LINE_WIDTH` of the column and sit centred, so they stop
 * short of the full measure at both ends. That is the difference between a
 * separator and a border: a line that runs edge to edge closes the row off into
 * a box again, which is the thing this replaced.
 *
 * The type inside each row is held to the same edges, by `LIST_INSET` — the
 * margin the lines leave, shared out. That is what makes the list read as one
 * object: a line that starts inboard of the word above it has no relationship
 * to it, and the eye reads two systems on one screen rather than a list. Each
 * row imports the inset from here rather than writing a number of its own, so
 * the two cannot drift when the width is next tuned.
 *
 * The *target* is wider than either, and only the type moves. A row is a tap,
 * and a tap that misses because it landed in the margin beside the words is a
 * bad row — so the pressable runs past the rules, past the column, and out to
 * the edge of the screen. See `LIST_BLEED`.
 */

import { Children, Fragment, type ReactNode } from "react";
import { StyleSheet, View, type DimensionValue } from "react-native";

import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

/**
 * How far across the column the rules run, as a percentage. Short of the full
 * measure on purpose — see above.
 */
const LINE_WIDTH = 95;

/**
 * The margin that leaves, on one side: what a row indents its type by so the
 * words start exactly where the line above them does.
 *
 * Derived rather than written down, because it is not an independent choice —
 * it is the other half of `LINE_WIDTH`, and a hand-kept copy of it would come
 * loose the first time that number moved. The cast is the one this needs: the
 * arithmetic produces a `string` where the style wants a percentage.
 */
export const LIST_INSET = `${(100 - LINE_WIDTH) / 2}%` as DimensionValue;

/**
 * How far a row reaches past the column it sits in, on each side.
 *
 * `SessionScreen` gutters every screen by `Spacing.four`, so a row given that
 * much negative margin — and the same amount back as padding, which puts its
 * contents exactly where they were — is 48 points wider than it looks, running
 * edge to edge on the glass while everything inside it stays lined up with the
 * rules.
 *
 * Nothing is drawn out there. It is target and only target: a tap that lands in
 * the gutter beside the words is a tap meant for that row, and a row that
 * ignored it would be a row with a dead strip down each side. It cost nothing
 * to widen, and the two hardest options to hit — the first screen's pair, which
 * everything downstream branches on — got the most out of it.
 *
 * The bleed outlived the reason it was added. A press used to tint the row and
 * the tint had to reach the edges or read as a panel lighting up rather than as
 * the row you touched; the tint is gone now and the press is the row giving
 * under the finger. The width stayed because the target was the better half of
 * it anyway.
 */
export const LIST_BLEED = Spacing.four;

export function OptionList({ children }: { children: ReactNode }) {
  const theme = useTheme();
  // `toArray` drops the nulls a conditional row leaves behind, so an absent
  // option cannot leave two rules stacked on each other.
  const rows = Children.toArray(children);
  if (rows.length === 0) return null;

  const line = (
    <View style={[styles.line, { backgroundColor: theme.border }]} />
  );

  return (
    <View>
      {rows.map((row, index) => (
        <Fragment key={index}>
          {line}
          {row}
        </Fragment>
      ))}
      {line}
    </View>
  );
}

const styles = StyleSheet.create({
  // The app's divider weight and colour — the same hairline the cards used to
  // be outlined in, which is why the list did not get quieter when they went,
  // only simpler. Distinct from `Rule`, which is an ink mark under a heading
  // rather than a separator between rows.
  line: {
    width: `${LINE_WIDTH}%`,
    alignSelf: "center",
    height: StyleSheet.hairlineWidth * 2,
  },
});
