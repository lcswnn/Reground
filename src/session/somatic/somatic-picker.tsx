/**
 * The six movements, and the rules that apply to all of them.
 *
 * A menu inside a menu, which `/one-more` is right to be wary of — it makes the
 * case against handing someone a list when a mechanism could have chosen for
 * them. The case does not apply here, and for the same reason it did not apply
 * to the list above it: what separates these six is not effectiveness, it is
 * what the room allows. Two of them need somewhere to stand, one needs somewhere
 * you can make a noise, and three work in a chair with a coat on. Nothing in the
 * session knows which of those the user is sitting in, so choosing for them
 * would be a guess with a one-in-six chance and no way to say "not that one".
 *
 * Which is why every blurb opens with the setup rather than the benefit. The
 * first word is the thing that decides whether a card is available to somebody
 * right now, and it belongs where it can be scanned down the list.
 *
 * The rules go above the list rather than on each card, behind a tap — see
 * `SOMATIC_COPY.principles` for why they exist at all and why this is where
 * they sit.
 */

import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { GROUNDING_FADE } from '@/config/session';
import { SOMATIC_MOVEMENTS, type SomaticId } from '@/content/somatic';
import { SOMATIC_COPY } from '@/content/strings';
import { Spacing } from '@/constants/theme';
import { Disclosure, DISCLOSURE_LAYOUT } from '@/session/ui/disclosure';
import { OptionCard } from '@/session/ui/option-card';

export function SomaticPicker({ onPick }: { onPick: (id: SomaticId) => void }) {
  return (
    // Fades in for the reason every phase of this route does: it is a phase and
    // not a route, so no navigation animation covers the handover and a straight
    // swap would be a hard cut. See `grounding-intro.tsx`.
    <Animated.View
      entering={FadeIn.duration(GROUNDING_FADE.inMs)}
      style={styles.root}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        <View style={styles.heading}>
          <ThemedText type="subtitle">{SOMATIC_COPY.title}</ThemedText>
          <ThemedText type="small" themeColor="textMuted">
            {SOMATIC_COPY.lead}
          </ThemedText>
        </View>

        <Disclosure label={SOMATIC_COPY.principlesLabel}>
          {SOMATIC_COPY.principles.map((rule) => (
            <ThemedText key={rule} type="small" themeColor="textSecondary">
              {rule}
            </ThemedText>
          ))}
          {/* Set apart from the four above it, because it is not a fifth rule
              about how to do these — it is the edge of what they are. */}
          <ThemedText type="small" themeColor="textMuted">
            {SOMATIC_COPY.principlesLimit}
          </ThemedText>
        </Disclosure>

        {/* Carries the layout transition so the cards slide down when the rules
            open above them, rather than jumping. See `DISCLOSURE_LAYOUT`. */}
        <Animated.View layout={DISCLOSURE_LAYOUT} style={styles.list}>
          {SOMATIC_MOVEMENTS.map((movement) => (
            <OptionCard
              key={movement.id}
              label={movement.title}
              detail={movement.blurb}
              // Six of them, which is the topic picker's count — past the point
              // where the full size fits on a phone.
              compact
              onPress={() => onPick(movement.id)}
            />
          ))}
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
  list: {
    gap: Spacing.three,
  },
});
