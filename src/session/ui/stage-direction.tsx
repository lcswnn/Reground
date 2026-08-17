/**
 * The quiet line that opens and closes the app.
 *
 * Two screens use it and they are the two ends of the same session: "Time to
 * reground." on the way in, "You may now close the app." on the way out. Both
 * are the app talking about itself rather than to the user — as close to a stage
 * direction as type gets — and neither is a thing to be done. Muted, so it reads
 * as an aside and gets out of the way — but at the body tier rather than the
 * small one: each is the only line on its screen, and the small tier left them
 * looking like a footnote to a page that wasn't there.
 *
 * Extracted the moment the second one wanted it. Two copies of it would have
 * agreed on the day they were written and nowhere after that — these two
 * lines have to stay the same weight as each other or the session stops being
 * bookended.
 */

import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';

export function StageDirection({ children }: { children: string }) {
  return (
    <View style={styles.root}>
      <ThemedText type="default" themeColor="textMuted" style={styles.line}>
        {children}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    // `SessionScreen`'s chrome row (the appearance switch, always present even
    // on these two screens' no-back-button state) takes layout space above
    // `centered`'s content, so the true midpoint of that content sits half a
    // chrome-row below the screen's actual centre. Pulled back up by roughly
    // half of it — chrome row plus its margin — so the line lands on centre
    // rather than visibly under it.
    marginTop: -Spacing.four,
  },
  line: {
    textAlign: 'center',
  },
});
