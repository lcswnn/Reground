/**
 * Screen 1 — the breath. About half a minute of cyclic sighing, and now the
 * first thing the session does. See `breathe-intro.tsx` for why it runs before
 * a single question is asked.
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

export default function BreatheScreen() {
  const router = useRouter();
  /**
   * No session guard, for the reason given in `breathe-intro.tsx`: this step
   * runs before there is any session to be missing. The screens after it guard
   * for themselves, and the first of them is where a session actually begins.
   */
  const back = useSessionBack('/breathe');
  const theme = useTheme();

  // Out of the breath and into the questions — what the trouble is, and how bad
  // it is. Both are asked of somebody who has just breathed rather than of
  // somebody who has just opened the app.
  const advance = useCallback(() => router.replace('/category'), [router]);

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
  // The same outline the ghost buttons wear — the button corner, hairline,
  // `theme.border` —
  // at this screen's scale rather than theirs. Bare text read as a caption; the
  // edge is what says it can be pressed. It stays small and muted on purpose:
  // the point of the outline is to be findable when looked for, not to pull the
  // eye off the breath.
  skip: {
    alignSelf: 'center',
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.four,
    borderWidth: 1,
    borderRadius: Radius.button,
  },
  skipPressed: {
    opacity: 0.75,
  },
});
