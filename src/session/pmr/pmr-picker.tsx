/**
 * The four routines, and the rules that apply to all of them.
 *
 * The third menu-inside-a-menu in this step, and the one with the least
 * justification of the three until you look at what is on it. The somatic list
 * is a choice because the movements differ by what the room allows; the
 * breathing list is a choice because the patterns differ by what a body will
 * put up with. This one is a choice because the four are the same technique at
 * four *lengths*, and length is the thing this app has no way to guess: someone
 * with three minutes and someone with one need genuinely different rungs of the
 * same ladder.
 *
 * Which is why `PMR_COPY.lead` says out loud that it is a ladder. A user who
 * reads these as four alternatives and takes the shortest because it is
 * shortest has taken the last rung without the ladder — see the note on that
 * copy. It is the one picker in the app whose lead has to explain the *shape*
 * of the list rather than just the family it belongs to.
 *
 * Every blurb opens with the count for the same reason the breathing blurbs do:
 * on this list the numbers are what tells the options apart, and whether there
 * is tensing is the fact that makes a routine unavailable to somebody.
 */

import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { GROUNDING_FADE } from '@/config/session';
import { PMR_ROUTINES, type PmrRoutineId } from '@/content/pmr';
import { PMR_COPY } from '@/content/strings';
import { Spacing } from '@/constants/theme';
import { Disclosure, DISCLOSURE_LAYOUT } from '@/session/ui/disclosure';
import { OptionCard } from '@/session/ui/option-card';
import { OptionList } from '@/session/ui/option-list';

export function PmrPicker({ onPick }: { onPick: (id: PmrRoutineId) => void }) {
  return (
    // Fades in for the reason every phase of this route does: it is a phase and
    // not a route, so no navigation animation covers the handover and a straight
    // swap would be a hard cut. See `grounding-intro.tsx`.
    <Animated.View entering={FadeIn.duration(GROUNDING_FADE.inMs)} style={styles.root}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        <View style={styles.heading}>
          <ThemedText type="subtitle">{PMR_COPY.title}</ThemedText>
          <ThemedText type="small" themeColor="textMuted">
            {PMR_COPY.lead}
          </ThemedText>
        </View>

        <Disclosure label={PMR_COPY.cautionsLabel}>
          {PMR_COPY.cautions.map((rule) => (
            <ThemedText key={rule} type="small" themeColor="textSecondary">
              {rule}
            </ThemedText>
          ))}
          {/* Set apart from the four above it, because it is not a fifth rule
              about how to do these — it is the gap between what the trials ran
              and what this screen can offer. */}
          <ThemedText type="small" themeColor="textMuted">
            {PMR_COPY.cautionsLimit}
          </ThemedText>
        </Disclosure>

        {/* Carries the layout transition so the list slides down when the rules
            open above it, rather than jumping. See `DISCLOSURE_LAYOUT`. */}
        <Animated.View layout={DISCLOSURE_LAYOUT}>
          {/* Ruled, like every other list in the app you pick from — see
              `OptionList`. This screen, the breathwork picker and the somatic
              one were the three still separating their rows with a gap and
              nothing else, which is a stack of paragraphs rather than a list. */}
          <OptionList>
            {PMR_ROUTINES.map((routine) => (
              <OptionCard
                key={routine.id}
                label={routine.title}
                detail={routine.blurb}
                compact
                onPress={() => onPick(routine.id)}
              />
            ))}
          </OptionList>
        </Animated.View>
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    gap: Spacing.four,
    paddingBottom: Spacing.five,
  },
  heading: {
    gap: Spacing.two,
  },
});
