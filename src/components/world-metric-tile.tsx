import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { WORLD_CATEGORIES, type WorldMetric } from '@/constants/world-metrics';
import { useTheme } from '@/hooks/use-theme';

const FILL_DURATION = 650;
/** Per-tile offset, so a page lands as a cascade rather than four bars at once. */
const STAGGER = 70;

interface WorldMetricTileProps {
  metric: WorldMetric;
  /** True while this tile's page is the one on screen. */
  active: boolean;
  /** Position within the page, used to stagger the fill. */
  index: number;
}

export function WorldMetricTile({ metric, active, index }: WorldMetricTileProps) {
  const theme = useTheme();
  const fill = useSharedValue(0);

  const accent = metric.isProgress ? theme.positive : theme.textSecondary;
  const track = metric.isProgress ? theme.positiveSoft : theme.backgroundElement;

  useEffect(() => {
    // Bars empty when the page leaves and refill when it returns, so swiping
    // reads as the numbers landing rather than a static grid sliding past.
    fill.value = active
      ? withDelay(
          index * STAGGER,
          withTiming(metric.progress, {
            duration: FILL_DURATION,
            easing: Easing.out(Easing.cubic),
          }),
        )
      : 0;
  }, [active, index, metric.progress, fill]);

  const fillStyle = useAnimatedStyle(() => ({ width: `${fill.value * 100}%` }));

  return (
    <View style={[styles.tile, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <ThemedText type="eyebrow" themeColor="textMuted" numberOfLines={1} style={styles.category}>
        {WORLD_CATEGORIES[metric.category]}
      </ThemedText>

      <ThemedText type="small" themeColor="textSecondary" numberOfLines={2} style={styles.label}>
        {metric.label}
      </ThemedText>

      <ThemedText
        type="subtitle"
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.7}
        style={styles.value}>
        {metric.value}
      </ThemedText>

      <View
        style={[styles.track, { backgroundColor: track }]}
        accessible={false}
        importantForAccessibility="no">
        <Animated.View style={[styles.fill, { backgroundColor: accent }, fillStyle]} />
      </View>

      <ThemedText type="small" numberOfLines={1} style={[styles.delta, { color: accent }]}>
        {metric.delta}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.three,
    gap: Spacing.one,
    minHeight: 150,
  },
  category: {
    fontSize: 10,
    letterSpacing: 0.9,
  },
  label: {
    // Holds two lines of label so tiles in a row stay aligned regardless of
    // whether the name wraps.
    minHeight: 40,
  },
  value: {
    marginTop: 'auto',
  },
  track: {
    height: 6,
    borderRadius: Radius.pill,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: Radius.pill,
  },
  delta: {
    fontSize: 12,
  },
});
