/**
 * Screen 2 — the rating, on its own.
 *
 * `moodBefore` is the number the whole rest of the session is measured
 * against, and it also decides whether the reactivation cue is shown at all,
 * so it gets a screen to itself rather than sharing one with the question
 * above it.
 *
 * The "change that" link is the only backwards move in the session. It is safe
 * here and nowhere else: nothing has started yet, so going back costs the user
 * nothing and un-picks a mis-tap on a screen that advances on touch. It goes to
 * `/category` rather than `/` — the mis-tap it undoes is the answer, and the
 * door in front of that has nothing to change.
 */

import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { MOOD_BEFORE } from '@/content/strings';
import { Spacing } from '@/constants/theme';
import { MoodScale } from '@/session/ui/mood-scale';
import { SessionScreen } from '@/session/ui/session-screen';
import { useSessionFlow } from '@/session/session-context';
import { useSessionGuard } from '@/session/use-session-guard';

export default function MoodBeforeScreen() {
  const router = useRouter();
  const active = useSessionGuard({ requireMood: false });
  const { category, setMoodBefore } = useSessionFlow();

  const [mood, setMood] = useState<number | null>(null);

  if (!active || !category) return null;

  const advance = () => {
    if (mood === null) return;
    setMoodBefore(mood);
    // Always to the cue screen — it decides for itself whether to show
    // anything, so the high-distress skip lives in exactly one place.
    router.replace('/reactivate');
  };

  return (
    <SessionScreen centered>
      <View style={styles.root}>
        <View style={styles.heading}>
          <ThemedText type="title">{MOOD_BEFORE.question}</ThemedText>
          <View style={styles.answer}>
            <ThemedText themeColor="textMuted">{category.label}</ThemedText>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.replace('/category')}
              hitSlop={Spacing.three}>
              <ThemedText type="small" themeColor="textMuted" style={styles.back}>
                {MOOD_BEFORE.back}
              </ThemedText>
            </Pressable>
          </View>
        </View>

        <MoodScale
          value={mood}
          onChange={setMood}
          lowLabel={MOOD_BEFORE.moodLowLabel}
          highLabel={MOOD_BEFORE.moodHighLabel}
        />

        <Button
          title={MOOD_BEFORE.continue}
          disabled={mood === null}
          onPress={advance}
        />
      </View>
    </SessionScreen>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: Spacing.five,
  },
  heading: {
    gap: Spacing.two,
  },
  answer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  back: {
    textDecorationLine: 'underline',
  },
});
