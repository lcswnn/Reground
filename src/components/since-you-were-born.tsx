import { Link } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { formatMetricValue, type HumanityMetric } from '@/api/humanity';
import { ThemedText } from '@/components/themed-text';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { parseISODate } from '@/lib/format';
import {
  comparisonsSinceBirth,
  compositeSinceBirth,
  type BirthComparison,
  type CompositeSinceBirth,
} from '@/lib/since-birth';

/**
 * What has changed in the reader's own lifetime.
 *
 * The rest of the home screen answers "where does the world stand"; this
 * answers "how far has it come while you have been in it", which is the same
 * data at the one scale where a slow trend stops being abstract.
 *
 * Ranked by size of change rather than by good news — see
 * `comparisonsSinceBirth`. A section that only ever surfaced improvements would
 * not be evidence of anything.
 */
export function SinceYouWereBorn({
  metrics,
  birthDate,
}: {
  metrics: HumanityMetric[];
  /** `YYYY-MM-DD`, or null for accounts that predate the birthday field. */
  birthDate: string | null;
}) {
  const theme = useTheme();

  if (!birthDate) return <AddBirthdayPrompt />;

  const comparisons = comparisonsSinceBirth(metrics, birthDate);
  const composite = compositeSinceBirth(metrics, birthDate);

  // Everything measurable started after this reader did — possible for a very
  // recent birthday, where nothing has moved a full percent yet. An empty card
  // would read as a loading failure, so the section simply isn't there.
  if (comparisons.length === 0 && !composite) return null;

  const birthYear = parseISODate(birthDate).getFullYear();

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <ThemedText type="eyebrow" themeColor="textMuted">
          Since you were born
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          What has changed in the world since {birthYear}.
        </ThemedText>
      </View>

      {composite ? <CompositeCard composite={composite} /> : null}

      {comparisons.length > 0 ? (
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          {comparisons.map((comparison, index) => (
            <ComparisonRow
              key={comparison.metric.id}
              comparison={comparison}
              isLast={index === comparisons.length - 1}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

/**
 * The headline: the whole composite, then and now.
 *
 * Stated in points rather than as a percentage change, because the score is
 * already a percentage — "up 12.5%" of a percentage is ambiguous in a way that
 * "up 12.5 points" is not.
 *
 * The coverage line is not a disclaimer bolted on. The score here is computed
 * over only the indicators whose history reaches back past the birthday, so for
 * a younger reader it is genuinely a different number from the one on the home
 * screen above it, and saying so is what keeps the two from looking like a bug.
 */
function CompositeCard({ composite }: { composite: CompositeSinceBirth }) {
  const theme = useTheme();
  const { fromScore, toScore, deltaPoints, coverage } = composite;

  const rose = deltaPoints > 0;
  const accent = rose ? theme.positive : theme.decline;

  return (
    <View style={[styles.card, styles.composite, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <View style={styles.compositeTop}>
        <View style={styles.rowText}>
          <ThemedText type="defaultSemiBold">Human progress</ThemedText>
          <ThemedText type="small" themeColor="textMuted">
            {(fromScore * 100).toFixed(1)}% → {(toScore * 100).toFixed(1)}%
          </ThemedText>
        </View>

        <ThemedText type="defaultSemiBold" style={[styles.compositeDelta, { color: accent }]}>
          {rose ? '+' : '−'}
          {Math.abs(deltaPoints).toFixed(1)}
        </ThemedText>
      </View>

      <ThemedText type="small" themeColor="textMuted">
        {rose ? 'Up' : 'Down'} {Math.abs(deltaPoints).toFixed(1)} points, across{' '}
        {coverage.scored === coverage.total
          ? `all ${coverage.total} indicators`
          : `the ${coverage.scored} of ${coverage.total} indicators measured back then`}
        .
      </ThemedText>
    </View>
  );
}

function ComparisonRow({ comparison, isLast }: { comparison: BirthComparison; isLast: boolean }) {
  const theme = useTheme();
  const { metric, fromValue, changePct, isProgress } = comparison;

  // Null direction means the served artifact predates the field. Neither green
  // nor red is honest there, so the change renders in body grey and the arrow
  // says only which way the number moved.
  const accent =
    isProgress === null ? theme.textSecondary : isProgress ? theme.positive : theme.decline;

  const rose = changePct > 0;

  return (
    <View style={[styles.row, !isLast && { borderBottomColor: theme.border, borderBottomWidth: 1 }]}>
      <View style={styles.rowText}>
        <ThemedText type="defaultSemiBold" numberOfLines={2}>
          {metric.label}
        </ThemedText>
        <ThemedText type="small" themeColor="textMuted" numberOfLines={1}>
          {/* Formatted through the same helper as the tiles, so a percentage
              reads as a percentage and life expectancy carries its "yrs". */}
          {formatMetricValue({ ...metric, currentValue: fromValue })} → {formatMetricValue(metric)}
        </ThemedText>
      </View>

      <ThemedText type="defaultSemiBold" style={[styles.change, { color: accent }]}>
        {rose ? '↑' : '↓'} {Math.abs(changePct).toFixed(0)}%
      </ThemedText>
    </View>
  );
}

/**
 * Shown to accounts with no birthday on file.
 *
 * A prompt rather than a hidden section: the field exists on every sign-up
 * form, so an empty one is nearly always an older account, and there is no way
 * to discover that this section exists without being told.
 */
function AddBirthdayPrompt() {
  const theme = useTheme();

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <ThemedText type="eyebrow" themeColor="textMuted">
          Since you were born
        </ThemedText>
      </View>

      <Link href="/settings" asChild>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add your birthday in settings"
          style={({ pressed }) => [
            styles.card,
            styles.prompt,
            { backgroundColor: theme.surface, borderColor: theme.border },
            pressed && styles.pressed,
          ]}>
          <ThemedText type="default" themeColor="textSecondary">
            Add your birthday and this will show how much the world has changed in your lifetime.
          </ThemedText>
          <ThemedText type="linkPrimary">Add it in settings</ThemedText>
        </Pressable>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    gap: Spacing.three,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  header: {
    gap: Spacing.one,
  },
  card: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    paddingHorizontal: Spacing.three,
  },
  prompt: {
    paddingVertical: Spacing.three,
    gap: Spacing.two,
  },
  composite: {
    paddingVertical: Spacing.three,
    gap: Spacing.two,
  },
  compositeTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  compositeDelta: {
    fontSize: 22,
  },
  pressed: {
    opacity: 0.85,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
    paddingVertical: Spacing.three,
  },
  rowText: {
    flexShrink: 1,
    gap: Spacing.one,
  },
  change: {
    fontSize: 17,
    // Keeps the four arrows on one vertical line however wide the numbers are.
    minWidth: 62,
    textAlign: 'right',
  },
});
