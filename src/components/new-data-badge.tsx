import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * Marks a metric whose source published a new measurement since this device
 * last saw one. See `lib/fresh-data` for what does and doesn't qualify.
 *
 * Brand orange rather than the blue or red used on the bars: those two already
 * mean "progress" and "wrong direction", and freshness is orthogonal to both —
 * a new observation is equally worth noticing when the news is bad.
 */
const LABEL = 'New data since you last looked';

interface NewDataBadgeProps {
  /** `dot` for the compact world tiles, `pill` where there's room to say it. */
  variant: 'dot' | 'pill';
}

export function NewDataBadge({ variant }: NewDataBadgeProps) {
  const theme = useTheme();

  if (variant === 'dot') {
    return (
      <View
        accessible
        accessibilityRole="image"
        accessibilityLabel={LABEL}
        style={[styles.dot, { backgroundColor: theme.brandStrong }]}
      />
    );
  }

  return (
    <View
      accessible
      accessibilityLabel={LABEL}
      style={[styles.pill, { backgroundColor: theme.brandSoft }]}>
      <ThemedText type="eyebrow" style={[styles.pillText, { color: theme.brandStrong }]}>
        New
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  dot: {
    width: 8,
    height: 8,
    borderRadius: Radius.pill,
  },
  pill: {
    paddingHorizontal: Spacing.one,
    paddingVertical: 1,
    borderRadius: Radius.pill,
    alignSelf: 'flex-start',
  },
  pillText: {
    fontSize: 12,
    letterSpacing: 0.8,
  },
});
