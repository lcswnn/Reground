/**
 * The four patterns, and the rules that apply to all of them.
 *
 * A menu inside a menu, which `/one-more` is right to be wary of. The case for
 * one here is the same one `somatic-picker.tsx` makes and a different fact
 * underneath it: the somatic list is a choice because the movements differ by
 * what the room allows, and this list is a choice because the patterns differ
 * by what a body will put up with. All four work from a chair with your eyes
 * shut, but a seven-second hold is fine for one person and horrible for the
 * next, and nothing in this session knows which. Choosing for the user would be
 * a guess with no way to say "not that one".
 *
 * Which is why every blurb opens with the count. On the somatic list the first
 * word is the setup, because that is what decides availability there; here it
 * is the numbers, because that is the whole of what separates these and it has
 * to be scannable down the list.
 *
 * The rules go above the list rather than on each card, behind a tap — see
 * `BREATHWORK_COPY.cautions` for why they exist and why this is where they sit.
 */

import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { GROUNDING_FADE } from '@/config/session';
import { BREATH_PATTERNS, type BreathPatternId } from '@/content/breathwork';
import { BREATHWORK_COPY } from '@/content/strings';
import { Spacing } from '@/constants/theme';
import { Disclosure, DISCLOSURE_LAYOUT } from '@/session/ui/disclosure';
import { OptionCard } from '@/session/ui/option-card';
import { OptionList } from '@/session/ui/option-list';

export function BreathPicker({ onPick }: { onPick: (id: BreathPatternId) => void }) {
  return (
    // Fades in for the reason every phase of this route does: it is a phase and
    // not a route, so no navigation animation covers the handover and a straight
    // swap would be a hard cut. See `grounding-intro.tsx`.
    <Animated.View entering={FadeIn.duration(GROUNDING_FADE.inMs)} style={styles.root}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        <View style={styles.heading}>
          <ThemedText type="subtitle">{BREATHWORK_COPY.title}</ThemedText>
          <ThemedText type="small" themeColor="textMuted">
            {BREATHWORK_COPY.lead}
          </ThemedText>
        </View>

        <Disclosure label={BREATHWORK_COPY.cautionsLabel}>
          {BREATHWORK_COPY.cautions.map((rule) => (
            <ThemedText key={rule} type="small" themeColor="textSecondary">
              {rule}
            </ThemedText>
          ))}
          {/* Set apart from the four above it, because it is not a fifth rule
              about how to do these — it is the size of what they do, and the one
              group of people this screen should not assume it is helping. */}
          <ThemedText type="small" themeColor="textMuted">
            {BREATHWORK_COPY.cautionsLimit}
          </ThemedText>
        </Disclosure>

        {/* Carries the layout transition so the list slides down when the rules
            open above it, rather than jumping. See `DISCLOSURE_LAYOUT`. */}
        <Animated.View layout={DISCLOSURE_LAYOUT}>
          {/* Ruled, like every other list in the app you pick from — the
              opening question, the topic follow-up, the games, the offer at the
              end. These four were the odd ones out: four rows separated by a
              gap and nothing else, which reads as four paragraphs that happen
              to be tappable rather than as a list with edges. See
              `OptionList` for why a line does this job better than a card. */}
          <OptionList>
            {BREATH_PATTERNS.map((pattern) => (
              <OptionCard
                key={pattern.id}
                label={pattern.title}
                detail={pattern.blurb}
                // Four rather than the six the somatic list carries, and compact
                // anyway: the rules sit above them and the blurbs are a full line
                // each, so the full card size puts the last one below the fold.
                compact
                onPress={() => onPick(pattern.id)}
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
