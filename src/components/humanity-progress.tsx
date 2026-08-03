import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import type { HumanityArtifact, HumanityMetric } from "@/api/humanity";
import { barFill, isRegressing, lastObservedYear } from "@/api/humanity";
import { ThemedText } from "@/components/themed-text";
import { Button } from "@/components/ui/button";
import { Radius, Spacing } from "@/constants/theme";
import { categoryLabel, normalizeCategory } from "@/constants/world-metrics";
import { useTheme } from "@/hooks/use-theme";
import {
  computeComposite,
  defaultWeightsFrom,
  toScorable,
  type MetricShare,
} from "@/lib/scoring";
import { useWeightingControls } from "@/state/weighting";

/** Slower than a tile's bar: this one is the headline, so it takes its time. */
const FILL_DURATION = 1100;

interface HumanityProgressProps {
  artifact: HumanityArtifact;
  /** False parks the bar empty — same contract as the tiles below it. */
  active?: boolean;
}

/**
 * Every indicator, weighted into one bar — by the reader, or not at all.
 *
 * ## There is no default number here, on purpose
 *
 * A composite of nineteen indicators is not a measurement, it is an argument
 * about which parts of human progress count. The data layer has to pick some
 * weighting to publish an artifact at all, but shipping that number as *the*
 * answer told every reader what to think progress was before they had been
 * asked. "35.80%" is an opinion wearing a percentage.
 *
 * So the card holds an empty bar and an invitation until the reader has said
 * what matters to them, and only then does it hold a score. The number that
 * appears is theirs. `artifact.compositeScore` is deliberately not read by this
 * component, and it is not shown on the weighting screen either — the data
 * layer's weights survive only as the positions the sliders open at, which is
 * not a claim about anything and is never scored as one.
 *
 * The score is computed here rather than served because a weighting is
 * per-device and arrives long after the artifact was built. It runs through
 * `computeComposite`, the same maths the data layer ran, guarded against drift
 * by a test that reproduces the published score from the published inputs.
 *
 * ## The breakdown
 *
 * Hidden until there is a weighting, for the same reason the headline is: each
 * row's contribution is a weighting expressed per indicator, so showing it
 * first would assert through the back door exactly what the headline stopped
 * asserting.
 *
 * Once shown it exists because a number like this is a claim that ought to show
 * its work, and because it is the only place an indicator going backwards is
 * visible as such. A negative contribution means *regressed past its own
 * baseline*, not "detractor" — since the composite became polarity-blind, a
 * detractor sitting on its target earns its full weight like anything else.
 */
export function HumanityProgress({
  artifact,
  active = true,
}: HumanityProgressProps) {
  const theme = useTheme();
  const fill = useSharedValue(0);
  const [isExpanded, setIsExpanded] = useState(false);

  const metrics = useMemo(
    () =>
      toScorable(artifact.metrics).map((metric) => ({
        ...metric,
        category: normalizeCategory(metric.category),
      })),
    [artifact],
  );

  // Still derived from the artifact, and still the starting position of the
  // sliders — a reader has to be given something to move. It is just no longer
  // scored on their behalf before they have moved it.
  const defaults = useMemo(() => defaultWeightsFrom(metrics), [metrics]);
  const { weights, isCustomised } = useWeightingControls(defaults);

  // `isCustomised` is "a weighting has been saved", and the weighting screen
  // only saves one when the reader actually moved a slider — clearing instead
  // when the draft still matches the positions the sliders opened at. So this
  // is false in exactly the cases where there is no answer to show: a reader
  // who has never been to the sliders, and one who cleared what they had.
  const result = useMemo(
    () => (isCustomised ? computeComposite(metrics, weights) : null),
    [isCustomised, weights, metrics],
  );
  const score = result?.score ?? null;
  const hasWeighting = score !== null;

  useEffect(() => {
    fill.value =
      active && score !== null
        ? withTiming(score, {
            duration: FILL_DURATION,
            easing: Easing.out(Easing.cubic),
          })
        : 0;
  }, [active, fill, score]);

  const fillStyle = useAnimatedStyle(() => ({ width: `${fill.value * 100}%` }));

  // Two decimals: at this scale a whole point is a huge move, so rounding to an
  // integer froze the number for weeks at a time.
  const percent = score === null ? null : (score * 100).toFixed(2);
  const count = artifact.metrics.length;

  // Under the reader's own weighting, not the artifact's. The artifact's
  // `contribution` field is each metric's share of the *research* score, so
  // ranking by it would open the breakdown on whatever moves a number that is
  // no longer on screen.
  const shareById = useMemo(
    () =>
      new Map(
        (result?.contributions ?? []).map((entry) => [entry.metricId, entry]),
      ),
    [result],
  );

  // Sorted by absolute impact so the breakdown opens on whatever is moving the
  // number most, in either direction.
  const ranked = useMemo(() => {
    const impact = (metric: HumanityMetric) =>
      Math.abs(shareById.get(metric.id)?.contribution ?? 0);
    return [...artifact.metrics].sort((a, b) => impact(b) - impact(a));
  }, [artifact.metrics, shareById]);

  const worst = ranked.find(
    (metric) => (shareById.get(metric.id)?.contribution ?? 0) < 0,
  );

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
        style={[
          styles.card,
          { backgroundColor: theme.surface, borderColor: theme.border },
        ]}
      >
        {hasWeighting ? (
          <View
            accessible
            accessibilityRole="progressbar"
            accessibilityValue={{
              min: 0,
              max: 100,
              now: Math.round(score * 100),
            }}
            accessibilityLabel={`Humanity progress: ${Math.round(score * 100)} percent, using your own weighting across ${count} indicators.${
              worst ? ` Held down most by ${worst.label.toLowerCase()}.` : ""
            }`}
            style={styles.summary}
          >
            {/* Its own row so the number keeps the top-right corner it had when
                the label shared the line with it. */}
            <View style={styles.header}>
              <ThemedText type="subtitle" style={{ color: theme.accentStrong }}>
                {percent}%
              </ThemedText>
            </View>

            {/* Decorative — the wrapper above carries the value for screen
                readers, so announcing it twice would just be noise. */}
            <View
              style={[styles.track, { backgroundColor: theme.accentSoft }]}
              accessible={false}
              importantForAccessibility="no"
            >
              <Animated.View
                style={[
                  styles.fill,
                  { backgroundColor: theme.accentStrong },
                  fillStyle,
                ]}
              />
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityHint="Opens the screen where you set how much each category matters"
              onPress={() => router.push("/weighting")}
              hitSlop={8}
              style={styles.attribution}
            >
              <ThemedText type="small" themeColor="textSecondary">
                Your weighting, across {count} indicators.{" "}
              </ThemedText>
              <ThemedText type="linkPrimary">Change it →</ThemedText>
            </Pressable>
          </View>
        ) : (
          /**
           * No score yet, and no stand-in for one.
           *
           * The empty track is doing real work: it says a number belongs here
           * and is waiting on the reader, where dropping it entirely would make
           * the card read as a feature ad. What it must not do is show a
           * placeholder value — a greyed or blurred percentage would still be
           * this app telling someone what progress looks like, which is the
           * thing being removed.
           */
          <View style={styles.summary}>
            <ThemedText type="subtitle">
              What does progress mean to you?
            </ThemedText>

            <View
              style={[styles.track, { backgroundColor: theme.accentSoft }]}
              accessible={false}
              importantForAccessibility="no"
            />

            <ThemedText type="small" themeColor="textSecondary">
              {count} indicators, measured from their own baselines toward their
              own targets. What they add up to depends on what you think matters
              — so you decide how much each one counts.
            </ThemedText>

            <Button
              title="Weight what matters to you"
              accessibilityHint="Opens the screen where you set how much each category matters"
              onPress={() => router.push("/weighting")}
            />
          </View>
        )}

        {/* Both the toggle and the rows are withheld until there is a weighting.
            Each row's contribution is a weighting expressed per indicator, so
            offering it first would assert through the back door precisely what
            the headline above stopped asserting. */}
        {hasWeighting ? (
          <>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ expanded: isExpanded }}
              accessibilityHint="Shows how much each indicator adds to or takes off the total"
              onPress={() => setIsExpanded((expanded) => !expanded)}
              hitSlop={8}
              style={styles.toggle}
            >
              <ThemedText type="linkPrimary">
                {isExpanded ? "Hide the breakdown" : "How is this calculated?"}
              </ThemedText>
            </Pressable>

            {isExpanded ? (
              <Animated.View
                entering={FadeIn.duration(180)}
                style={[styles.breakdown, { borderTopColor: theme.border }]}
              >
                {ranked.map((metric) => (
                  <ContributionRow
                    key={metric.id}
                    metric={metric}
                    share={shareById.get(metric.id) ?? null}
                  />
                ))}

                <ThemedText
                  type="small"
                  themeColor="textMuted"
                  style={styles.footnote}
                >
                  Each indicator is scored from its own baseline to its own
                  target, then averaged by the weight you gave its category. An
                  indicator that has gone backwards past its own baseline scores
                  below zero and pulls the total down. Today&apos;s values are
                  projected from the last measurement.
                </ThemedText>
              </Animated.View>
            ) : null}
          </>
        ) : null}
      </View>
    </View>
  );
}

/**
 * One indicator's signed share of the headline, under the reader's weighting.
 *
 * `share` comes from `computeComposite` rather than from the artifact, so the
 * points here add up to the number above them. A null share means the metric was
 * not in the artifact's scored set at all, which should not happen — it is
 * rendered as unmeasured rather than as zero progress.
 */
function ContributionRow({
  metric,
  share,
}: {
  metric: HumanityMetric;
  share: MetricShare | null;
}) {
  const theme = useTheme();
  const regressing = isRegressing(metric);
  const hasData = share?.hasData ?? false;
  const contribution = share?.contribution ?? 0;
  const isNegative = contribution < 0;

  const accent = !hasData
    ? theme.textMuted
    : isNegative
      ? theme.decline
      : theme.info;
  const points = hasData
    ? `${isNegative ? "−" : "+"}${Math.abs(contribution * 100).toFixed(1)} pts`
    : "No data";

  // Rounds to nothing at all for a metric the reader has weighted near zero,
  // and "0% of your weighting" is the honest reading of that rather than a
  // rounding artefact worth hiding.
  const weightLabel = `${Math.round((share?.weight ?? 0) * 100)}% of your weighting`;

  return (
    <View
      style={styles.row}
      accessible
      accessibilityLabel={
        hasData
          ? `${metric.label}: ${
              isNegative ? "taking off" : "adding"
            } ${Math.abs(contribution * 100).toFixed(1)} points. Last measured ${lastObservedYear(metric)}.`
          : `${metric.label}: no data yet, not counted in your score.`
      }
    >
      <View style={styles.rowText}>
        <ThemedText type="small" numberOfLines={1}>
          {metric.label}
        </ThemedText>
        <ThemedText type="small" themeColor="textMuted" numberOfLines={1}>
          {categoryLabel(metric.category)} · {weightLabel} ·{" "}
          {lastObservedYear(metric)}
        </ThemedText>
      </View>

      <View style={styles.rowValue}>
        <ThemedText type="small" style={{ color: accent }}>
          {points}
        </ThemedText>
        <View
          style={[
            styles.rowTrack,
            { backgroundColor: theme.backgroundElement },
          ]}
          accessible={false}
          importantForAccessibility="no"
        >
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
  },
  // Thicker than the tiles' 6pt bars, which is most of what makes this read as
  // the summary of them rather than one more of them.
  track: {
    height: 12,
    borderRadius: Radius.pill,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: Radius.pill,
  },
  toggle: {
    alignSelf: "flex-start",
  },
  attribution: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "baseline",
  },
  breakdown: {
    borderTopWidth: 1,
    paddingTop: Spacing.three,
    gap: Spacing.three,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
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
    alignItems: "flex-end",
    gap: Spacing.one,
  },
  rowTrack: {
    height: 4,
    width: "100%",
    borderRadius: Radius.pill,
    overflow: "hidden",
  },
  rowFill: {
    height: "100%",
    borderRadius: Radius.pill,
  },
  footnote: {
    fontSize: 18,
    lineHeight: 21,
  },
});
