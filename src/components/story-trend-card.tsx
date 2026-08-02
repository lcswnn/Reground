import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import {
  formatMetricValue,
  isMovingWrongWay,
  lastObservedYear,
  fetchHumanityArtifact,
} from '@/api/humanity';
import { Sparkline } from '@/components/sparkline';
import { ThemedText } from '@/components/themed-text';
import { Fonts, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { queryKeys } from '@/lib/query';

/**
 * The line a story sits on.
 *
 * This is the app's whole argument in one card. A good-news headline on its own
 * is the thing every reader has learned to discount as cherry-picking, and they
 * are right to — one story is one story. What makes it evidence is the series
 * underneath it, and until now the app had that series and never put the two
 * things on the same screen: the curator has been assigning `metric_id` to every
 * story it can, and the story page rendered it as a text label.
 *
 * So: headline, then the thirty-year line, then a way through to the full chart.
 * Nothing here is authored — the label, the delta, the span and the series all
 * come from the same daily artifact the Progress tab reads, which is what stops
 * this from being a caption that agrees with the story by construction.
 *
 * Three ways it renders nothing, all of them normal:
 *
 *   no metricId       — the common case. Most good news is not measured by any
 *                       tracked indicator, and an empty slot says that better
 *                       than a "not tracked" panel would.
 *   artifact pending  — the query is shared with Home and Progress, so it is
 *                       usually warm; on a cold start the card arrives a moment
 *                       after the story does.
 *   id not in artifact — a retired indicator. The story stays readable and loses
 *                       only its chart, which is why there is no foreign key
 *                       behind this.
 */
export function StoryTrendCard({ metricId }: { metricId: string | null }) {
  const theme = useTheme();
  const router = useRouter();

  const { data } = useQuery({
    queryKey: queryKeys.humanity,
    queryFn: fetchHumanityArtifact,
    // Nothing here is worth an error state or a retry storm: this is supporting
    // evidence on a story that reads fine without it.
    enabled: metricId !== null,
    retry: false,
  });

  if (!metricId) return null;

  const metric = data?.metrics.find((candidate) => candidate.id === metricId);
  if (!metric) return null;

  // Same convention as the Progress cards: the accent describes *movement*, not
  // position. `isMovingWrongWay` rather than `isRegressing` — a metric can sit
  // above its baseline while heading the wrong way, and this card's delta is a
  // statement about the direction of travel.
  const wrongWay = isMovingWrongWay(metric);
  const accent = wrongWay ? theme.decline : theme.positive;
  const accentSoft = wrongWay ? theme.declineSoft : theme.positiveSoft;

  const values = metric.series.map((point) => point.v);
  const firstYear = metric.series[0]?.t.slice(0, 4);

  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={`${metric.label}: ${formatMetricValue(metric)}, ${metric.delta}. Open the full chart.`}
      onPress={() =>
        // The Progress tab scrolls to this indicator and marks it briefly. See
        // the param handling in `app/(tabs)/progress.tsx`.
        router.navigate({ pathname: '/progress', params: { metric: metric.id } })
      }
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: theme.backgroundElement, borderColor: theme.border },
        pressed && styles.pressed,
      ]}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <ThemedText type="eyebrow" themeColor="textMuted">
            The long view
          </ThemedText>
          <ThemedText type="sectionTitle" numberOfLines={2}>
            {metric.label}
          </ThemedText>
        </View>

        <View style={[styles.deltaPill, { backgroundColor: accentSoft }]}>
          <ThemedText type="small" style={[styles.deltaText, { color: accent }]} numberOfLines={1}>
            {metric.delta}
          </ThemedText>
        </View>
      </View>

      <ThemedText type="title" style={styles.value}>
        {formatMetricValue(metric)}
      </ThemedText>

      <Sparkline values={values} color={accent} height={52} />

      {/* Provenance, in the same words the Progress card uses: what the chart
          spans, and whether the number above it was measured or modelled. A
          chart offered as proof has to say which of the two it is. */}
      <ThemedText type="small" themeColor="textMuted" numberOfLines={2}>
        {firstYear ? `${firstYear}–${lastObservedYear(metric)} · ` : ''}
        {metric.isProjected
          ? `projected for today, last measured ${lastObservedYear(metric)}`
          : `measured ${lastObservedYear(metric)}`}
      </ThemedText>

      <ThemedText type="linkPrimary" style={styles.link}>
        See the full chart →
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.md,
    borderWidth: 1,
    padding: Spacing.three,
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  pressed: {
    opacity: 0.85,
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
  link: {
    alignSelf: 'flex-end',
  },
});
