/**
 * Screen 2 — the optional reactivation cue.
 *
 * Bringing the image back is what gives the puzzle something to compete with,
 * so it makes the next screen work better. It is also the one moment in the
 * session that deliberately hurts, which is why it is skippable and why it is
 * skipped outright for anyone already at the top of the scale.
 *
 * There is no text input here and there never should be. Putting the thing
 * into words is a much heavier ask than holding it in mind, and it is not what
 * the mechanism needs.
 */

import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { REACTIVATION } from '@/content/strings';
import { Spacing } from '@/constants/theme';
import { SessionScreen } from '@/session/ui/session-screen';
import { skipsReactivation } from '@/session/routing';
import { useSessionFlow } from '@/session/session-context';

export default function ReactivationScreen() {
  const router = useRouter();
  const { moodBefore, setReactivationSkipped } = useSessionFlow();

  const autoSkip = moodBefore !== null && skipsReactivation(moodBefore);

  useEffect(() => {
    if (moodBefore === null) {
      router.replace('/');
      return;
    }
    if (autoSkip) {
      // Recorded as skipped either way: what matters downstream is whether the
      // image was reactivated, not whose decision it was.
      setReactivationSkipped(true);
      router.replace('/breathe-intro');
    }
  }, [autoSkip, moodBefore, router, setReactivationSkipped]);

  if (moodBefore === null || autoSkip) return null;

  const advance = (skipped: boolean) => {
    setReactivationSkipped(skipped);
    router.replace('/breathe-intro');
  };

  return (
    <SessionScreen centered>
      <View style={styles.root}>
        <ThemedText type="subtitle">{REACTIVATION.body}</ThemedText>

        <View style={styles.actions}>
          <Button title={REACTIVATION.ready} onPress={() => advance(false)} />
          <Button
            title={REACTIVATION.skip}
            variant="ghost"
            onPress={() => advance(true)}
          />
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
    gap: Spacing.two,
  },
});
