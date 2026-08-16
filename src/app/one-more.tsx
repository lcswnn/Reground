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
 * ## Three of the five options aren't built
 *
 * They are on the list anyway, and tapping one lands on `NotYet`, which says
 * so. See the note there for why they aren't drawn as locked cards.
 *
 * The two that are built are not the same shape as each other. The 5-4-3-2-1 is
 * one exercise and gets the two-phase intro/sequence pair below; the somatic
 * step is six of them and carries its own picker, tutorial and clock. That is
 * the shape the remaining three will want too — soundscapes and progressive
 * muscle relaxation are both a choice followed by a timed thing — so the
 * grounding pair is the odd one out rather than the pattern to copy.
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
import { SomaticFlowView } from '@/session/somatic/somatic-flow';
import { useSomaticFlow } from '@/session/somatic/use-somatic-flow';
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
   * card. Somatic is the one option with enough behind it to have its own
   * answer, and it makes the same argument one level down.
   */
  const back =
    chosen === null ? toRating : chosen.id === 'somatic' ? somatic.back : toList;

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
