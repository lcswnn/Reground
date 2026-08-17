/**
 * Screen 7b — one more thing, or nothing, and then the session is over.
 *
 * The letter is only there to keep `/close` at 8 and `/closed` at 9, the way
 * `index.tsx` explains. Unlike the other two lettered screens this one is not
 * optional: everybody sees it.
 *
 * This is what the aftercare step became. That screen offered exactly one
 * thing, picked from the category group and not presented as a choice, and the
 * argument for it was good: a menu is another decision handed to someone who
 * has just told us they feel no better. What changed is the number of things
 * there are to offer. With five, choosing for the user is not sparing them a
 * decision, it is hiding four options and hoping the guess lands.
 *
 * It also no longer depends on the rating. Everyone arrives here from
 * `/mood-after` — someone who improved gets the same offer as someone who
 * didn't, because feeling better is not a reason to be shown the door faster.
 * The one thing the rating still decides is what the previous screen says.
 *
 * ## Three phases, one route
 *
 * The list, then whatever was picked. Same shape as the aftercare screen it
 * replaces, and for the same reason: a route per exercise would mean deciding
 * twice which one is running — once to navigate and once to render.
 *
 * The choice itself is session state rather than local, which is the one
 * difference from that screen. `/close` sits behind it and its back button has
 * to know whether a check-in ran — see `routeIntoClose`.
 *
 * ## What is built, and the one option that depends on the build
 *
 * Four of the five run: the 5-4-3-2-1, the somatic movements, the soundscapes,
 * and the paced breathing patterns. Progressive muscle relaxation lands on
 * `NotYet`, which says so — see the note there for why it isn't drawn as a
 * locked card.
 *
 * Soundscapes are the odd one, because whether they work is not a question
 * about this code. They need mp3s in `assets/soundscapes/`, and until at least
 * one is there the option falls back to `NotYet` alongside the one that was
 * never written — hence `soundscapesReady`. That check is the only place in the
 * app where a feature's availability is a fact about the repository rather than
 * about the session.
 *
 * The four are not the same shape as each other, and the shapes are worth
 * reading in the order they were built. The 5-4-3-2-1 is one exercise and gets
 * the two-phase intro/sequence pair below. The somatic step is six of them and
 * carries a picker, a tutorial and a clock. The soundscapes are five of them
 * and carry a picker and nothing else — no tutorial, because there is nothing
 * to learn, and no closing beat, because the sound fading out is the closing
 * beat. The breathing patterns are four of them in the somatic shape — picker,
 * intro, the thing running, and a beat afterwards — because that shape is what
 * an exercise with something to explain and something to finish needs. It is
 * also the shape progressive muscle relaxation wants when it lands; the
 * grounding pair is the one that generalises to nothing.
 *
 * ## What isn't here
 *
 * `park-worry.tsx` — the "pick when you'll come back to it" step GROUP A used
 * to get automatically. Nothing routes to it now that this screen replaced the
 * branch that did. It is worth a card here rather than deletion, but it isn't
 * one of the five that were asked for, and adding it uninvited would be this
 * screen making the same choice-for-the-user mistake in the other direction.
 */

import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { ONE_MORE } from '@/content/strings';
import { ONE_MORE_OPTIONS, findOneMore, type OneMoreId } from '@/content/one-more';
import { Spacing } from '@/constants/theme';
import { GroundingIntro } from '@/session/aftercare/grounding-intro';
import { GroundingSequence } from '@/session/aftercare/grounding-sequence';
import { NotYet } from '@/session/aftercare/not-yet';
import { BreathFlowView } from '@/session/breathwork/breath-flow';
import { useBreathFlow } from '@/session/breathwork/use-breath-flow';
import { SomaticFlowView } from '@/session/somatic/somatic-flow';
import { useSomaticFlow } from '@/session/somatic/use-somatic-flow';
import { hasSoundscapes } from '@/session/soundscape/audio';
import { SoundscapeFlowView, useSoundscapeFlow } from '@/session/soundscape/soundscape-flow';
import { OptionCard } from '@/session/ui/option-card';
import { SessionScreen } from '@/session/ui/session-screen';
import { useSessionBack } from '@/session/use-session-back';
import { useSessionFlow } from '@/session/session-context';
import { useSessionGuard } from '@/session/use-session-guard';

export default function OneMoreScreen() {
  const router = useRouter();
  const active = useSessionGuard();
  const { oneMore, chooseOneMore } = useSessionFlow();
  const toRating = useSessionBack('/one-more');

  /**
   * Which half of the grounding phase is on screen — the same local, unrecorded
   * flag the aftercare screen used. There is no way to land on the prompts
   * without having read what they are, and nothing to remember afterwards.
   */
  const [started, setStarted] = useState(false);

  const toList = useCallback(() => {
    setStarted(false);
    chooseOneMore(null);
  }, [chooseOneMore]);

  /**
   * The somatic step has four beats of its own and its own idea of what back
   * means from each — a movement list, a tutorial, a clock, and the beat after
   * it. Called here rather than inside the component that draws them because
   * the back button is drawn by `SessionScreen` below, and it has to know which
   * of the four is showing. See the note at the top of `use-somatic-flow.ts`.
   *
   * `toList` is what it falls out to: backing off the movement list lands on
   * the five, not on the rating two screens up.
   */
  const somatic = useSomaticFlow(toList);

  /**
   * The soundscapes, which have two beats rather than somatic's four but need
   * the same thing from the frame: a back button that returns to their own list
   * before it returns to the five.
   */
  const soundscape = useSoundscapeFlow(toList);

  /**
   * The breathing patterns, which have somatic's four beats and want the same
   * thing from the frame: a back button that returns to their own list before
   * it returns to the five.
   */
  const breath = useBreathFlow(toList);

  /**
   * Whether any audio actually shipped in this build. Nothing else in the app
   * can tell — the files live in `assets/soundscapes/` and the offer is only
   * real once at least one of them is there, so with none the option falls back
   * to `NotYet` alongside the two that were never built.
   */
  const soundscapesReady = hasSoundscapes();

  if (!active) return null;

  /**
   * `?? null` folds an id with no option behind it back into "nothing picked",
   * which draws the list. Unreachable while the only writer is a card on that
   * list, and the right answer anyway: an id that no longer exists should put
   * the user in front of the ones that do.
   */
  const chosen = oneMore === null ? null : (findOneMore(oneMore) ?? null);

  const choose = (id: OneMoreId) => {
    setStarted(false);
    chooseOneMore(id);
  };

  const close = () => router.replace('/close');

  /**
   * With something picked, back means back to the list rather than out of the
   * screen: the list is genuinely the previous thing the user saw, and a button
   * that skips past it to the rating would strand anyone who tapped the wrong
   * card. The three options with a list of their own behind them answer this
   * themselves, making the same argument one level down.
   *
   * Written as a function rather than the chain of ternaries this used to be.
   * With three exercises delegating and one of them conditional on the build,
   * the chain had four levels of nesting and the reader had to hold all of them
   * to work out what a plain option does.
   */
  const backFor = () => {
    if (chosen === null) return toRating;
    if (chosen.id === 'somatic') return somatic.back;
    if (chosen.id === 'breathing') return breath.back;
    if (chosen.id === 'soundscape' && soundscapesReady) return soundscape.back;
    return toList;
  };

  const back = backFor();

  return (
    <SessionScreen onBack={back}>
      {chosen === null ? (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}>
          <View style={styles.heading}>
            <ThemedText type="subtitle">{ONE_MORE.title}</ThemedText>
            <ThemedText type="small" themeColor="textMuted">
              {ONE_MORE.lead}
            </ThemedText>
          </View>

          <View style={styles.list}>
            {ONE_MORE_OPTIONS.map((option) => (
              <OptionCard
                key={option.id}
                label={option.title}
                detail={option.blurb}
                // Five of them, which is one short of the topic picker's six
                // and past the point where the full size fits on a phone.
                compact
                onPress={() => choose(option.id)}
              />
            ))}
          </View>

          {/* The way past the question. Ghost and last, because it is an
              answer to the offer and not a step of its own — but it is on the
              screen, because an offer you cannot decline is not an offer. */}
          <Button title={ONE_MORE.skip} variant="ghost" onPress={close} />
        </ScrollView>
      ) : chosen.id === 'grounding' ? (
        started ? (
          // The one exercise with something after it: the count-down ends on a
          // question rather than on the door. See `check-in.tsx`.
          <GroundingSequence onDone={() => router.replace('/check-in')} />
        ) : (
          <GroundingIntro onStart={() => setStarted(true)} />
        )
      ) : chosen.id === 'somatic' ? (
        // Six movements behind this one, each with a tutorial and a clock, so
        // it draws its own phases rather than a single exercise. It ends on the
        // door like the other three will: the beat after the movement is part
        // of the movement and is inside there, so there is nothing left for a
        // check-in to ask. `routeIntoClose` already sends `/close`'s back
        // button here for anything that isn't the 5-4-3-2-1.
        <SomaticFlowView flow={somatic} onDone={close} />
      ) : chosen.id === 'breathing' ? (
        // Four patterns behind this one, each with an intro and a circle to
        // follow, so it draws its own phases in the same four beats somatic
        // does. It ends on the door rather than on a check-in: the beat after
        // the pattern — stop counting, see where the breath settles — is inside
        // there, so there is nothing left for another screen to ask.
        <BreathFlowView flow={breath} onDone={close} />
      ) : chosen.id === 'soundscape' && soundscapesReady ? (
        // Two beats rather than somatic's four: a list, then one of them
        // playing. It ends on the door for a different reason from the others
        // — the sound fading out is the ending, and a screen after it asking
        // how that went would be talking over it.
        <SoundscapeFlowView flow={soundscape} onDone={close} />
      ) : (
        <NotYet title={chosen.title} onBack={toList} onDone={close} />
      )}
    </SessionScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: Spacing.five,
    paddingBottom: Spacing.four,
  },
  heading: {
    gap: Spacing.two,
  },
  list: {
    gap: Spacing.three,
  },
});
