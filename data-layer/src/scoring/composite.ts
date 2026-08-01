import { nowcast } from '../nowcast/index.js';
import type { CompositeResult, MetricConfig, MetricContribution, Observation } from '../types.js';
import { normalizeMetric } from './normalize.js';

/**
 * The composite score.
 *
 *   score = Σ (scaled weight × normalized)
 *
 * where the scaled weights sum to 1 across the scored metrics. It is a plain
 * weighted mean of per-metric progress, and nothing more.
 *
 * **Aggregation is polarity-blind, and must stay that way.** `normalized` is
 * already direction-corrected upstream — see `normalize.ts`, where progress is
 * measured as `(value − baseline) / (target − baseline)` and the span is
 * *signed*. A metric that has to fall has a negative span and a negative
 * numerator, so an improving value still reads positive. A detractor sitting on
 * its target and a contributor sitting on its target both read `1`; both at
 * their baselines both read `0`.
 *
 * So there is no directional difference left to resolve here. An earlier
 * version charged detractors `(weight × normalized) − weight`, which is not a
 * second look at direction but a flat handicap: an all-at-baseline world scored
 * `−Σ detractor weights` and only read as 0% because the clamp hid it, and a
 * detractor-only weighting had an arithmetic ceiling of 0% even with every
 * indicator exactly on target. This matches standard practice — OECD/JRC, HDI
 * and the Social Progress Index all resolve direction during normalisation and
 * then aggregate with a plain weighted mean.
 *
 * This is the thing a future reader is most likely to "fix" back. Don't.
 *
 * **The clamp is a safety rail, not model logic.** Scaled weights sum to 1 and
 * `normalizeMetric` bounds every value to `[NORMALIZED_FLOOR, NORMALIZED_CEILING]`
 * = `[-0.5, 1]`. A weighted mean of values in that range is in that range, so
 * the pre-clamp total is provably within `[-0.5, 1]`: `Math.min(1, …)` cannot
 * fire and is kept as defensive code only. `Math.max(0, …)` is the one that can,
 * and only when metrics have regressed past their own baselines — a negative
 * score is not a claim this model supports.
 *
 * Mirrored in `src/lib/scoring.ts`, which re-scores under reader-chosen category
 * weights. The two are one model and change together; `defaultWeightsMatchArtifact`
 * is the guard.
 */

export interface ScoreInputs {
  configs: MetricConfig[];
  /** Full observed history per metric id. */
  observations: Map<string, Observation[]>;
  asOf: Date;
}

/** The score at a single instant, with each metric's share. */
export function scoreAt(inputs: ScoreInputs): {
  score: number;
  coverage: number;
  contributions: MetricContribution[];
} {
  const { configs, observations, asOf } = inputs;

  // Pass one: place each metric on its scale, or record that it cannot be
  // placed. This has to finish before any weight total is taken, because the
  // denominator is the weight of the metrics that *did* land.
  const scored = configs.map((config) => {
    const series = observations.get(config.id) ?? [];
    if (series.length === 0) return { config, normalized: 0, hasData: false };

    let projected: number;
    try {
      projected = nowcast(series, asOf, {
        method: config.nowcastMethod,
        trailingWindowYears: config.trailingWindowYears,
      }).value;
    } catch {
      // `nowcast` refuses to project from a date before a metric's own first
      // observation. Caught here rather than at the call site so that one short
      // series marks itself unscored for that instant instead of taking the
      // whole week-over-week delta down with it.
      return { config, normalized: 0, hasData: false };
    }

    // Deliberately outside the try: `normalizeMetric` throws on a
    // direction/anchor contradiction, which is a config bug and must stay loud
    // rather than being laundered into "no data".
    const normalized = normalizeMetric(config, projected);
    if (normalized === null) return { config, normalized: 0, hasData: false };

    return { config, normalized, hasData: true };
  });

  // Pass two: the denominator is the weight that was actually scored. An
  // unmeasured metric leaves both sums rather than contributing zero progress.
  const scoredWeight = scored.reduce(
    (total, entry) => (entry.hasData ? total + entry.config.weight : total),
    0,
  );
  const configuredWeight = configs.reduce((total, config) => total + config.weight, 0);

  const contributions: MetricContribution[] = scored.map(({ config, normalized, hasData }) => ({
    metricId: config.id,
    label: config.label,
    normalized,
    // Unscored metrics stay in the list carrying 0 so the UI can say "no data
    // yet" instead of dropping them silently. They are already out of the
    // denominator, so this is presentation, not scoring.
    contribution: hasData && scoredWeight > 0 ? (config.weight * normalized) / scoredWeight : 0,
    weight: config.weight,
    hasData,
    polarity: config.polarity,
  }));

  const raw = contributions.reduce((total, entry) => total + entry.contribution, 0);

  return {
    score: Math.min(1, Math.max(0, raw)),
    // Fraction of *weight*, not of count: four missing trivial metrics are a
    // different story from one missing heavy one.
    coverage: configuredWeight > 0 ? scoredWeight / configuredWeight : 0,
    contributions,
  };
}

/** Below this, week-on-week movement is noise in the projection, not news. */
const FLAT_THRESHOLD = 0.0005;

export function computeCompositeScore(inputs: ScoreInputs): CompositeResult {
  const { score, coverage, contributions } = scoreAt(inputs);

  const weekAgo = shiftDays(inputs.asOf, -7);
  const monthAgo = shiftDays(inputs.asOf, -30);

  // Recomputed by re-running the whole model at a past date rather than by
  // storing yesterday's score. That means a config change — a retuned weight, a
  // corrected baseline — moves the deltas too, instead of leaving a jump
  // against a number computed under different rules.
  const lastWeek = safeScoreAt({ ...inputs, asOf: weekAgo });
  const lastMonth = safeScoreAt({ ...inputs, asOf: monthAgo });

  const deltaVsLastWeek = lastWeek === null ? null : score - lastWeek;
  const deltaVsLastMonth = lastMonth === null ? null : score - lastMonth;

  const direction =
    deltaVsLastWeek === null || Math.abs(deltaVsLastWeek) < FLAT_THRESHOLD
      ? 'flat'
      : deltaVsLastWeek > 0
        ? 'up'
        : 'down';

  return {
    score,
    coverage,
    perMetricContributions: [...contributions].sort(
      (a, b) => Math.abs(b.contribution) - Math.abs(a.contribution),
    ),
    direction,
    deltaVsLastWeek,
    deltaVsLastMonth,
  };
}

/**
 * The score at a past date, or null when there is nothing to score it over.
 *
 * A past date can predate a metric's first observation, which `nowcast` refuses
 * to project from. That is now handled per metric inside `scoreAt` — the metric
 * marks itself unscored for that instant and the rest of the model still
 * produces a number, so one short series no longer takes the whole delta out.
 *
 * Null is reserved for the case where *nothing* had history yet. A composite
 * over zero weight is 0 by arithmetic rather than by finding, and differencing
 * against it would report the arrival of data as a collapse.
 *
 * The try/catch remains for the direction/anchor contradiction, which
 * `normalizeMetric` throws. `validateMetricConfigs` should have caught that at
 * config load, so this should be unreachable.
 */
function safeScoreAt(inputs: ScoreInputs): number | null {
  try {
    const { score, coverage } = scoreAt(inputs);
    return coverage > 0 ? score : null;
  } catch {
    return null;
  }
}

function shiftDays(date: Date, days: number): Date {
  const shifted = new Date(date);
  shifted.setDate(shifted.getDate() + days);
  return shifted;
}
