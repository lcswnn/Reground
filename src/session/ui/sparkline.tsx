/**
 * The bar chart from the old app, back for the calibration screen.
 *
 * Unchanged in substance from `src/legacy/components/sparkline.tsx` — see
 * `git show ab1efc0 -- src/legacy/components/sparkline.tsx` — because it was
 * already the right thing: a row of plain Views that grow left to right, with no
 * axes, no labels and no native charting dependency behind it. The card around
 * it carries the numbers; this carries the shape.
 *
 * The growth animation is not decoration here. This screen is reached by someone
 * who has just spent a minute breathing and a few more playing a puzzle, and a
 * chart that draws itself is slower to read than one that is simply there —
 * which is the point. A history that sweeps in over half a second is the visual
 * equivalent of "here is the whole run of it", and it lands quite differently
 * from a static block of bars.
 */

import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

const GROW_DURATION = 550;
/** Per-bar offset, so a series sweeps left to right instead of popping at once. */
const STAGGER = 28;
/** Floor so a near-zero point still reads as a bar rather than a gap. */
const MIN_BAR_HEIGHT = 3;

/**
 * Most bars a phone width can carry before they stop being bars.
 *
 * Each one reserves 2pt of width plus a 3pt gap, so past this the row overflows
 * and the series turns into a smear. Long histories — CO₂ per person reaches
 * back to 1750 — get evenly sampled down to this rather than truncated, so the
 * chart still spans the whole period.
 */
const MAX_BARS = 40;

interface SparklineProps {
  /** Oldest first. Sampled down if longer than `MAX_BARS`. */
  values: number[];
  color: string;
  height?: number;
}

export function Sparkline({ values, color, height = 56 }: SparklineProps) {
  const bars = sample(values, MAX_BARS);
  if (bars.length < 2) return null;

  const min = Math.min(...bars);
  const max = Math.max(...bars);
  const span = max - min;

  return (
    <View style={[styles.row, { height }]} accessible={false} importantForAccessibility="no">
      {bars.map((value, index) => {
        // A flat series would divide by zero; render it as a mid-height band.
        const ratio = span === 0 ? 0.5 : (value - min) / span;
        return (
          <SparkBar
            // Positional by nature — the bars are a shape, not a list of
            // identities, and the series is replaced wholesale when it changes.
            key={index}
            color={color}
            targetHeight={Math.max(MIN_BAR_HEIGHT, ratio * height)}
            // Older readings sit back, the current one sits forward. With hue
            // gone from the palette this ramp is what tells a reader which end
            // of the chart is now.
            opacity={0.25 + (index / (bars.length - 1)) * 0.75}
            index={index}
          />
        );
      })}
    </View>
  );
}

/**
 * Evenly thins a series to at most `limit` values, always keeping the last one.
 *
 * The final value is what the card's headline number reports, so dropping it to
 * keep the stride even would leave the chart ending somewhere the text says it
 * doesn't.
 */
function sample(values: number[], limit: number): number[] {
  if (values.length <= limit) return values;

  const stride = Math.ceil(values.length / limit);
  const thinned = values.filter((_, index) => index % stride === 0);
  const last = values[values.length - 1];

  if (thinned[thinned.length - 1] !== last) thinned.push(last);
  return thinned;
}

interface SparkBarProps {
  color: string;
  targetHeight: number;
  opacity: number;
  index: number;
}

/** Its own component so each bar can hold a shared value. */
function SparkBar({ color, targetHeight, opacity, index }: SparkBarProps) {
  const barHeight = useSharedValue(MIN_BAR_HEIGHT);
  const fade = useSharedValue(0);

  useEffect(() => {
    const timing = { duration: GROW_DURATION, easing: Easing.out(Easing.cubic) };
    const delay = index * STAGGER;

    barHeight.value = withDelay(delay, withTiming(targetHeight, timing));
    fade.value = withDelay(delay, withTiming(1, timing));
  }, [barHeight, fade, index, targetHeight]);

  const barStyle = useAnimatedStyle(() => ({
    height: barHeight.value,
    opacity: opacity * fade.value,
  }));

  return <Animated.View style={[styles.bar, { backgroundColor: color }, barStyle]} />;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 3,
  },
  bar: {
    flex: 1,
    borderRadius: 2,
    minWidth: 2,
  },
});
