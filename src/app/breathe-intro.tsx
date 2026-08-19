/**
 * Screen 1 — what's about to happen, and a Start button.
 *
 * Shares its number with `breathe.tsx`: it is the front half of the same step,
 * not a step of its own.
 *
 * The breath is now the first thing in the session, before a single question is
 * asked. It used to sit after the category and the rating, on the reasoning
 * that the app should know what it was treating before it treated anything —
 * which is a reason that serves the app rather than the person holding it.
 * Someone who opens this wound up is in no state to categorise why, and the
 * breath is the one step that needs no answer from them to work: it is the same
 * half-minute whatever they would have tapped. So it runs regardless, first, and
 * the questions are asked of somebody who has already been given something.
 *
 * It exists because the breath is the first thing in the session that runs on
 * its own clock. Every screen before it waits for a tap; this one would start
 * animating the moment it faded in, and a user who arrived mid-inhale spends
 * the first cycle working out what they are meant to be copying. The
 * `leadInMs` hold inside `BreathingGuide` softens that; a screen that does not
 * begin until it is told removes it.
 *
 * No skip here. Skipping is offered on the breath itself, where the user has
 * seen what they would be skipping — an out on the screen before it is just a
 * second decision asked of someone who has already made enough of them.
 *
 * ## The explanation is on the screen now, not behind a tap
 *
 * It spent a long time inside a `Disclosure`, on the argument that someone who
 * already knows the technique — or who just wants to start — should get a title
 * and a button and nothing else to read. What changed is the screen's place in
 * the session: this is the first thing the app does now, before a single
 * question, so it is also where a person decides whether this app is worth the
 * next four minutes. A collapsed row that has to be tapped to find out what is
 * being asked of you is the wrong thing to meet first — it reads as an app
 * withholding its own instructions.
 *
 * So the two lines are simply there, under a rule that separates them from the
 * title. They are two sentences; the cost of having them on the page is far
 * lower than the cost of the tap, and nobody has to read them to press Start.
 */

import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import { readingCut, ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { BREATH_CYCLES } from '@/config/session';
import { BREATHE_INTRO } from '@/content/strings';
import { Spacing } from '@/constants/theme';
import { Rule } from '@/session/ui/rule';
import { SessionScreen } from '@/session/ui/session-screen';
import { useSessionBack } from '@/session/use-session-back';

export default function BreatheIntroScreen() {
  const router = useRouter();
  /**
   * No session guard, and nothing to guard: this screen now runs before
   * anything has been chosen or rated, so there is no state it could be missing
   * — see the note above. `useSessionBack` still answers for it, and answers
   * `undefined`, which is what draws no back button.
   */
  const back = useSessionBack('/breathe-intro');

  return (
    <SessionScreen centered onBack={back}>
      <View style={styles.root}>
        {/* One block: the title, the mark under it, and the two lines that say
            what the minute holds. The big gap on this screen belongs between
            the reading and the doing, and there is only one of it. */}
        <View style={styles.intro}>
          {/* The title tier's size in the reading cut — see `readingCut`. The
              same treatment the opening title card takes, and for the same
              reason: one large line with nothing above it to compete with does
              not need the display weight as well as the size. */}
          <ThemedText type="title" style={readingCut}>
            {BREATHE_INTRO.body}
          </ThemedText>

          {/* Left, because the column is — `Rule` takes its alignment from
              whatever holds it, and the title card at the door centres the same
              mark. It is what separates the heading from its explanation
              without spending a line of copy on a subheading. */}
          <Rule />

          <ThemedText themeColor="textSecondary">{BREATHE_INTRO.method}</ThemedText>
          <ThemedText themeColor="textSecondary">
            {BREATHE_INTRO.shape(BREATH_CYCLES)}
          </ThemedText>
        </View>

        <View style={styles.actions}>
          {/* The one `large` button in the app — see `Size` in `button.tsx`.
              This screen has a single action on it and it is the action that
              decides whether the session happens at all. */}
          <Button
            title={BREATHE_INTRO.start}
            size="large"
            onPress={() => router.replace('/breathe')}
          />
          <ThemedText type="small" themeColor="textMuted" style={styles.hint}>
            {BREATHE_INTRO.hint}
          </ThemedText>
        </View>
      </View>
    </SessionScreen>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: Spacing.six,
  },
  // One gap throughout, so the mark sits the same distance from the title above
  // it as from the copy below: a divider closer to one side than the other
  // reads as belonging to that side rather than as separating the two.
  intro: {
    gap: Spacing.three,
  },
  actions: {
    gap: Spacing.three,
  },
  hint: {
    textAlign: 'center',
  },
});
