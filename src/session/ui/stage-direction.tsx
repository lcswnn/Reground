/**
 * The quiet italic line that opens and closes the app.
 *
 * Two screens use it and they are the two ends of the same session: "Time to
 * reground." on the way in, "You may now close the app." on the way out. Both
 * are the app talking about itself rather than to the user — as close to a stage
 * direction as type gets — and neither is a thing to be done. Small, muted and
 * leaning, so it reads as an aside and gets out of the way.
 *
 * Extracted the moment the second one wanted it. The styling below is fiddlier
 * than it looks (see the italic note), and two copies of it would have agreed on
 * the day they were written and nowhere after that — these two lines have to
 * stay the same weight as each other or the session stops being bookended.
 */

import { Platform, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';

export function StageDirection({ children }: { children: string }) {
  return (
    <View style={styles.root}>
      <ThemedText type="small" themeColor="textMuted" style={styles.line}>
        {children}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
  },
  line: {
    textAlign: 'center',
    // Playpen Sans ships no italic cut (the family is a weight axis only), so
    // this is honoured on Android and web, which synthesise an oblique, and
    // quietly ignored on iOS, which does not. The skew below is what makes it
    // actually lean there — a real slant on the real face, rather than dropping
    // the line to a system italic that would look like it came from another
    // app.
    fontStyle: 'italic',
    ...Platform.select({ ios: { transform: [{ skewX: '-9deg' }] } }),
  },
});
