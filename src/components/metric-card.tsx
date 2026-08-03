import { StyleSheet, View } from 'react-native';

import { Sparkline } from '@/components/sparkline';
import { ThemedText } from '@/components/themed-text';
import { Fonts, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { computeTrend, formatValue } from '@/lib/format';
import type { MetricWithSeries } from '@/types/database';

interface MetricCardProps {
  metric: MetricWithSeries;
  /** Passed through to the sparkline: false parks its bars while off screen. */
  active?: boolean;
}

export function MetricCard({ metric, active = true }: MetricCardProps) {
  const theme = useTheme();
  const trend = computeTrend(metric.points, metric.direction);
  const latest = metric.points[metric.points.length - 1];

  // Charts stay green whether the number went up (vaccination coverage) or down
  // (child mortality) — what matters is the direction being the good one. When
  // it isn't, the chart and its pill go red rather than merely grey.
  const accent = trend?.isProgress === false ? theme.decline : theme.positive;
  const accentSoft = trend?.isProgress === false ? theme.declineSoft : theme.positiveSoft;

  return (
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <View style={styles.header}>
        <ThemedText type="smallBold" themeColor="textSecondary" numberOfLines={2} style={styles.title}>
          {metric.title}
        </ThemedText>
        {trend ? (
          <View style={[styles.trendPill, { backgroundColor: accentSoft }]}>
            <ThemedText type="small" style={[styles.trendText, { color: accent }]}>
              {trend.label}
            </ThemedText>
          </View>
        ) : null}
      </View>

      {latest ? (
        <ThemedText type="title" style={styles.value}>
          {formatValue(latest.value, metric.unit)}
        </ThemedText>
      ) : (
        <ThemedText type="small" themeColor="textMuted">
          No data yet
        </ThemedText>
      )}

      <Sparkline values={metric.points.map((point) => point.value)} color={accent} active={active} />

      <ThemedText type="small" themeColor="textMuted" numberOfLines={2}>
        {trend ? `${trend.fromPeriod}–${trend.toPeriod} · ` : ''}
        {metric.source_name}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.three,
    gap: Spacing.two,
    minHeight: 190,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  title: {
    flex: 1,
  },
  trendPill: {
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
    borderRadius: Radius.pill,
  },
  trendText: {
    fontFamily: Fonts.semibold,
    fontSize: 19,
  },
  value: {
    fontSize: 34,
    lineHeight: 32,
  },
});
