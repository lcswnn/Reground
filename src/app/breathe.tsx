/**
 * Screen 3 — the breath. About a minute of cyclic sighing.
 *
 * The skip is deliberately the quietest thing on the screen: it has to exist,
 * because being held on a screen you want to leave is its own kind of stress,
 * but it is not what anyone should be looking at.
 */

import { useCallback } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { BREATHING_COPY } from '@/content/strings';
import { Spacing } from '@/constants/theme';
import { BreathingGuide } from '@/session/breathing/breathing-guide';
import { SessionScreen } from '@/session/ui/session-screen';
import { useSessionGuard } from '@/session/use-session-guard';

export default function BreatheScreen() {
  const router = useRouter();
  const active = useSessionGuard();

  const advance = useCallback(() => router.replace('/puzzle'), [router]);

  if (!active) return null;

  return (
    <SessionScreen centered>
      <View style={styles.root}>
        <BreathingGuide onDone={advance} />

        <Pressable
          accessibilityRole="button"
          onPress={advance}
          style={styles.skip}
          hitSlop={Spacing.three}>
          <ThemedText type="small" themeColor="textMuted">
            {BREATHING_COPY.skip}
          </ThemedText>
        </Pressable>
      </View>
    </SessionScreen>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.six,
  },
  skip: {
    padding: Spacing.two,
  },
});
