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
 * nothing and un-picks a mis-tap on a screen that advances on touch. It never
 * goes to `/` — the mis-tap it undoes is an answer, and the door in front of
 * those has nothing to change.
 *
 * Which answer it undoes is the last one given. GROUP A answered twice, and the
 * topic is both the more likely mis-tap (six options, not two) and the cheaper
 * one to correct — sending them back to the first question instead would clear
 * the topic and make them give both answers again to fix one.
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
  const { category, topic, setMoodBefore } = useSessionFlow();

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
            {/* The narrower answer when there is one: echoing "Something that's
                happening" back at someone who then said "The climate" shows
                them the coarser of their two answers for no reason. */}
            <ThemedText themeColor="textMuted">{topic?.label ?? category.label}</ThemedText>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.replace(topic ? '/topic' : '/category')}
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
