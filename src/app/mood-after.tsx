/**
 * Screen 7 — the second rating.
 *
 * It used to be the last branch in the session as well: an improved rating went
 * straight to the door and everything else was routed into an aftercare step.
 * It no longer routes anywhere but `/one-more`, which everyone now sees. What
 * the rating still decides is what this screen says back:
 *
 *  - Dropped by `MEANINGFUL_MOOD_DROP` or more: say so once, plainly.
 *  - Didn't drop: say that plainly too, rather than moving on as if it had.
 *  - Still at or above `HIGH_DISTRESS_MOOD`: a pointer to real support, shown
 *    right here rather than on the closing screen — this is where the number
 *    that triggered it was just entered, and the closing screen has one job.
 *
 * The two are independent: someone can go from 10 to 8, which is a real
 * improvement and still a bad place to be.
 */

import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeIn, ReduceMotion } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { MOOD_AFTER, SUPPORT_RESOURCE } from '@/content/strings';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { MoodScale } from '@/session/ui/mood-scale';
import { SessionScreen } from '@/session/ui/session-screen';
import { moodOutcome } from '@/session/routing';
import { useSessionBack } from '@/session/use-session-back';
import { useSessionFlow } from '@/session/session-context';
import { useSessionGuard } from '@/session/use-session-guard';

export default function MoodAfterScreen() {
  const router = useRouter();
  const active = useSessionGuard();
  const theme = useTheme();
  const { moodBefore, setMoodAfter } = useSessionFlow();
  const back = useSessionBack('/mood-after');

  const [mood, setMood] = useState<number | null>(null);

  if (!active || moodBefore === null) return null;

  const outcome = mood === null ? null : moodOutcome(moodBefore, mood);

  const advance = () => {
    if (mood === null) return;
    setMoodAfter(mood);
    // One destination whatever the number did. Feeling better is not a reason
    // to be shown the door faster — the offer of one last thing is the same
    // offer either way, and it is refusable on its own screen.
    router.replace('/one-more');
  };

  return (
    <SessionScreen centered onBack={back}>
      <View style={styles.root}>
        <ThemedText type="title">{MOOD_AFTER.question}</ThemedText>

        <MoodScale
          value={mood}
          onChange={setMood}
          lowLabel={MOOD_AFTER.moodLowLabel}
          highLabel={MOOD_AFTER.moodHighLabel}
        />

        {/* Fixed slot so selecting a number doesn't shove the scale up the
            screen under the user's thumb. */}
        <View style={styles.response}>
          {/* Faded up rather than cut in, and keyed on which reply it is so a
              changed rating re-runs the fade — same arrangement, and same
              reasons, as `check-in.tsx`. */}
          {outcome ? (
            <Animated.View
              key={outcome.improved ? 'improved' : 'unchanged'}
              entering={FadeIn.duration(220).reduceMotion(ReduceMotion.System)}>
              <ThemedText themeColor="textSecondary">
                {outcome.improved ? MOOD_AFTER.improved : MOOD_AFTER.unchanged}
              </ThemedText>
            </Animated.View>
          ) : null}

          {outcome?.stillHighDistress ? (
            <Animated.View
              entering={FadeIn.duration(220).reduceMotion(ReduceMotion.System)}
              style={[styles.support, { borderColor: theme.border }]}>
              <ThemedText type="small">{SUPPORT_RESOURCE.line}</ThemedText>
              <ThemedText type="small" themeColor="textMuted">
                {SUPPORT_RESOURCE.resource}
              </ThemedText>
            </Animated.View>
          ) : null}
        </View>

        <Button title={MOOD_AFTER.continue} disabled={mood === null} onPress={advance} />
      </View>
    </SessionScreen>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: Spacing.four,
  },
  response: {
    minHeight: 120,
    gap: Spacing.three,
  },
  support: {
    padding: Spacing.three,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth * 2,
    gap: Spacing.two,
  },
});
