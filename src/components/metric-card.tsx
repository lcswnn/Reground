import { StyleSheet, View } from 'react-native';

import { Sparkline } from '@/components/sparkline';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { computeTrend, formatValue } from '@/lib/format';
import type { MetricWithSeries } from '@/types/database';

export function MetricCard({ metric }: { metric: MetricWithSeries }) {
  const theme = useTheme();
  const trend = computeTrend(metric.points, metric.direction);
  const latest = metric.points[metric.points.length - 1];

  // Progress is always the hopeful color, whether the number went up (vaccination
  // coverage) or down (child mortality).
  const accent = trend?.isProgress === false ? theme.textSecondary : theme.positive;
  const accentSoft = trend?.isProgress === false ? theme.backgroundElement : theme.positiveSoft;

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

      <Sparkline points={metric.points} color={accent} />

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
    fontWeight: '800',
    fontSize: 12,
  },
  value: {
    fontSize: 28,
    lineHeight: 32,
  },
});
