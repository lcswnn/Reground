/**
 * Screen 3 — what's about to happen, and a Start button.
 *
 * Shares its number with `breathe.tsx`: it is the front half of the same step,
 * not a step of its own. The breath now runs directly after the rating — the
 * reactivation cue that used to sit in between has moved to the far side of it,
 * next to the game it feeds. See `reactivate.tsx`.
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
 *
 * What the minute holds — the shape of the breath, how many rounds, what on
 * screen is pacing it — is behind a tap rather than on the screen. It is worth
 * saying and it is not worth making anyone read: someone who already knows the
 * technique, or who just wants to start, gets a title and a button.
 */

import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useRouter } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { BREATH_CYCLES } from '@/config/session';
import { BREATHE_INTRO } from '@/content/strings';
import { Spacing } from '@/constants/theme';
import { Disclosure, DISCLOSURE_LAYOUT } from '@/session/ui/disclosure';
import { SessionScreen } from '@/session/ui/session-screen';
import { useSessionBack } from '@/session/use-session-back';
import { useSessionGuard } from '@/session/use-session-guard';

export default function BreatheIntroScreen() {
  const router = useRouter();
  const active = useSessionGuard();
  const back = useSessionBack('/breathe-intro');

  if (!active) return null;

  return (
    <SessionScreen centered onBack={back}>
      <View style={styles.root}>
        {/* Grouped so the control sits with the line it explains rather than
            floating halfway to the button — the big gap on this screen belongs
            between the reading and the doing, and there is only one of it. */}
        <View style={styles.intro}>
          <ThemedText type="subtitle">{BREATHE_INTRO.body}</ThemedText>

          <Disclosure label={BREATHE_INTRO.explainLabel}>
            <ThemedText themeColor="textSecondary">{BREATHE_INTRO.method}</ThemedText>
            <ThemedText themeColor="textSecondary">
              {BREATHE_INTRO.shape(BREATH_CYCLES)}
            </ThemedText>
          </Disclosure>
        </View>

        {/* Slides rather than jumping when the explanation opens above it. A
            layout animation only moves the view it is on, so this has to be
            here and not inside the disclosure. */}
        <Animated.View layout={DISCLOSURE_LAYOUT} style={styles.actions}>
          <Button
            title={BREATHE_INTRO.start}
            onPress={() => router.replace('/breathe')}
          />
          <ThemedText type="small" themeColor="textMuted" style={styles.hint}>
            {BREATHE_INTRO.hint}
          </ThemedText>
        </Animated.View>
      </View>
    </SessionScreen>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: Spacing.six,
  },
  intro: {
    gap: Spacing.two,
  },
  actions: {
    gap: Spacing.three,
  },
  hint: {
    textAlign: 'center',
  },
});
