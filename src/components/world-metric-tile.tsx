import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { barFill, formatMetricValue, isRegressing, type HumanityMetric } from '@/api/humanity';
import { NewDataBadge } from '@/components/new-data-badge';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { categoryLabel } from '@/constants/world-metrics';
import { useTheme } from '@/hooks/use-theme';
import { markMetricSeen } from '@/lib/fresh-data';

const FILL_DURATION = 650;
/** Per-tile offset, so a page lands as a cascade rather than six bars at once. */
const STAGGER = 70;


interface WorldMetricTileProps {
  metric: HumanityMetric;
  /** True while this tile's page is the one on screen. */
  active: boolean;
  /** Position within the page, used to stagger the fill. */
  index: number;
  /** Source published a new measurement since this device last saw one. */
  isNew?: boolean;
}

export function WorldMetricTile({ metric, active, index, isNew = false }: WorldMetricTileProps) {
  const theme = useTheme();
  const fill = useSharedValue(0);

  // A negative normalized value means the indicator has regressed past its own
  // baseline — not "no progress", but worse than where we started. Blue is "how
  // far along"; red is the wrong direction.
  const regressing = isRegressing(metric);
  const accent = regressing ? theme.decline : theme.info;
  const track = regressing ? theme.declineSoft : theme.infoSoft;

  const projected = barFill(metric.normalized, regressing);
  const observed = barFill(metric.normalizedObserved, regressing);

  // Solid out to what was actually measured, dotted across the gap the nowcast
  // invented. Ordered rather than assumed: a regressing metric projects *below*
  // its last observation, so the dotted span runs the other way.
  const solidEnd = Math.min(observed, projected);
  const dottedEnd = Math.max(observed, projected);

  useEffect(() => {
    // Bars empty when the page leaves and refill when it returns, so swiping
    // reads as the numbers landing rather than a static grid sliding past.
    fill.value = active
      ? withDelay(
          index * STAGGER,
          withTiming(1, { duration: FILL_DURATION, easing: Easing.out(Easing.cubic) }),
        )
      : 0;
  }, [active, index, fill]);

  // `active` already means "this tile's page is the one on screen", which is
  // the same thing as having been looked at. The dot stays for the rest of the
  // session regardless — this only decides whether it returns next launch.
  useEffect(() => {
    if (active && isNew) markMetricSeen(metric);
  }, [active, isNew, metric]);

  const solidStyle = useAnimatedStyle(() => ({ width: `${fill.value * solidEnd * 100}%` }));
  const dottedStyle = useAnimatedStyle(() => ({ width: `${fill.value * dottedEnd * 100}%` }));

  return (
    <View style={[styles.tile, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <View style={styles.categoryRow}>
        <ThemedText type="eyebrow" themeColor="textMuted" numberOfLines={1} style={styles.category}>
          {categoryLabel(metric.category)}
        </ThemedText>
        {isNew ? <NewDataBadge variant="dot" /> : null}
      </View>

      <ThemedText type="small" themeColor="textSecondary" numberOfLines={2} style={styles.label}>
        {metric.label}
      </ThemedText>

      <ThemedText
        type="subtitle"
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.7}
        style={styles.value}>
        {formatMetricValue(metric)}
      </ThemedText>

      <View
        style={[styles.track, { backgroundColor: track }]}
        accessible={false}
        importantForAccessibility="no">
        {/* Drawn first and underneath: the dashed band spans the whole
            observed-to-projected range, and the solid fill covers the measured
            part of it, leaving only the projected gap showing through. */}
        {metric.isProjected && dottedEnd > solidEnd ? (
          <Animated.View style={[styles.dotted, { borderColor: accent }, dottedStyle]} />
        ) : null}
        <Animated.View style={[styles.fill, { backgroundColor: accent }, solidStyle]} />
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
    minHeight: 168,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  category: {
    fontSize: 13,
    letterSpacing: 0.9,
    // Shrinks rather than pushing the dot off the tile when a category name is
    // long — the label already truncates at one line.
    flexShrink: 1,
  },
  label: {
    // Holds two lines of label so tiles in a row stay aligned regardless of
    // whether the name wraps. Two lines of `small` is 48 now that it's 17/24.
    minHeight: 48,
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
    // Both bars occupy the same row; the solid one is painted over the dashed.
    position: 'absolute',
    left: 0,
    top: 0,
  },
  // A dashed border on a 6pt bar reads as a dotted line without needing SVG.
  dotted: {
    position: 'absolute',
    left: 0,
    top: 0,
    height: '100%',
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderStyle: 'dashed',
    opacity: 0.7,
  },
  delta: {
    fontSize: 16,
  },
});
