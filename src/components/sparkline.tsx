import { StyleSheet, View } from 'react-native';

import type { MetricPoint } from '@/types/database';

interface SparklineProps {
  points: MetricPoint[];
  color: string;
  height?: number;
}

/**
 * A bar-based sparkline built from plain Views.
 *
 * Deliberately not react-native-svg: this is the only chart in the app and a
 * dozen flex children render fine, so it is not worth a native dependency that
 * would also have to be wired into the widget target later.
 */
export function Sparkline({ points, color, height = 44 }: SparklineProps) {
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
          <View
            key={point.id}
            style={[
              styles.bar,
              {
                backgroundColor: color,
                height: Math.max(3, ratio * height),
                opacity: 0.25 + (index / (points.length - 1)) * 0.75,
              },
            ]}
          />
        );
      })}
    </View>
  );
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
