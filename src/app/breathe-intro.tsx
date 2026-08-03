/**
 * Screen 3 — what's about to happen, and a Start button.
 *
 * Shares its number with `breathe.tsx` the way `reactivate.tsx` shares one with
 * `mood.tsx`: it is the front half of the same step, not a step of its own.
 *
 * It exists because the breath is the first thing in the session that runs on
 * its own clock. Every screen before it waits for a tap; this one would start
 * animating the moment it faded in, and a user who arrived mid-inhale spends
 * the first cycle working out what they are meant to be copying. The
 * `leadInMs` hold inside `BreathingGuide` softens that; a screen that does not
 * begin until it is told removes it.
 *
 * No skip here. Skipping is offered on the breath itself, where the user has
 * seen what they would be skipping — an out on the screen before it is just a
 * second decision asked of someone who has already made enough of them.
 */

import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { BREATHE_INTRO } from '@/content/strings';
import { Spacing } from '@/constants/theme';
import { SessionScreen } from '@/session/ui/session-screen';
import { useSessionGuard } from '@/session/use-session-guard';

export default function BreatheIntroScreen() {
  const router = useRouter();
  const active = useSessionGuard();

  if (!active) return null;

  return (
    <SessionScreen centered>
      <View style={styles.root}>
        <ThemedText type="subtitle">{BREATHE_INTRO.body}</ThemedText>

        <View style={styles.actions}>
          <Button
            title={BREATHE_INTRO.start}
            onPress={() => router.replace('/breathe')}
          />
          <ThemedText type="small" themeColor="textMuted" style={styles.hint}>
            {BREATHE_INTRO.hint}
          </ThemedText>
        </View>
      </View>
    </SessionScreen>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: Spacing.six,
  },
  actions: {
    gap: Spacing.three,
  },
  hint: {
    textAlign: 'center',
  },
});
