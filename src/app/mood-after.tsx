/**
 * Screen 7 — the second rating, and the last branch in the session.
 *
 * Three things are decided here:
 *  - Dropped by `MEANINGFUL_MOOD_DROP` or more: say so once, plainly, and end.
 *  - Didn't drop: exactly one more thing is offered, chosen for the user
 *    rather than presented as a menu. See `aftercareKind`.
 *  - Still at or above `HIGH_DISTRESS_MOOD`: a pointer to real support, shown
 *    right here rather than on the closing screen — this is where the number
 *    that triggered it was just entered, and the closing screen has one job.
 *
 * The two branches are independent: someone can go from 10 to 8, which is a
 * real improvement and still a bad place to be.
 */

import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

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
    if (mood === null || outcome === null) return;
    setMoodAfter(mood);
    router.replace(outcome.improved ? '/close' : '/aftercare');
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
          {outcome ? (
            <ThemedText themeColor="textSecondary">
              {outcome.improved ? MOOD_AFTER.improved : MOOD_AFTER.unchanged}
            </ThemedText>
          ) : null}

          {outcome?.stillHighDistress ? (
            <View style={[styles.support, { borderColor: theme.border }]}>
              <ThemedText type="small">{SUPPORT_RESOURCE.line}</ThemedText>
              <ThemedText type="small" themeColor="textMuted">
                {SUPPORT_RESOURCE.resource}
              </ThemedText>
            </View>
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
    gap: Spacing.one,
  },
});
