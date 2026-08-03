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

import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { CLOSE } from '@/content/strings';
import { Spacing } from '@/constants/theme';
import { SessionScreen } from '@/session/ui/session-screen';
import { useSessionFlow } from '@/session/session-context';

export default function CloseScreen() {
  const router = useRouter();
  const { reset } = useSessionFlow();

  const done = () => {
    reset();
    router.replace('/closed');
  };

  return (
    <SessionScreen centered>
      <View style={styles.root}>
        <ThemedText type="title">{CLOSE.title}</ThemedText>
        <ThemedText type="subtitle" themeColor="textSecondary">
          {CLOSE.body}
        </ThemedText>

        <View style={styles.action}>
          <Button title={CLOSE.done} variant="ghost" onPress={done} />
        </View>
      </View>
    </SessionScreen>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: Spacing.three,
  },
  action: {
    marginTop: Spacing.five,
  },
});
