import { useQuery } from '@tanstack/react-query';
import { StyleSheet, Text, View } from 'react-native';

import { fetchHumanityArtifact } from '@/api/humanity';
import { Fonts, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { queryKeys } from '@/lib/query';

/**
 * "Counts toward Child mortality before 5" — the link between a story and the
 * progress indicator it is evidence about.
 *
 * The label is resolved from the daily artifact rather than from a table or a
 * constant in the app, and that is the whole reason this component can be left
 * alone as the indicator set grows: a metric added to the data layer's config
 * appears in tomorrow's artifact, the curator starts tagging stories with it,
 * and this renders its label without a release.
 *
 * Three ways this renders nothing, all of them normal:
 *
 *   no metricId       — the common case. Most good news is not measured by any
 *                       tracked indicator, and an empty slot says that better
 *                       than a "not tracked" chip would.
 *   artifact pending  — the query is shared with the Home and Progress tabs, so
 *                       it is usually warm; on a cold start the tag simply
 *                       arrives a moment after the story does.
 *   id not in artifact — a retired indicator. The story stays readable and
 *                       loses only its tag, which is why there is no foreign
 *                       key behind this.
 */
export function MetricTag({
  metricId,
  variant = 'compact',
}: {
  metricId: string | null;
  variant?: 'compact' | 'full';
}) {
  const theme = useTheme();

  const { data } = useQuery({
    queryKey: queryKeys.humanity,
    queryFn: fetchHumanityArtifact,
    // Nothing here is worth an error state or a retry storm: the tag is
    // supporting detail on a story that reads fine without it.
    enabled: metricId !== null,
    retry: false,
  });

  if (!metricId) return null;

  const metric = data?.metrics.find((candidate) => candidate.id === metricId);
  if (!metric) return null;

  if (variant === 'compact') {
    return (
      <View style={[styles.pill, { backgroundColor: theme.backgroundElement }]}>
        <Text style={[styles.compactLabel, { color: theme.textSecondary }]} numberOfLines={1}>
          {metric.label}
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
      <Text style={[styles.eyebrow, { color: theme.textMuted }]}>Counts toward</Text>
      <Text style={[styles.fullLabel, { color: theme.text }]}>{metric.label}</Text>
      <Text style={[styles.basis, { color: theme.textSecondary }]}>{metric.delta}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    borderRadius: Radius.pill,
    // Sits beside the category pill, which can be long; without this a metric
    // label like "Electricity from renewables" pushes the row off the card.
    flexShrink: 1,
  },
  compactLabel: {
    fontFamily: Fonts.body,
    fontSize: 15,
    letterSpacing: 0.2,
  },
  card: {
    borderRadius: Radius.md,
    padding: Spacing.three,
    gap: Spacing.one,
  },
  eyebrow: {
    fontFamily: Fonts.body,
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  fullLabel: {
    fontFamily: Fonts.body,
    fontSize: 19,
  },
  basis: {
    fontFamily: Fonts.body,
    fontSize: 15,
  },
});
