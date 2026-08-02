import { useEffect } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';

import {
  formatMetricValue,
  formatValueWithUnit,
  isMovingWrongWay,
  lastObservedYear,
  type HumanityMetric,
} from '@/api/humanity';
import { NewDataBadge } from '@/components/new-data-badge';
import { Sparkline } from '@/components/sparkline';
import { ThemedText } from '@/components/themed-text';
import { ValueTransition } from '@/components/value-transition';
import { Fonts, Radius, Spacing } from '@/constants/theme';
import { categoryLabel } from '@/constants/world-metrics';
import { useTheme } from '@/hooks/use-theme';
import { markMetricSeen } from '@/lib/fresh-data';

interface MetricChartCardProps {
  metric: HumanityMetric;
  /** False parks the chart while it's off screen; bars regrow on return. */
  active?: boolean;
  /** Source published a new measurement since this device last saw one. */
  isNew?: boolean;
  /** The value shown before that measurement landed; drives the `→` pair. */
  previousValue?: number;
  /**
   * Briefly marked as the card the reader was sent to, after arriving from a
   * story's trend card. Times out on the Progress screen — see `HIGHLIGHT_MS`.
   */
  highlighted?: boolean;
}

/**
 * The long view of one indicator: its full history as a chart, the current
 * number, and where it came from.
 *
 * Distinct from `MetricCard`, which renders the Supabase `metrics` table. This
 * one renders the served artifact, which is where the real series now live —
 * decades of history per indicator, some of it reaching back to 1750.
 */
export function MetricChartCard({
  metric,
  active = true,
  isNew = false,
  previousValue,
  highlighted = false,
}: MetricChartCardProps) {
  const theme = useTheme();

  // The list already tracks viewability to decide when a chart draws itself, so
  // `active` doubles as "this card actually reached the screen".
  useEffect(() => {
    if (active && isNew) markMetricSeen(metric);
  }, [active, isNew, metric]);

  // Same convention as the world tiles: red is the wrong direction, and the
  // charts stay green-ish/blue whether the number rises or falls, because what
  // matters is whether the movement is the good one.
  //
  // `isMovingWrongWay`, not `isRegressing` — this card's accent colours the
  // delta pill, and a delta is a statement about movement. Position against the
  // baseline is the wrong question here: Arctic sea ice sits at the low end of
  // its own scale, which normalises near zero rather than below it, and colouring
  // by position painted a 1.9M km² loss green.
  // This card has no progress bar — that lives in `humanity-progress`, which
  // still reads by position because "how much of the problem is left" is a
  // question about position. Here there is only the delta, so only movement.
  const wrongWay = isMovingWrongWay(metric);
  const accent = wrongWay ? theme.decline : theme.positive;
  const accentSoft = wrongWay ? theme.declineSoft : theme.positiveSoft;

  const values = metric.series.map((point) => point.v);
  const firstYear = metric.series[0]?.t.slice(0, 4);

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.surface,
          // Colour only, never width. Thickening the border to mark the card
          // would reflow it by a point on each edge, and the reflow lands
          // mid-scroll on exactly the row the scroll is trying to settle on.
          borderColor: highlighted ? theme.brandStrong : theme.border,
        },
      ]}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <View style={styles.categoryRow}>
            <ThemedText type="eyebrow" themeColor="textMuted" numberOfLines={1} style={styles.category}>
              {categoryLabel(metric.category)}
            </ThemedText>
            {isNew ? <NewDataBadge variant="pill" /> : null}
          </View>
          <ThemedText type="smallBold" themeColor="textSecondary" numberOfLines={2}>
            {metric.label}
          </ThemedText>
        </View>

        <View style={[styles.deltaPill, { backgroundColor: accentSoft }]}>
          <ThemedText type="small" style={[styles.deltaText, { color: accent }]} numberOfLines={1}>
            {metric.delta}
          </ThemedText>
        </View>
      </View>

      {previousValue === undefined ? (
        <ThemedText type="title" style={styles.value}>
          {formatMetricValue(metric)}
        </ThemedText>
      ) : (
        <ValueTransition
          previous={formatValueWithUnit(previousValue, metric.unit)}
          current={formatMetricValue(metric)}
          color={accent}
          style={styles.value}
        />
      )}

      <Sparkline values={values} color={accent} active={active} height={56} />

      {/* Provenance in full: what the chart spans, and whether the headline
          number above it was measured or modelled. */}
      <ThemedText type="small" themeColor="textMuted" numberOfLines={2}>
        {firstYear ? `${firstYear}–${lastObservedYear(metric)} · ` : ''}
        {metric.isProjected
          ? `projected for today, last measured ${lastObservedYear(metric)}`
          : `measured ${lastObservedYear(metric)}`}
      </ThemedText>

      <ThemedText type="small" themeColor="textSecondary" style={styles.basis}>
        {metric.basis}
      </ThemedText>

      <Pressable
        accessibilityRole="link"
        accessibilityLabel={`Open source: ${metric.sourceName}`}
        onPress={() => Linking.openURL(metric.sourceUrl)}
        hitSlop={6}
        style={styles.sourceLink}>
        <ThemedText type="linkPrimary">{metric.sourceName} →</ThemedText>
      </Pressable>
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
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  headerText: {
    flex: 1,
    gap: Spacing.half,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  category: {
    flexShrink: 1,
  },
  deltaPill: {
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
    borderRadius: Radius.pill,
    // Keeps a long delta string from squeezing the label to nothing.
    maxWidth: '45%',
  },
  deltaText: {
    fontFamily: Fonts.semibold,
    fontSize: 16,
  },
  value: {
    fontSize: 28,
    lineHeight: 32,
  },
  basis: {
    fontSize: 15,
    lineHeight: 21,
  },
  sourceLink: {
    alignSelf: 'flex-end',
  },
});
