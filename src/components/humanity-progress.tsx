import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { ThemedText } from "@/components/themed-text";
import { Radius, Spacing } from "@/constants/theme";
import {
  HUMANITY_PROGRESS,
  HUMANITY_WEAKEST,
  WORLD_METRICS,
} from "@/constants/world-metrics";
import { useTheme } from "@/hooks/use-theme";

/** Slower than a tile's bar: this one is the headline, so it takes its time. */
const FILL_DURATION = 1100;

interface HumanityProgressProps {
  /** False parks the bar empty — same contract as the tiles below it. */
  active?: boolean;
}

/**
 * Every indicator in the app, averaged into one bar.
 *
 * The number is computed from `WORLD_METRICS` rather than stored, so a new
 * metric changes this the moment it lands.
 */
export function HumanityProgress({ active = true }: HumanityProgressProps) {
  const theme = useTheme();
  const fill = useSharedValue(0);

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
      accessible
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: percent }}
      accessibilityLabel={`Humanity progress: ${percent} percent across ${count} indicators, weighted toward the weakest: ${HUMANITY_WEAKEST.label.toLowerCase()}`}
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

      {/* The bar itself is decorative — the card above carries the value for
          screen readers, so announcing it twice would just be noise. */}
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

      {/* Names the weakest indicator rather than saying "average", which this
          deliberately isn't — half the number is that one metric. */}
      <ThemedText type="small" themeColor="textSecondary">
        Across {count} indicators, weighted hard toward the worst of them:{' '}
        {HUMANITY_WEAKEST.label.toLowerCase()}.
      </ThemedText>
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
});
