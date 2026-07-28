import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import type { MetricPoint } from '@/types/database';

const GROW_DURATION = 550;
/** Per-bar offset, so a series sweeps left to right instead of popping at once. */
const STAGGER = 28;
/** Floor so a near-zero point still reads as a bar rather than a gap. */
const MIN_BAR_HEIGHT = 3;

interface SparklineProps {
  points: MetricPoint[];
  color: string;
  height?: number;
  /**
   * False while the chart's page is off screen: bars empty out and regrow when
   * it comes back, so a swipe reads as the series drawing itself. Defaults to
   * true for the places a chart just sits in a scrolling list.
   */
  active?: boolean;
}

/**
 * A bar-based sparkline built from plain Views.
 *
 * Deliberately not react-native-svg: this is the only chart in the app and a
 * dozen flex children render fine, so it is not worth a native dependency that
 * would also have to be wired into the widget target later.
 */
export function Sparkline({ points, color, height = 44, active = true }: SparklineProps) {
  if (points.length < 2) return null;

  const values = points.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min;

  return (
    <View style={[styles.row, { height }]} accessible={false} importantForAccessibility="no">
      {points.map((point, index) => {
        // A flat series would divide by zero; render it as a mid-height band.
        const ratio = span === 0 ? 0.5 : (point.value - min) / span;
        return (
          <SparkBar
            key={point.id}
            color={color}
            targetHeight={Math.max(MIN_BAR_HEIGHT, ratio * height)}
            opacity={0.25 + (index / (points.length - 1)) * 0.75}
            index={index}
            active={active}
          />
        );
      })}
    </View>
  );
}

interface SparkBarProps {
  color: string;
  targetHeight: number;
  opacity: number;
  index: number;
  active: boolean;
}

/** Its own component so each bar can hold a shared value. */
function SparkBar({ color, targetHeight, opacity, index, active }: SparkBarProps) {
  const barHeight = useSharedValue(MIN_BAR_HEIGHT);
  const fade = useSharedValue(0);

  useEffect(() => {
    if (!active) {
      // Snap rather than ease out: the collapse happens behind the swipe, and
      // animating it would still be running when the page comes back.
      barHeight.value = MIN_BAR_HEIGHT;
      fade.value = 0;
      return;
    }

    const timing = { duration: GROW_DURATION, easing: Easing.out(Easing.cubic) };
    const delay = index * STAGGER;

    barHeight.value = withDelay(delay, withTiming(targetHeight, timing));
    fade.value = withDelay(delay, withTiming(1, timing));
  }, [active, barHeight, fade, index, targetHeight]);

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
