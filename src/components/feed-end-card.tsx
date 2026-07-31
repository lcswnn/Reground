import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { signOffFor } from '@/lib/feed-end';
import { formatRelative } from '@/lib/format';

/**
 * The bottom of the day's batch.
 *
 * Three things in a deliberate order: the count, so the end reads as a fact
 * rather than as the list giving up; the sign-off, which is the point of the
 * feature and therefore the biggest thing on it; and the archive, kept quiet
 * and last because it is an escape hatch, not the next step.
 *
 * The archive link is not hidden, and that is on purpose. A bounded feed with
 * no way past it is a blocker, and blockers get uninstalled — the reader who
 * genuinely wants more should be able to have more, having been told plainly
 * that they are already done. What the boundary buys is that continuing is a
 * decision instead of the default.
 */
export function FeedEndCard({
  count,
  isFresh,
  ingestedAt,
}: {
  count: number;
  /** False once the ingest job has been quiet for over a day. */
  isFresh: boolean;
  ingestedAt: string | null;
}) {
  const theme = useTheme();
  const router = useRouter();

  return (
    <View style={styles.root}>
      {/* A rule rather than a card edge. The batch above is a stack of cards,
          and closing it with a fourth one would read as one more thing to
          read — this has to look like the page ending. */}
      <View style={[styles.rule, { backgroundColor: theme.border }]} />

      <ThemedText type="eyebrow" themeColor="textMuted" style={styles.centered}>
        {isFresh ? `That's today's ${count}` : `That's the latest ${count}`}
      </ThemedText>

      <ThemedText type="subtitle" style={styles.centered}>
        {signOffFor()}
      </ThemedText>

      <ThemedText type="small" themeColor="textSecondary" style={styles.centered}>
        {isFresh
          ? 'The next batch lands tomorrow morning.'
          : // Not "tomorrow morning": when the workflow has been down for days
            // there is nothing scheduled to make that true, and a feed whose
            // promises expire is the thing this screen cannot afford to be.
            //
            // A colon rather than a sentence, because `formatRelative` returns
            // three shapes with three capitalisations — "Yesterday", "3 days
            // ago", "Aug 1" — and none of them can be dropped mid-sentence
            // without either a stray capital or a lowercased month.
            ingestedAt
            ? `Last updated: ${formatRelative(ingestedAt)}`
            : 'Nothing new has arrived in a while.'}
      </ThemedText>

      <Pressable
        accessibilityRole="link"
        accessibilityLabel="Browse the archive"
        accessibilityHint="Older stories, going back as far as they go"
        // `navigate`, not `push`. The archive is a tab route now — an unlisted
        // one, but still a sibling of Feed rather than a card on top of it — and
        // pushing would grow the stack on every visit instead of switching to
        // the screen that is already there.
        onPress={() => router.navigate('/archive')}
        hitSlop={8}
        style={({ pressed }) => [styles.archive, pressed && styles.pressed]}>
        <ThemedText type="linkPrimary">Browse the archive →</ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    gap: Spacing.two,
    // Generous above, so the sign-off is separated from the last story rather
    // than stacked onto it — the pause is doing as much work as the sentence.
    paddingTop: Spacing.six,
    paddingBottom: Spacing.four,
    paddingHorizontal: Spacing.four,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  rule: {
    width: 48,
    height: 1,
    borderRadius: Radius.pill,
    marginBottom: Spacing.three,
  },
  centered: {
    textAlign: 'center',
  },
  archive: {
    paddingTop: Spacing.four,
    paddingBottom: Spacing.two,
  },
  pressed: {
    opacity: 0.6,
  },
});
