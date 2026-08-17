/**
 * Screen 3 — the breath. About a minute of cyclic sighing.
 *
 * Arrived at from `breathe-intro.tsx`, so the animation only ever starts on a
 * tap the user has just made. Nothing here waits for a second confirmation.
 *
 * The skip is deliberately the quietest thing on the screen: it has to exist,
 * because being held on a screen you want to leave is its own kind of stress,
 * but it is not what anyone should be looking at.
 */

import { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { PressableScale } from '@/components/ui/pressable-scale';
import { BREATHING_COPY } from '@/content/strings';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { BreathingGuide } from '@/session/breathing/breathing-guide';
import { SessionScreen } from '@/session/ui/session-screen';
import { useSessionBack } from '@/session/use-session-back';
import { useSessionGuard } from '@/session/use-session-guard';

export default function BreatheScreen() {
  const router = useRouter();
  const active = useSessionGuard();
  const back = useSessionBack('/breathe');
  const theme = useTheme();

  // To the cue rather than straight to the picker: it decides for itself
  // whether to show anything, so the high-distress skip lives in one place.
  const advance = useCallback(() => router.replace('/reactivate'), [router]);

  if (!active) return null;

  return (
    <SessionScreen centered onBack={back}>
      <View style={styles.root}>
        <BreathingGuide onDone={advance} />

        {/* `text` depth, not `button` — it wears a pill's outline but it is a
            small muted one, and it takes the travel the other quiet controls
            take rather than the one the real buttons take. */}
        <PressableScale
          accessibilityRole="button"
          onPress={advance}
          depth="text"
          style={({ pressed }) => [
            styles.skip,
            { borderColor: theme.border },
            pressed && styles.skipPressed,
          ]}
          hitSlop={Spacing.three}>
          <ThemedText type="small" themeColor="textMuted">
            {BREATHING_COPY.skip}
          </ThemedText>
        </PressableScale>
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
  // The same outline the ghost buttons wear — pill, hairline, `theme.border` —
  // at this screen's scale rather than theirs. Bare text read as a caption; the
  // edge is what says it can be pressed. It stays small and muted on purpose:
  // the point of the outline is to be findable when looked for, not to pull the
  // eye off the breath.
  skip: {
    alignSelf: 'center',
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.four,
    borderWidth: 1,
    borderRadius: Radius.pill,
  },
  skipPressed: {
    opacity: 0.75,
  },
});
