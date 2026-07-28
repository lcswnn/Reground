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
export function Sparkline({ values, color, height = 44, active = true }: SparklineProps) {
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
            opacity={0.25 + (index / (bars.length - 1)) * 0.75}
            index={index}
            active={active}
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
