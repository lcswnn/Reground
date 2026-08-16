/**
 * The soundscapes that have audio behind them.
 *
 * Drawn from `playableSoundscapes()` rather than from the catalog, which is the
 * one thing that makes this list different from the somatic one: an entry here
 * needs a file in `assets/soundscapes/`, and until that file exists the
 * soundscape is not something the app can offer. Listing it anyway would be a
 * card that plays silence.
 *
 * Deliberately not drawn as locked cards either. That pattern belongs to the
 * game picker's paid shelf, where the card is telling you what money would get
 * you — see the note in `not-yet.tsx`, which makes the same argument for the
 * same reason. Nothing is being withheld here; the audio simply is not in the
 * build yet, and a list where three of five entries are greyed out reads as a
 * broken app rather than a young one.
 *
 * `/one-more` checks `hasSoundscapes()` before it renders any of this, so the
 * empty case never reaches the screen: with no files at all the option falls
 * back to `NotYet`, which says the honest thing.
 */

import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { GROUNDING_FADE } from '@/config/session';
import type { SoundscapeId } from '@/content/soundscape';
import { SOUNDSCAPE_COPY } from '@/content/strings';
import { Spacing } from '@/constants/theme';
import { playableSoundscapes } from '@/session/soundscape/audio';
import { OptionCard } from '@/session/ui/option-card';

export function SoundscapePicker({ onPick }: { onPick: (id: SoundscapeId) => void }) {
  const soundscapes = playableSoundscapes();

  return (
    <Animated.View
      entering={FadeIn.duration(GROUNDING_FADE.inMs)}
      style={styles.root}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        <View style={styles.heading}>
          <ThemedText type="subtitle">{SOUNDSCAPE_COPY.title}</ThemedText>
          <ThemedText type="small" themeColor="textMuted">
            {SOUNDSCAPE_COPY.lead}
          </ThemedText>
        </View>

        <View style={styles.list}>
          {soundscapes.map((soundscape) => (
            <OptionCard
              key={soundscape.id}
              label={soundscape.title}
              detail={soundscape.blurb}
              // Compact for the same reason every list at this end of the
              // session is: five at the full size do not fit on a phone.
              compact
              onPress={() => onPick(soundscape.id)}
            />
          ))}
        </View>

        <ThemedText type="small" themeColor="textMuted" style={styles.hint}>
          {SOUNDSCAPE_COPY.hint}
        </ThemedText>
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
    paddingBottom: Spacing.four,
  },
  heading: {
    gap: Spacing.two,
  },
  list: {
    gap: Spacing.three,
  },
  hint: {
    textAlign: 'center',
  },
});
