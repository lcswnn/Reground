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
 *
 * ## The example is a screen of its own now
 *
 * "Watch an example first" is the second button here, and it goes to
 * `example.tsx`: the sigh running on a loop with its three steps numbered under
 * it. It has been a disclosure inside this screen and then a modal over it, and
 * both were the same mistake at different sizes — a breath is watched rather
 * than read, and it wants the room to be watched in.
 *
 * It is still behind a press, and that has not changed for the reason it never
 * changes: this screen exists to be still. Nothing here starts on its own —
 * that is the whole point of it sitting ahead of `breathe.tsx` — and a circle
 * already breathing when the screen fades in would take that back before the
 * Start button could offer it.
 *
 * The example is a ghost button rather than the underlined line of small text
 * it was, because of who presses it: somebody who has read three numbered steps
 * and is not sure they can follow them, which is exactly the person least
 * likely to go hunting for a link. An outline says "this is a control" without
 * a fill, so Start is still plainly the action on the screen and this is
 * plainly the other one.
 *
 * It sits *above* Start, which is the order the two are met in rather than the
 * order of their importance. The doubt comes before the commitment: a way out
 * offered underneath the button that commits you is a way out found after the
 * fact. It also leaves Start where it has always been — last, above its own
 * hint, hard against the foot of the screen and level with Begin on the door.
 */

import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
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
    <SessionScreen onBack={back}>
      {/* No scroll container at all, and that is the fix rather than a smaller
          one. Disabling the gesture unless the content measurably overflowed
          got most of the way there and still left the page able to jiggle by
          the fraction of a point `flexGrow: 1` produces whenever a float lands
          over. A plain column cannot be dragged.

          What it costs is the safety valve. At the top of the Dynamic Type
          range on a short phone there is now nothing to scroll, so the content
          has to fit by construction — which is what `root`'s gap below is
          holding, and what the copy on this screen has to keep clearing. The
          door is laid out identically, for the same reason and to the same
          numbers, so Start and Begin stay on one height. */}
      <View style={styles.root}>
        {/* Takes all the room above the actions and centres the reading in
            it — the same shape the door has, with the sphere and the line in
            place of this. */}
        <View style={styles.stage}>
          {/* One block: the title, the mark under it, and the lines that say
              what the minute holds. */}
          <View style={styles.intro}>
            {/* The title tier, plain: size and weight both. It carried
                `readingCut` for a long time — the same treatment the door's
                line took — on the argument that a large line alone on a page
                does not need the display weight as well as the size. That
                argument was written when the display cut was a serif's 600
                against a serif's 400, which is a real difference in voice.
                The app is on one sans now and the two cuts differ only in
                weight, so all the reading cut bought here was a lighter
                heading. See `readingCut`, which has no callers left at all. */}
            <ThemedText type="title">
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
        </View>

        <View style={styles.actions}>
          {/* Above Start rather than below it, which is the order the two are
              actually met in: somebody who is not sure they can follow the
              steps needs the way out of that *before* they reach the button
              that commits them, not after. It also puts Start last, next to
              its own hint and hard against the bottom of the screen, which is
              where a thumb already is.

              Ghost, so the outline says control while the fill below it stays
              the action. The two never compete: this one is regular size and
              unfilled, that one is `large` and solid. */}
          <Button
            title={BREATHE_INTRO.example}
            variant="ghost"
            onPress={() => router.replace('/example')}
          />
          {/* `large` — see `Size` in `button.tsx`. This screen has a single
              action on it and it is the action that decides whether the
              session happens at all. The door's Begin is the other one, and
              the pair are deliberately identical: same size, same block, same
              height off the bottom of the screen. */}
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
  // The long pause between the reading and the doing, one step down from the
  // `six` the door uses and the one place this screen buys back the height it
  // needs to fit without scrolling.
  //
  // The two screens are otherwise laid out identically, and this is the honest
  // asymmetry between them: the door holds one sentence and a sphere, where
  // this holds a title, a rule, four numbered steps, a line about the length,
  // and a link. At `six` that came to more than a small phone has, and the pause
  // was both the largest single item on the screen and the only one that is not
  // content. Thirty-two points is still a clear break between what you read and
  // what you press — it is the step the ramp gives a screen's run-out — and it
  // is what the numbers below have to keep clearing.
  root: {
    flex: 1,
    // The padding that used to sit on the scroll container. Same distance, same
    // place, nothing to drag — and equal to the door's, which is what keeps
    // Start and Begin on one height.
    paddingVertical: Spacing.four,
    gap: Spacing.five,
  },
  // The reading, centred in everything the actions do not use.
  stage: {
    flex: 1,
    justifyContent: 'center',
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
