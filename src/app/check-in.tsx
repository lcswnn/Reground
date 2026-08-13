/**
 * The check-in after the 5-4-3-2-1.
 *
 * The grounding sequence is the last thing the app does for anyone who picks it
 * off `/one-more`, and it used to end by dropping them onto the closing screen
 * mid-count-down — the exercise finished and nobody asked how it went. One
 * question, two answers, no scale.
 *
 * Both answers lead to the same place. This is not a gate: "not really" does
 * not unlock a fourth thing to try, because there isn't one and pretending
 * otherwise would keep someone here who should be putting the phone down. What
 * it changes is what the screen says back — and, for the answer that warrants
 * it, whether the pointer to a real person is on screen.
 *
 * Shown for the 5-4-3-2-1 only. It is the one option on that list with anything
 * after it, which is also what `routeIntoClose` keys off to send the closing
 * screen's back button here rather than at the list.
 */

import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { CHECK_IN, SUPPORT_RESOURCE } from '@/content/strings';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { SessionScreen } from '@/session/ui/session-screen';
import { useSessionBack } from '@/session/use-session-back';
import { useSessionGuard } from '@/session/use-session-guard';

type Answer = 'helped' | 'did-not';

export default function CheckInScreen() {
  const router = useRouter();
  const theme = useTheme();
  const active = useSessionGuard();
  const back = useSessionBack('/check-in');

  /**
   * Local, not session state. Nothing downstream branches on it and nothing is
   * recorded — the answer's whole job is the line underneath it.
   */
  const [answer, setAnswer] = useState<Answer | null>(null);

  if (!active) return null;

  return (
    <SessionScreen centered onBack={back}>
      <View style={styles.root}>
        <ThemedText type="title">{CHECK_IN.question}</ThemedText>

        <View style={styles.answers}>
          <View style={styles.answer}>
            <Button
              title={CHECK_IN.helped}
              variant={answer === 'helped' ? 'primary' : 'secondary'}
              onPress={() => setAnswer('helped')}
            />
          </View>
          <View style={styles.answer}>
            <Button
              title={CHECK_IN.didNot}
              variant={answer === 'did-not' ? 'primary' : 'secondary'}
              onPress={() => setAnswer('did-not')}
            />
          </View>
        </View>

        {/* Fixed slot, as on the rating screens: answering must not shove the
            buttons out from under the thumb that just pressed one. */}
        <View style={styles.response}>
          {answer ? (
            <ThemedText themeColor="textSecondary">
              {answer === 'helped' ? CHECK_IN.helpedResponse : CHECK_IN.didNotResponse}
            </ThemedText>
          ) : null}

          {/* Two things in a row have now failed to shift it, which is a better
              reason to point at a person than any single number was. */}
          {answer === 'did-not' ? (
            <View style={[styles.support, { borderColor: theme.border }]}>
              <ThemedText type="small">{SUPPORT_RESOURCE.line}</ThemedText>
              <ThemedText type="small" themeColor="textMuted">
                {SUPPORT_RESOURCE.resource}
              </ThemedText>
            </View>
          ) : null}
        </View>

        <Button
          title={CHECK_IN.done}
          disabled={answer === null}
          onPress={() => router.replace('/close')}
        />
      </View>
    </SessionScreen>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: Spacing.four,
  },
  answers: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  answer: {
    flex: 1,
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
