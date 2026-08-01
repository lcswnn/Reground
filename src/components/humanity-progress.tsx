import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import type { HumanityArtifact, HumanityMetric } from '@/api/humanity';
import { barFill, isRegressing, lastObservedYear } from '@/api/humanity';
import { ThemedText } from '@/components/themed-text';
import { ValueTransition } from '@/components/value-transition';
import { Radius, Spacing } from '@/constants/theme';
import { categoryLabel, normalizeCategory } from '@/constants/world-metrics';
import { useTheme } from '@/hooks/use-theme';
import {
  computeComposite,
  defaultWeightsFrom,
  isDefaultWeighting,
  toScorable,
} from '@/lib/scoring';
import { useWeightingControls } from '@/state/weighting';

/** Slower than a tile's bar: this one is the headline, so it takes its time. */
const FILL_DURATION = 1100;

interface HumanityProgressProps {
  artifact: HumanityArtifact;
  /** False parks the bar empty — same contract as the tiles below it. */
  active?: boolean;
  /**
   * The score this device last showed, when a new measurement has since moved
   * it. Null the rest of the time, which is nearly always.
   */
  previousScore?: number | null;
}

/**
 * Every indicator, weighted into one bar.
 *
 * The default number and its breakdown come from the served artifact. The one
 * exception is a reader's own weighting, which is per-device and therefore
 * cannot be precomputed — that is recomputed here through `computeComposite`,
 * the same maths the data layer ran, guarded against drift by a test that
 * reproduces the published score from the published inputs.
 *
 * When a weighting exists it **replaces** the headline rather than appearing
 * beside it. Someone who has said what matters to them has already answered the
 * question the default was asking; showing both as equals just asks it twice.
 * The default stays one line below, and tapping through goes back to the sliders.
 *
 * The breakdown exists because a number like this is a claim that ought to show
 * its work rather than be taken on faith, and because it is the only place an
 * indicator that is going backwards is visible as such. A negative contribution
 * here means *regressed past its own baseline*, not "detractor" — since the
 * composite became polarity-blind, a detractor sitting on its target earns its
 * full weight like anything else. Note it always itemises the *default*
 * contributions — reweighting changes how much each indicator counts, not what
 * any of them says.
 */
export function HumanityProgress({
  artifact,
  active = true,
  previousScore = null,
}: HumanityProgressProps) {
  const theme = useTheme();
  const fill = useSharedValue(0);
  const [isExpanded, setIsExpanded] = useState(false);

  const score = artifact.compositeScore;

  // The headline stays the artifact's own number — the research weighting is
  // what "the Humanity Score" means, and recomputing it client-side would only
  // introduce a way for the two to disagree.
  //
  // The reader's own score has to be computed here: their weighting is
  // per-device and arrives long after the artifact was built. Null whenever they
  // have not customised, or have dragged everything back to the defaults.
  const metrics = useMemo(
    () =>
      toScorable(artifact.metrics).map((metric) => ({
        ...metric,
        category: normalizeCategory(metric.category),
      })),
    [artifact],
  );
  const defaults = useMemo(() => defaultWeightsFrom(metrics), [metrics]);
  const { weights, isCustomised } = useWeightingControls(defaults);

  const personalScore = useMemo(() => {
    if (!isCustomised || isDefaultWeighting(weights, defaults)) return null;
    return computeComposite(metrics, weights).score;
  }, [isCustomised, weights, defaults, metrics]);

  // The reader's weighting replaces the headline rather than sitting beside it.
  // Once someone has said what matters to them, the default weighting is no
  // longer the number they came for — showing both as equals just asks them to
  // decide twice. The default stays available on the line beneath.
  const displayScore = personalScore ?? score;
  const isPersonal = personalScore !== null;

  useEffect(() => {
    fill.value = active
      ? withTiming(displayScore, { duration: FILL_DURATION, easing: Easing.out(Easing.cubic) })
      : 0;
  }, [active, fill, displayScore]);

  const fillStyle = useAnimatedStyle(() => ({ width: `${fill.value * 100}%` }));

  // Two decimals: at this scale a whole point is a huge move, so rounding to an
  // integer froze the number for weeks at a time. `now` stays rounded because
  // accessibilityValue is announced verbatim and "twenty-eight point six one"
  // is noise in a screen-reader pass.
  const percent = (displayScore * 100).toFixed(2);

  // Only worth an arrow if the move survives the two decimals on screen —
  // otherwise the row reads "28.61% → 28.61%".
  //
  // Suppressed under a personal weighting: `previousScore` is the last *default*
  // score this device showed, so comparing it against a reweighted number would
  // report a move that never happened.
  const previousPercent =
    previousScore === null || isPersonal ? null : (previousScore * 100).toFixed(2);
  const moved = previousPercent !== null && previousPercent !== percent;
  const improved = previousScore !== null && score >= previousScore;
  const count = artifact.metrics.length;

  // Sorted by absolute impact so the breakdown opens on whatever is moving the
  // number most, in either direction.
  const ranked = [...artifact.metrics].sort(
    (a, b) => Math.abs(b.contribution) - Math.abs(a.contribution),
  );
  const worst = ranked.find((metric) => metric.contribution < 0);

  return (
    <View style={styles.section}>
      {/* Outside the card, matching the other two sections on Today. The label
          used to sit inside it, paired with the percentage on one row — which
          made this read as one more card among several rather than as the
          section it is. The number stays inside, where it now leads. */}
      <ThemedText type="eyebrow" themeColor="textMuted">
        Humanity progress
      </ThemedText>

      <View
        style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <View
          accessible
          accessibilityRole="progressbar"
          accessibilityValue={{ min: 0, max: 100, now: Math.round(displayScore * 100) }}
          accessibilityLabel={`Humanity progress: ${Math.round(displayScore * 100)} percent, ${isPersonal ? 'using your own weighting' : 'weighted'} across ${count} indicators.${
            worst ? ` Held down most by ${worst.label.toLowerCase()}.` : ''
          }`}
          style={styles.summary}>
          {/* Its own row so the number keeps the top-right corner it had when
              the label shared the line with it. */}
          <View style={styles.header}>
            {moved ? (
              <ValueTransition
                type="subtitle"
                previous={`${previousPercent}%`}
                current={`${percent}%`}
                // Not `accentStrong`: once there are two numbers the second one
                // is making a claim about direction, and the composite's own
                // good/bad palette is the one that says it.
                color={improved ? theme.positive : theme.decline}
              />
            ) : (
              <ThemedText type="subtitle" style={{ color: theme.accentStrong }}>
                {percent}%
              </ThemedText>
            )}
          </View>

          {/* Decorative — the wrapper above carries the value for screen readers,
              so announcing it twice would just be noise. */}
          <View
            style={[styles.track, { backgroundColor: theme.accentSoft }]}
            accessible={false}
            importantForAccessibility="no">
            <Animated.View
              style={[styles.fill, { backgroundColor: theme.accentStrong }, fillStyle]}
            />
          </View>

          {isPersonal ? (
            // Replaces the "weighted across N indicators" line rather than
            // joining it: under a personal weighting that sentence is no longer
            // the interesting fact about the number, and the default score is —
            // it is the only thing left to compare against.
            <Pressable
              accessibilityRole="button"
              accessibilityHint="Opens the screen where you set how much each category matters"
              onPress={() => router.push('/weighting')}
              hitSlop={8}
              style={styles.attribution}>
              <ThemedText type="small" themeColor="textSecondary">
                Your weighting, across {count} indicators.{' '}
              </ThemedText>
              <ThemedText type="small" themeColor="textMuted">
                Research default: {(score * 100).toFixed(2)}%
              </ThemedText>
            </Pressable>
          ) : (
            /**
             * The way in to the weighting screen, for somebody who has never
             * used it.
             *
             * This used to be a flat sentence with no link, and the Progress tab
             * carried the only entry point in the app — which meant the reader
             * most likely to disagree with this number, the one looking straight
             * at it on the home screen, had nothing to do about it. Worse, the
             * personalised version of this line *is* a link, so the affordance
             * appeared only once you no longer needed telling it existed.
             *
             * It matters more than a missing link usually would, because the
             * headline is an opinion wearing a percentage. "28.61%" is a
             * weighted judgement about which parts of human progress count, and
             * a reader who thinks climate should count double is not wrong —
             * they are the intended user of a control they could not find.
             */
            <Pressable
              accessibilityRole="button"
              accessibilityHint="Opens the screen where you set how much each category matters"
              onPress={() => router.push('/weighting')}
              hitSlop={8}
              style={styles.attribution}>
              <ThemedText type="small" themeColor="textSecondary">
                Weighted across {count} indicators
                {worst ? `, minus what we are losing on ${worst.label.toLowerCase()}` : ''}.{' '}
              </ThemedText>
              <ThemedText type="linkPrimary">Weight it your way →</ThemedText>
            </Pressable>
          )}
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: isExpanded }}
          accessibilityHint="Shows how much each indicator adds to or takes off the total"
          onPress={() => setIsExpanded((expanded) => !expanded)}
          hitSlop={8}
          style={styles.toggle}>
          <ThemedText type="linkPrimary">
            {isExpanded ? 'Hide the breakdown' : 'How is this calculated?'}
          </ThemedText>
        </Pressable>

        {isExpanded ? (
          <Animated.View
            entering={FadeIn.duration(180)}
            style={[styles.breakdown, { borderTopColor: theme.border }]}>
            {ranked.map((metric) => (
              <ContributionRow key={metric.id} metric={metric} />
            ))}

            <ThemedText type="small" themeColor="textMuted" style={styles.footnote}>
              Each indicator is scored from its own baseline to its own target, then weighted by
              importance. Detractors subtract what they cost instead of contributing a low score.
              Today&apos;s values are projected from the last measurement.
            </ThemedText>
          </Animated.View>
        ) : null}
      </View>
    </View>
  );
}

/** One indicator's signed share of the headline. */
function ContributionRow({ metric }: { metric: HumanityMetric }) {
  const theme = useTheme();
  const isNegative = metric.contribution < 0;
  const regressing = isRegressing(metric);

  const accent = isNegative ? theme.decline : theme.info;
  const points = `${isNegative ? '−' : '+'}${Math.abs(metric.contribution * 100).toFixed(1)} pts`;

  return (
    <View
      style={styles.row}
      accessible
      accessibilityLabel={`${metric.label}: ${
        isNegative ? 'taking off' : 'adding'
      } ${Math.abs(metric.contribution * 100).toFixed(1)} points. Last measured ${lastObservedYear(metric)}.`}>
      <View style={styles.rowText}>
        <ThemedText type="small" numberOfLines={1}>
          {metric.label}
        </ThemedText>
        <ThemedText type="small" themeColor="textMuted" numberOfLines={1}>
          {categoryLabel(metric.category)} · {Math.round(metric.weight * 100)}% weight ·{' '}
          {lastObservedYear(metric)}
        </ThemedText>
      </View>

      <View style={styles.rowValue}>
        <ThemedText type="small" style={{ color: accent }}>
          {points}
        </ThemedText>
        <View
          style={[styles.rowTrack, { backgroundColor: theme.backgroundElement }]}
          accessible={false}
          importantForAccessibility="no">
          <View
            style={[
              styles.rowFill,
              {
                backgroundColor: accent,
                // Same reading as the tiles: progress made when the metric is
                // improving, problem remaining when it has regressed. Floored at
                // a sliver so a bar is always visible.
                width: `${Math.max(barFill(metric.normalized, regressing) * 100, 2)}%`,
              },
            ]}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Header and card, with no padding of its own — the screen placing this owns
  // the page gutter, exactly as it does for the other two sections on Today.
  section: {
    gap: Spacing.two,
  },
  card: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  summary: {
    gap: Spacing.two,
  },
  // Holds the percentage at the end of the row, where it sat when the eyebrow
  // that has since moved out of the card was beside it.
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  // Thicker than the tiles' 6pt bars, which is most of what makes this read as
  // the summary of them rather than one more of them.
  track: {
    height: 12,
    borderRadius: Radius.pill,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: Radius.pill,
  },
  toggle: {
    alignSelf: 'flex-start',
  },
  attribution: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'baseline',
  },
  breakdown: {
    borderTopWidth: 1,
    paddingTop: Spacing.three,
    gap: Spacing.three,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  rowText: {
    flex: 1,
    gap: Spacing.half,
  },
  // Fixed rather than content-sized, so the numbers form a column instead of
  // ragging with the length of each label.
  rowValue: {
    width: 96,
    alignItems: 'flex-end',
    gap: Spacing.one,
  },
  rowTrack: {
    height: 4,
    width: '100%',
    borderRadius: Radius.pill,
    overflow: 'hidden',
  },
  rowFill: {
    height: '100%',
    borderRadius: Radius.pill,
  },
  footnote: {
    fontSize: 15,
    lineHeight: 21,
  },
});
