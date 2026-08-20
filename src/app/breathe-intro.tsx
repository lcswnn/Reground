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
 * ## The example is behind a tap, and for the opposite reason
 *
 * "See example" opens `SighExampleModal`: the breath in miniature, looping,
 * with its three steps lit one at a time. That is not the arrangement the
 * paragraph above argues against — what was wrong with the collapsed
 * explanation was hiding the *instructions*, and those are now on the page.
 * This hides a demonstration, which is a different thing to owe somebody.
 *
 * It has to be a tap because of what this screen is for. Nothing here starts on
 * its own — that is the whole reason the screen exists, ahead of `breathe.tsx`
 * — and a circle already breathing when the screen fades in would take that
 * back before the Start button could offer it. Someone who reads the steps and
 * knows what a sigh is presses Start against a still page; someone who doesn't
 * asks to be shown, and is.
 *
 * A panel over the screen rather than a block inside it, for the reason written
 * out in `sigh-example-modal.tsx`: an example that pushed the Start button down
 * the page while it played would be paying for a look with the layout of the
 * one screen in the app that is meant to sit still.
 */

import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import { readingCut, ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { PressableScale } from '@/components/ui/pressable-scale';
import { BREATH_CYCLES } from '@/config/session';
import { BREATHE_INTRO } from '@/content/strings';
import { Spacing } from '@/constants/theme';
import { SighExampleModal } from '@/session/breathing/sigh-example-modal';
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
  /**
   * The example, and the whole of what this screen remembers. Closed on
   * arrival and never remembered between visits — the same rule `Disclosure`
   * holds itself to, and for the same reason: a screen that opens something
   * because of what you did last time is a screen deciding for you.
   */
  const [example, setExample] = useState(false);

  return (
    <SessionScreen onBack={back}>
      {/* Scrolls, but only when it has to. `centered` on the screen would have
          done the centring and nothing else — it is a flex child with no scroll
          in it, so the numbered method plus a large type setting pushes the
          Start button off the bottom of a small phone rather than making it
          reachable. `flexGrow: 1` fills the screen while the content fits, and
          scrolls the moment it doesn't.

          The centring moved off this container and onto the reading block
          inside it, so that the actions can sit at the foot of the screen
          rather than wherever the copy happens to end. That is what the door
          does with Begin, and the two screens run back to back: with the same
          gap, the same hint line and the same bottom padding under both, Start
          lands on exactly the height Begin was at and the button does not jump
          as the app moves between them. */}
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}>
        <View style={styles.root}>
          {/* Takes all the room above the actions and centres the reading in
              it — the same shape the door has, with the sphere and the line in
              place of this. */}
          <View style={styles.stage}>
            {/* One block: the title, the mark under it, and the lines that say
                what the minute holds. */}
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
              {/* Last in the block, so it sits between the reading and the doing
                  — the thing you reach for having read the steps and wanted to
                  see them rather than be told them.

                  Underlined small text rather than a second button: the screen
                  has one action on it and this is not it. The underline is what
                  says "tappable" without a word of explanation — the same three
                  quiet steps the tip link at the end of the session takes, one
                  rank quieter, because down there the link is the only offer on
                  the screen and up here it sits beside the Start button. */}
              <PressableScale
                accessibilityRole="button"
                accessibilityLabel={BREATHE_INTRO.example}
                depth="text"
                hitSlop={Spacing.three}
                onPress={() => setExample(true)}
                style={({ pressed }) => [styles.example, pressed && styles.pressed]}>
                <ThemedText type="small" themeColor="textSecondary" style={styles.underline}>
                  {BREATHE_INTRO.example}
                </ThemedText>
              </PressableScale>
            </View>
          </View>

          <View style={styles.actions}>
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
      </ScrollView>

      <SighExampleModal visible={example} onClose={() => setExample(false)} />
    </SessionScreen>
  );
}

const styles = StyleSheet.create({
  // No `justifyContent` here any more: the centring belongs to `stage` below,
  // which is what leaves the actions at the foot of the screen. The bottom half
  // of this padding is the same step the door puts under Begin, and the two
  // have to stay equal — see the note above the `ScrollView`.
  scroll: {
    flexGrow: 1,
    paddingVertical: Spacing.four,
  },
  root: {
    flex: 1,
    gap: Spacing.six,
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
  // Sized to its own words rather than stretched across the column, like the
  // disclosure trigger it replaced: a full-width target on a screen with one
  // real button reads as a second button.
  example: {
    alignSelf: 'flex-start',
    paddingVertical: Spacing.one,
  },
  underline: {
    textDecorationLine: 'underline',
  },
  // The same shallow dim every other small text control takes.
  pressed: {
    opacity: 0.75,
  },
});
