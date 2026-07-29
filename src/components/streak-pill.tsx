import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * The streak counter, as a pill beside the day's card.
 *
 * Two states, and the difference between them is the whole point. With a streak
 * running it is a number in the brand colour; with none it is a quiet invitation
 * rather than a zero. "0 days" is a scoreboard telling somebody they have
 * nothing, which is not what gets them back tomorrow.
 */
export function StreakPill({ streak, longest }: { streak: number; longest: number }) {
  const theme = useTheme();

  if (streak === 0) {
    return (
      <View style={[styles.pill, { backgroundColor: theme.backgroundElement }]}>
        <ThemedText type="small" themeColor="textMuted" style={styles.label}>
          {/* A previous best is the one honest thing to say to somebody who has
              lapsed: it was real, and it is the number to beat. */}
          {longest > 1 ? `Best: ${longest} days` : 'Start a streak'}
        </ThemedText>
      </View>
    );
  }

  return (
    <View
      style={[styles.pill, { backgroundColor: theme.brandSoft }]}
      accessible
      accessibilityLabel={`${streak} day streak${longest > streak ? `, best ${longest}` : ''}`}>
      <ThemedText type="small" style={[styles.count, { color: theme.brandStrong }]}>
        {streak}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary" style={styles.label}>
        {streak === 1 ? 'day' : 'days'}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: Radius.pill,
  },
  count: {
    fontSize: 19,
  },
  label: {
    fontSize: 15,
  },
});
