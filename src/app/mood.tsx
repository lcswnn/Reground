/**
 * Screen 3 — the rating, on its own.
 *
 * `moodBefore` is the number the whole rest of the session is measured
 * against, and it also decides whether the reactivation cue is shown at all,
 * so it gets a screen to itself rather than sharing one with the question
 * above it.
 *
 * The answer given a screen ago is echoed above the scale. It is a label now
 * rather than a control: this used to be the one screen in the session that
 * carried a way back — a "change that" link next to the answer — and back is
 * now a button in the same corner of every screen, so the line's only job is
 * saying which question the rating is about.
 *
 * Which answer is shown is the last one given. GROUP A answered twice, and the
 * narrower answer is the useful one — echoing "Something that's happening" at
 * someone who then said "The climate" tells them nothing they didn't just say.
 */

import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { MOOD_BEFORE } from '@/content/strings';
import { Spacing } from '@/constants/theme';
import { MoodScale } from '@/session/ui/mood-scale';
import { SessionScreen } from '@/session/ui/session-screen';
import { useSessionBack } from '@/session/use-session-back';
import { useSessionFlow } from '@/session/session-context';
import { useSessionGuard } from '@/session/use-session-guard';

export default function MoodBeforeScreen() {
  const router = useRouter();
  const active = useSessionGuard({ requireMood: false });
  const { category, topic, setMoodBefore } = useSessionFlow();
  const back = useSessionBack('/mood');

  const [mood, setMood] = useState<number | null>(null);

  if (!active || !category) return null;

  const advance = () => {
    if (mood === null) return;
    setMoodBefore(mood);
    // Straight to the cue, which decides for itself whether to show anything —
    // this number is one of the two things it decides on. The breath is behind
    // us now: it runs first, before any of these questions. See
    // `breathe-intro.tsx`.
    router.replace('/reactivate');
  };

  return (
    <SessionScreen centered onBack={back}>
      <View style={styles.root}>
        <View style={styles.heading}>
          <ThemedText type="title">{MOOD_BEFORE.question}</ThemedText>
          <ThemedText themeColor="textMuted">
            {MOOD_BEFORE.answerPrefix} {topic?.label ?? category.label}
          </ThemedText>
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
    gap: Spacing.four,
  },
  heading: {
    gap: Spacing.two,
  },
});
