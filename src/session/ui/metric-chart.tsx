/**
 * One indicator: what it is, where it stands now, its whole history as a chart,
 * and who publishes it.
 *
 * Descended from the old app's `MetricChartCard` and cut down hard for this one.
 * Gone: the "new data" badge, the value-transition animation, the highlight
 * state and the `basis` paragraph. All four were built for a reader browsing a
 * Progress tab — someone who had opened the app *to* look at data. Nobody
 * arrives here that way. They arrive five minutes into a session about being
 * frightened of the thing this chart is about, and every line that is not
 * carrying its weight is a line they have to get past.
 *
 * What survives is the four things a claim needs to be checkable: the number,
 * the movement, the span it was measured over, and a tappable source.
 */

import { Linking, Pressable, StyleSheet, View } from 'react-native';

import {
  firstYear,
  formatMetricValue,
  isMovingWrongWay,
  lastObservedYear,
  type HumanityMetric,
} from '@/api/humanity';
import { ThemedText } from '@/components/themed-text';
import { CALIBRATION_COPY } from '@/content/strings';
import { Fonts, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { Sparkline } from '@/session/ui/sparkline';

export function MetricChart({ metric }: { metric: HumanityMetric }) {
  const theme = useTheme();

  /**
   * `isMovingWrongWay`, not `isRegressing` — this colours the delta pill, and a
   * delta is a statement about movement. Position against the baseline is the
   * wrong question here: Arctic sea ice sits at the low end of its own scale,
   * which normalises near zero rather than below it, and colouring by position
   * painted a 1.9M km² loss as an improvement.
   *
   * Under the current palette both branches resolve to ink and only the wash
   * behind the pill differs — `declineSoft` is a step denser than
   * `positiveSoft`, so a wrong-way pill reads heavier on the page. The arrow
   * inside `delta` is what actually says which way. See the note at the top of
   * `constants/theme.ts`: when a real accent hue lands, this is already wired.
   */
  const wrongWay = isMovingWrongWay(metric);
  const accent = wrongWay ? theme.decline : theme.positive;
  const accentSoft = wrongWay ? theme.declineSoft : theme.positiveSoft;

  const values = metric.series.map((point) => point.v);
  const from = firstYear(metric);
  const observed = lastObservedYear(metric);

  return (
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <View style={styles.header}>
        <ThemedText type="smallBold" themeColor="textSecondary" style={styles.label} numberOfLines={2}>
          {metric.label}
        </ThemedText>

        <View style={[styles.deltaPill, { backgroundColor: accentSoft }]}>
          <ThemedText type="small" style={[styles.deltaText, { color: accent }]} numberOfLines={1}>
            {metric.delta}
          </ThemedText>
        </View>
      </View>

      <ThemedText type="subtitle">{formatMetricValue(metric)}</ThemedText>

      <Sparkline values={values} color={accent} />

      {/* Provenance in full: what the chart spans, and whether the number above
          it was measured or modelled. The second half is the part that keeps
          this honest — most of these series are published a year or more in
          arrears, and the headline is a nowcast for today. */}
      <ThemedText type="small" themeColor="textMuted" style={styles.provenance} numberOfLines={2}>
        {from ? `${from}–${observed} · ` : ''}
        {metric.isProjected
          ? CALIBRATION_COPY.projected(observed)
          : CALIBRATION_COPY.measured(observed)}
      </ThemedText>

      <Pressable
        accessibilityRole="link"
        accessibilityLabel={`Open source: ${metric.sourceName}`}
        onPress={() => void Linking.openURL(metric.sourceUrl)}
        hitSlop={8}
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
  label: {
    flex: 1,
  },
  deltaPill: {
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
    borderRadius: Radius.pill,
    // Keeps a long delta string from squeezing the label to nothing.
    maxWidth: '48%',
  },
  deltaText: {
    fontFamily: Fonts.semibold,
    fontSize: 16,
  },
  provenance: {
    fontSize: 15,
    lineHeight: 20,
  },
  sourceLink: {
    alignSelf: 'flex-end',
  },
});
