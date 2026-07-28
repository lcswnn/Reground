import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import type { HumanityArtifact, HumanityMetric } from '@/api/humanity';
import { barFill, isRegressing, lastObservedYear } from '@/api/humanity';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { categoryLabel } from '@/constants/world-metrics';
import { useTheme } from '@/hooks/use-theme';

/** Slower than a tile's bar: this one is the headline, so it takes its time. */
const FILL_DURATION = 1100;

interface HumanityProgressProps {
  artifact: HumanityArtifact;
  /** False parks the bar empty — same contract as the tiles below it. */
  active?: boolean;
}

/**
 * Every indicator, weighted into one bar.
 *
 * Both the number and its breakdown come from the served artifact — the app
 * does no scoring of its own. The breakdown exists because 29% is a claim that
 * ought to show its work rather than be taken on faith, and because it is the
 * only place the detractors are visible as detractors.
 */
export function HumanityProgress({ artifact, active = true }: HumanityProgressProps) {
  const theme = useTheme();
  const fill = useSharedValue(0);
  const [isExpanded, setIsExpanded] = useState(false);

  const score = artifact.compositeScore;

  useEffect(() => {
    fill.value = active
      ? withTiming(score, { duration: FILL_DURATION, easing: Easing.out(Easing.cubic) })
      : 0;
  }, [active, fill, score]);

  const fillStyle = useAnimatedStyle(() => ({ width: `${fill.value * 100}%` }));

  const percent = Math.round(score * 100);
  const count = artifact.metrics.length;

  // Sorted by absolute impact so the breakdown opens on whatever is moving the
  // number most, in either direction.
  const ranked = [...artifact.metrics].sort(
    (a, b) => Math.abs(b.contribution) - Math.abs(a.contribution),
  );
  const worst = ranked.find((metric) => metric.contribution < 0);

  return (
    <View
      style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <View
        accessible
        accessibilityRole="progressbar"
        accessibilityValue={{ min: 0, max: 100, now: percent }}
        accessibilityLabel={`Humanity progress: ${percent} percent, weighted across ${count} indicators.${
          worst ? ` Held down most by ${worst.label.toLowerCase()}.` : ''
        }`}
        style={styles.summary}>
        <View style={styles.header}>
          <ThemedText type="eyebrow" themeColor="textMuted">
            Humanity progress
          </ThemedText>
          <ThemedText type="subtitle" style={[styles.percent, { color: theme.accentStrong }]}>
            {percent}%
          </ThemedText>
        </View>

        {/* Decorative — the wrapper above carries the value for screen readers,
            so announcing it twice would just be noise. */}
        <View
          style={[styles.track, { backgroundColor: theme.accentSoft }]}
          accessible={false}
          importantForAccessibility="no">
          <Animated.View
            style={[styles.fill, { backgroundColor: theme.accentStrong }, fillStyle]}
          />
        </View>

        <ThemedText type="small" themeColor="textSecondary">
          Weighted across {count} indicators
          {worst ? `, minus what we are losing on ${worst.label.toLowerCase()}` : ''}.
        </ThemedText>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: isExpanded }}
        accessibilityHint="Shows how much each indicator adds to or takes off the total"
        onPress={() => setIsExpanded((expanded) => !expanded)}
        hitSlop={8}
        style={styles.toggle}>
        <ThemedText type="linkPrimary">
          {isExpanded ? 'Hide the breakdown' : 'How is this calculated?'}
        </ThemedText>
      </Pressable>

      {isExpanded ? (
        <Animated.View
          entering={FadeIn.duration(180)}
          style={[styles.breakdown, { borderTopColor: theme.border }]}>
          {ranked.map((metric) => (
            <ContributionRow key={metric.id} metric={metric} />
          ))}

          <ThemedText type="small" themeColor="textMuted" style={styles.footnote}>
            Each indicator is scored from its own baseline to its own target, then weighted by
            importance. Detractors subtract what they cost instead of contributing a low score.
            Today&apos;s values are projected from the last measurement.
          </ThemedText>
        </Animated.View>
      ) : null}
    </View>
  );
}

/** One indicator's signed share of the headline. */
function ContributionRow({ metric }: { metric: HumanityMetric }) {
  const theme = useTheme();
  const isNegative = metric.contribution < 0;
  const regressing = isRegressing(metric);

  const accent = isNegative ? theme.decline : theme.info;
  const points = `${isNegative ? '−' : '+'}${Math.abs(metric.contribution * 100).toFixed(1)} pts`;

  return (
    <View
      style={styles.row}
      accessible
      accessibilityLabel={`${metric.label}: ${
        isNegative ? 'taking off' : 'adding'
      } ${Math.abs(metric.contribution * 100).toFixed(1)} points. Last measured ${lastObservedYear(metric)}.`}>
      <View style={styles.rowText}>
        <ThemedText type="small" numberOfLines={1}>
          {metric.label}
        </ThemedText>
        <ThemedText type="small" themeColor="textMuted" numberOfLines={1}>
          {categoryLabel(metric.category)} · {Math.round(metric.weight * 100)}% weight ·{' '}
          {lastObservedYear(metric)}
        </ThemedText>
      </View>

      <View style={styles.rowValue}>
        <ThemedText type="small" style={{ color: accent }}>
          {points}
        </ThemedText>
        <View
          style={[styles.rowTrack, { backgroundColor: theme.backgroundElement }]}
          accessible={false}
          importantForAccessibility="no">
          <View
            style={[
              styles.rowFill,
              {
                backgroundColor: accent,
                // Same reading as the tiles: progress made when the metric is
                // improving, problem remaining when it has regressed. Floored at
                // a sliver so a bar is always visible.
                width: `${Math.max(barFill(metric.normalized, regressing) * 100, 2)}%`,
              },
            ]}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  summary: {
    gap: Spacing.two,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  percent: {
    // The eyebrow sets the baseline for the row; nudging the number down keeps
    // the two optically level rather than hanging the caps above the label.
    marginTop: -2,
  },
  // Thicker than the tiles' 6pt bars, which is most of what makes this read as
  // the summary of them rather than one more of them.
  track: {
    height: 12,
    borderRadius: Radius.pill,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: Radius.pill,
  },
  toggle: {
    alignSelf: 'flex-start',
  },
  breakdown: {
    borderTopWidth: 1,
    paddingTop: Spacing.three,
    gap: Spacing.three,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  rowText: {
    flex: 1,
    gap: Spacing.half,
  },
  // Fixed rather than content-sized, so the numbers form a column instead of
  // ragging with the length of each label.
  rowValue: {
    width: 96,
    alignItems: 'flex-end',
    gap: Spacing.one,
  },
  rowTrack: {
    height: 4,
    width: '100%',
    borderRadius: Radius.pill,
    overflow: 'hidden',
  },
  rowFill: {
    height: '100%',
    borderRadius: Radius.pill,
  },
  footnote: {
    fontSize: 15,
    lineHeight: 21,
  },
});
