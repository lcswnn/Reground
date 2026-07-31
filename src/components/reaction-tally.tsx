import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  companyLabel,
  hasEnoughForPercent,
  reactionPercents,
  totalVotes,
  type ReactionCounts,
} from '@/lib/reaction-tally';
import { REACTIONS, type ReactionId } from '@/lib/streak';

/**
 * How everyone else answered, revealed once the reader has answered themselves.
 *
 * Deliberately hidden until then, and that is not only a reveal for its own
 * sake: showing the split first would make this a poll to agree with rather than
 * a question to answer, and the numbers would then be measuring the anchor
 * rather than the readers.
 *
 * Two shapes depending on the sample — see `reaction-tally.ts` for why a
 * percentage off four people is a number this app should not print.
 */
export function ReactionTally({
  counts,
  selected,
}: {
  counts: ReactionCounts;
  /** The reader's own answer, so their row can be marked as theirs. */
  selected: ReactionId | null;
}) {
  const theme = useTheme();

  const total = totalVotes(counts);
  if (total === 0) return null;

  // Fades in rather than appearing: it lands a moment after a tap, and a block
  // of text materialising under the finger reads as a mis-tap.
  if (!hasEnoughForPercent(counts)) {
    return (
      <Animated.View entering={FadeIn.duration(220)} style={styles.root}>
        <ThemedText type="small" themeColor="textMuted" style={styles.company}>
          {companyLabel(total)}
        </ThemedText>
      </Animated.View>
    );
  }

  const percents = reactionPercents(counts);

  return (
    <Animated.View entering={FadeIn.duration(220)} style={styles.root}>
      {REACTIONS.map(({ id, label }) => {
        const percent = percents[id];
        const isMine = selected === id;

        return (
          <View
            key={id}
            accessible
            accessibilityLabel={`${percent} percent said ${label}${isMine ? ', including you' : ''}`}
            style={styles.row}>
            <View style={styles.bar}>
              {/* The track carries the label and the fill sits behind it, so a
                  long reaction name never has to compete with the bar for
                  width — at 0% the text is still fully readable. */}
              <View style={[styles.track, { backgroundColor: theme.backgroundElement }]}>
                <View
                  style={[
                    styles.fill,
                    {
                      width: `${percent}%`,
                      backgroundColor: isMine ? theme.brandSoft : theme.backgroundSelected,
                    },
                  ]}
                />
                <ThemedText
                  type="small"
                  themeColor={isMine ? 'text' : 'textSecondary'}
                  numberOfLines={1}
                  style={styles.rowLabel}>
                  {label}
                </ThemedText>
              </View>
            </View>

            <ThemedText
              type="small"
              style={[styles.percent, { color: isMine ? theme.brandStrong : theme.textMuted }]}>
              {percent}%
            </ThemedText>
          </View>
        );
      })}

      <ThemedText type="small" themeColor="textMuted" style={styles.company}>
        {total === 1 ? '1 reader today' : `${total} readers today`}
      </ThemedText>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: Spacing.one,
    marginTop: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  bar: {
    flex: 1,
  },
  track: {
    height: 30,
    borderRadius: Radius.sm,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  // Pinned left and stretched vertically, with the width left to the percentage.
  // Not `absoluteFillObject` spread with `right: undefined` — that reads as a
  // trick, and this is just the four sides written out.
  fill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: Radius.sm,
  },
  rowLabel: {
    paddingHorizontal: Spacing.two,
  },
  // Fixed width so both percentages share a right edge rather than jittering
  // as the numbers change width between 9% and 100%.
  percent: {
    width: 44,
    textAlign: 'right',
  },
  company: {
    textAlign: 'center',
    marginTop: Spacing.half,
  },
});
