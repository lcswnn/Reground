/**
 * Screen 8 — the end.
 *
 * What is deliberately absent is most of the design: no "come back later", no
 * timer, no streak, no rating of the app, no share sheet, no next step. The
 * session told the user to put the phone down and then asking them for
 * anything would make that a lie.
 *
 * The one button clears the session state — so whatever was entered is gone
 * before the app is opened again — and then goes forward, to `closed.tsx`. It
 * used to go back to Screen 1, which quietly made the whole thing a loop: the
 * screen that says "nothing here needs you again today" handed the user the
 * opening question and waited.
 */

import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { CLOSE, pickUnwindIdea } from '@/content/strings';
import { Fonts, Spacing } from '@/constants/theme';
import { SessionScreen } from '@/session/ui/session-screen';
import { useSessionBack } from '@/session/use-session-back';
import { useSessionFlow } from '@/session/session-context';

export default function CloseScreen() {
  const router = useRouter();
  const { reset } = useSessionFlow();
  // Three routes lead here and the state says which — see `routeIntoClose`.
  const back = useSessionBack('/close');
  // Lazy initial state: one idea for the life of the screen. Calling this in
  // the body would hand the user a different suggestion on every re-render.
  const [idea] = useState(pickUnwindIdea);

  const done = () => {
    reset();
    router.replace('/closed');
  };

  return (
    <SessionScreen centered onBack={back}>
      <View style={styles.root}>
        <ThemedText type="title">{CLOSE.title}</ThemedText>
        <ThemedText type="subtitle" themeColor="textSecondary">
          {CLOSE.body}
        </ThemedText>
        {/* Muted, so it stays a suggestion rather than a fourth instruction.
            Body copy, like everything else written to be read — it used to be
            set two points over the body tier on the grounds that it is the line
            the user leaves with, which is what the muting and the bold label
            already say. The label is the only bold thing here; a plain `Text`
            inherits the size and colour around it, which a nested `ThemedText`
            would reset. */}
        <ThemedText
          themeColor="textMuted"
          accessibilityLabel={CLOSE.idea(idea)}>
          <Text style={styles.ideaLabel}>{CLOSE.ideaLabel}</Text> {idea}.
        </ThemedText>

        <View style={styles.action}>
          <Button title={CLOSE.done} variant="ghost" onPress={done} />
        </View>
      </View>
    </SessionScreen>
  );
}

const styles = StyleSheet.create({
  // A heading stack — the title, the line under it and the parting
  // suggestion are one block of reading, so they take the gap the app gives
  // the lines of a block. The pause before the button does the separating.
  root: {
    gap: Spacing.two,
  },
  ideaLabel: {
    fontFamily: Fonts.semibold,
  },
  // The long pause, the same one `/breathe-intro` and `/reactivate` put
  // between what a screen says and what it asks.
  action: {
    marginTop: Spacing.six,
  },
});
