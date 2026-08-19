/**
 * Screen 8 — the end.
 *
 * What is deliberately absent is most of the design: no "come back later", no
 * timer, no streak, no rating of the app, no share sheet, no next step. The
 * session told the user to put the phone down and then asking them for
 * anything would make that a lie.
 *
 * The one button clears the session state — so whatever was entered is gone
 * before the app is opened again — and then goes forward, to `closed.tsx`. It
 * used to go back to Screen 1, which quietly made the whole thing a loop: the
 * screen that says "nothing here needs you again today" handed the user the
 * opening question and waited.
 *
 * ## The sign-off is marked, and ranged left
 *
 * "That's all." takes a `Rule` under it — the same short ink stroke the breath's
 * intro is headed with. It is the app's one mark for saying *this line was
 * placed*, and the last screen of the session is where that is most worth
 * saying: the door opposite it has a breathing sphere to do the same job, and
 * this screen has only type on it.
 *
 * Left rather than centred, which is the difference between this and the door.
 * The door is one line on an empty page with nothing under it, so it is an
 * object and sits in the middle of one. This screen is a heading with two lines
 * of reading beneath it and a button below that — a page, and a page has a left
 * edge. Centring the mark over ranged-left copy would leave it agreeing with
 * nothing. `Rule` has no alignment of its own for exactly this reason: it
 * follows whatever holds it.
 *
 * ## The idea is the biggest thing under the heading now
 *
 * The order of emphasis under the title used to run the other way: "Now try to
 * unwind…" at the heading tier, and the suggestion below it in muted body copy,
 * on the argument that the instruction is the point and the idea is an aside.
 * It is the wrong way round for the screen this is. The instruction is one the
 * user has already been given, twice, by a session that has spent ten minutes
 * saying put the phone down; the idea is the only thing on the page they have
 * not seen before, and it is the thing they leave holding.
 *
 * So the instruction comes down a tier to body copy, and the idea goes up one
 * to the heading tier and out into its own block, marked with a `Rule` standing
 * at its left. That mark is doing what an indent and a bar do in a book: this
 * paragraph is a different kind of thing from the ones around it. It stays
 * muted, which is what keeps it a suggestion — the size says look here, the ink
 * says you can also not.
 *
 * "Idea" sits above it rather than in front of it, in the eyebrow slot. Inline,
 * it was a word the eye had to get past before the suggestion started, and at
 * the heading tier it would have been a large one; stacked, it is a caption on
 * a block and the suggestion begins at the left margin like any other line of
 * reading. A screen reader still gets the sentence — see `CLOSE.idea` — because
 * the two are one utterance to somebody listening even when they are two rows
 * to somebody looking.
 */

import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import { readingCut, ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { CLOSE, pickUnwindIdea } from '@/content/strings';
import { Spacing } from '@/constants/theme';
import { Rule } from '@/session/ui/rule';
import { SessionScreen } from '@/session/ui/session-screen';
import { useSessionBack } from '@/session/use-session-back';
import { useSessionFlow } from '@/session/session-context';

export default function CloseScreen() {
  const router = useRouter();
  const { reset } = useSessionFlow();
  // Three routes lead here and the state says which — see `routeIntoClose`.
  const back = useSessionBack('/close');
  // Lazy initial state: one idea for the life of the screen. Calling this in
  // the body would hand the user a different suggestion on every re-render.
  const [idea] = useState(pickUnwindIdea);

  const done = () => {
    reset();
    router.replace('/closed');
  };

  return (
    <SessionScreen centered onBack={back}>
      <View style={styles.root}>
        <View style={styles.heading}>
          {/* The screen title tier, at the left edge the rest of the screen
              reads from. */}
          <ThemedText type="title">{CLOSE.title}</ThemedText>
          <Rule />
        </View>

        {/* Body copy: the same tier as every other line in the app written to
            be read. It was the heading tier, which made the one instruction
            the user has already been given the second-largest thing on the
            last screen of the session. */}
        <ThemedText themeColor="textSecondary">{CLOSE.body}</ThemedText>

        {/* Its own block, and the only thing on this screen set off by a mark.
            The row is what gives the stroke its height — see `Rule`'s
            `vertical`, which stretches to whatever holds it, so the mark runs
            the full depth of the suggestion however many lines it wraps to. */}
        <View style={styles.idea}>
          <Rule vertical />
          {/* One item to a screen reader, two rows to everybody else: the
              composed sentence is the label, and the rows inside are hidden
              from the tree so the same words are not also read one at a time. */}
          <View
            accessible
            accessibilityLabel={CLOSE.idea(idea)}
            style={styles.ideaBody}>
            <ThemedText type="eyebrow" themeColor="textMuted">
              {CLOSE.ideaHeading}
            </ThemedText>
            {/* Muted, so it stays a suggestion rather than a fourth instruction
                — the tier says look at this, the ink says you don't have to.

                The heading tier's size in the reading cut: the heading tier is
                set in the display face, which is the semibold, and a whole
                paragraph of it would read as a second heading rather than as
                something to consider. See `readingCut`, which hands back the
                body face and keeps the size. */}
            <ThemedText type="subtitle" themeColor="textMuted" style={readingCut}>
              {idea}.
            </ThemedText>
          </View>
        </View>

        <View style={styles.action}>
          <Button title={CLOSE.done} variant="ghost" onPress={done} />
        </View>
      </View>
    </SessionScreen>
  );
}

const styles = StyleSheet.create({
  // Two blocks now — the framed sign-off and the reading under it — so the
  // outer gap is the one the app puts between the blocks of a screen. The
  // pause before the button still does the separating.
  root: {
    gap: Spacing.three,
  },
  // The same gap above the mark as the `root` gap leaves below it, so the rule
  // sits equidistant from the title and the copy: a divider closer to one side
  // than the other reads as belonging to that side rather than as separating
  // the two. `breathe-intro.tsx` frames its heading the same way.
  heading: {
    // No `alignItems`: `Rule` is a fixed 64 points wide and a column child of
    // its natural size starts at the leading edge, which on this screen is
    // where every line of type starts too.
    gap: Spacing.three,
  },
  // The mark and the suggestion it marks, side by side. The gap is the one the
  // app puts between the lines of a block rather than between blocks: the
  // stroke is not a separate thing standing near the text, it belongs to it.
  //
  // The margin is on top of `root`'s gap, and the two together put the
  // suggestion a step further out than the ordinary distance between the blocks
  // of a screen — see `Spacing`. `root` is held at the smaller step because the
  // rule under the title has to sit the same distance from the title as from
  // the line below it, and that line is reading rather than a block of its own.
  //
  // The extra is what makes the suggestion read as an aside set off from the
  // page rather than as the next paragraph of it. It is the only thing on this
  // screen with a mark beside it, and a marked block sitting at the same
  // distance as everything else has the mark doing all the work alone. Still
  // well short of the pause before the button, which is the one long silence
  // here and belongs to the difference between reading and doing.
  idea: {
    flexDirection: 'row',
    gap: Spacing.three,
    marginTop: Spacing.four,
  },
  // Takes the rest of the row, so the suggestion wraps against the screen's
  // margin instead of pushing the mark off the left edge. The label and the
  // suggestion are one block, at a block's internal gap.
  ideaBody: {
    flex: 1,
    gap: Spacing.two,
  },
  // The long pause, the same one `/breathe-intro` and `/reactivate` put
  // between what a screen says and what it asks.
  action: {
    marginTop: Spacing.six,
  },
});
