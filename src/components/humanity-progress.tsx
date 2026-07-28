import { useEffect, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { ThemedText } from "@/components/themed-text";
import { Radius, Spacing } from "@/constants/theme";
import {
  HUMANITY_CONTRIBUTIONS,
  HUMANITY_PROGRESS,
  HUMANITY_WEAKEST,
  WORLD_CATEGORIES,
  WORLD_METRICS,
  type WorldCategory,
} from "@/constants/world-metrics";
import type { MetricContribution } from "@/lib/scoring";
import { useTheme } from "@/hooks/use-theme";

/** Slower than a tile's bar: this one is the headline, so it takes its time. */
const FILL_DURATION = 1100;

interface HumanityProgressProps {
  /** False parks the bar empty — same contract as the tiles below it. */
  active?: boolean;
}

/**
 * Every indicator in the app, weighted into one bar.
 *
 * The number is computed from the indicator config rather than stored, so a new
 * metric changes this the moment it lands. The model itself lives in
 * `@/lib/scoring` — this component only draws what it returns, and the
 * breakdown below shows its work rather than asking anyone to take 51% on
 * faith.
 */
export function HumanityProgress({ active = true }: HumanityProgressProps) {
  const theme = useTheme();
  const fill = useSharedValue(0);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    fill.value = active
      ? withTiming(HUMANITY_PROGRESS, {
          duration: FILL_DURATION,
          easing: Easing.out(Easing.cubic),
        })
      : 0;
  }, [active, fill]);

  const fillStyle = useAnimatedStyle(() => ({ width: `${fill.value * 100}%` }));

  const percent = Math.round(HUMANITY_PROGRESS * 100);
  const count = WORLD_METRICS.length;

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: theme.surface, borderColor: theme.border },
      ]}
    >
      {/* The summary is one accessible element so the value is announced with
          its label; the toggle below it stays a separate, focusable button. */}
      <View
        accessible
        accessibilityRole="progressbar"
        accessibilityValue={{ min: 0, max: 100, now: percent }}
        accessibilityLabel={`Humanity progress: ${percent} percent, weighted across ${count} indicators. Held down most by ${HUMANITY_WEAKEST.label.toLowerCase()}.`}
        style={styles.summary}
      >
        <View style={styles.header}>
          <ThemedText type="eyebrow" themeColor="textMuted">
            Humanity progress
          </ThemedText>
          <ThemedText
            type="subtitle"
            style={[styles.percent, { color: theme.accentStrong }]}
          >
            {percent}%
          </ThemedText>
        </View>

        {/* Decorative — the wrapper above carries the value for screen readers,
            so announcing it twice would just be noise. */}
        <View
          style={[styles.track, { backgroundColor: theme.accentSoft }]}
          accessible={false}
          importantForAccessibility="no"
        >
          <Animated.View
            style={[
              styles.fill,
              { backgroundColor: theme.accentStrong },
              fillStyle,
            ]}
          />
        </View>

        {/* Names the indicator doing the most damage rather than saying
            "average", which this deliberately isn't — each indicator carries a
            different weight, and one of them subtracts. */}
        <ThemedText type="small" themeColor="textSecondary">
          Weighted across {count} indicators, minus what we are losing on{' '}
          {HUMANITY_WEAKEST.label.toLowerCase()}.
        </ThemedText>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: isExpanded }}
        accessibilityHint="Shows how much each indicator adds to or takes off the total"
        onPress={() => setIsExpanded((expanded) => !expanded)}
        hitSlop={8}
        style={styles.toggle}
      >
        <ThemedText type="linkPrimary">
          {isExpanded ? 'Hide the breakdown' : 'How is this calculated?'}
        </ThemedText>
      </Pressable>

      {isExpanded ? (
        <Animated.View
          entering={FadeIn.duration(180)}
          style={[styles.breakdown, { borderTopColor: theme.border }]}
        >
          {HUMANITY_CONTRIBUTIONS.map((entry) => (
            <ContributionRow key={entry.metric.id} entry={entry} />
          ))}

          <ThemedText type="small" themeColor="textMuted" style={styles.footnote}>
            Each indicator is scored from its own baseline to its own target,
            then weighted by importance. Detractors subtract what they cost
            instead of contributing a low score.
          </ThemedText>
        </Animated.View>
      ) : null}
    </View>
  );
}

/** One indicator's signed share of the headline. */
function ContributionRow({ entry }: { entry: MetricContribution<WorldCategory> }) {
  const theme = useTheme();
  const isDetractor = entry.points < 0;

  // Same convention as the tiles: blue is "how far along", red is the wrong
  // direction.
  const accent = isDetractor ? theme.decline : theme.info;

  // Percentage points of the headline, which is what the row is actually
  // claiming — not the metric's own 0–100 progress, which the bar shows.
  const points = `${isDetractor ? '−' : '+'}${Math.abs(entry.points * 100).toFixed(1)} pts`;

  return (
    <View
      style={styles.row}
      accessible
      accessibilityLabel={`${entry.metric.label}: ${Math.round(entry.normalized * 100)} percent of the way to its target, ${
        isDetractor ? 'taking off' : 'adding'
      } ${Math.abs(entry.points * 100).toFixed(1)} points.`}
    >
      <View style={styles.rowText}>
        <ThemedText type="small" numberOfLines={1}>
          {entry.metric.label}
        </ThemedText>
        <ThemedText type="small" themeColor="textMuted" numberOfLines={1}>
          {WORLD_CATEGORIES[entry.metric.category]} ·{' '}
          {Math.round(entry.metric.weight * 100)}% weight
        </ThemedText>
      </View>

      <View style={styles.rowValue}>
        <ThemedText type="small" style={{ color: accent }}>
          {points}
        </ThemedText>
        <View
          style={[styles.rowTrack, { backgroundColor: theme.backgroundElement }]}
          accessible={false}
          importantForAccessibility="no"
        >
          <View
            style={[
              styles.fill,
              {
                backgroundColor: accent,
                // The metric's own progress, so a detractor at zero reads as an
                // empty red bar rather than a full one.
                width: `${Math.max(entry.normalized * 100, 2)}%`,
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
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
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: Radius.pill,
  },
  toggle: {
    alignSelf: "flex-start",
  },
  breakdown: {
    borderTopWidth: 1,
    paddingTop: Spacing.three,
    gap: Spacing.three,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
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
    alignItems: "flex-end",
    gap: Spacing.one,
  },
  rowTrack: {
    height: 4,
    width: "100%",
    borderRadius: Radius.pill,
    overflow: "hidden",
  },
  footnote: {
    fontSize: 15,
    lineHeight: 21,
  },
});
