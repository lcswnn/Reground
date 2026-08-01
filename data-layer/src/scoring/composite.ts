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
  contributions: MetricContribution[];
} {
  const { configs, observations, asOf } = inputs;

  const totalWeight = configs.reduce((total, config) => total + config.weight, 0);

  const contributions: MetricContribution[] = configs.map((config) => {
    const series = observations.get(config.id) ?? [];

    let normalized = 0;
    if (series.length > 0) {
      const projection = nowcast(series, asOf, {
        method: config.nowcastMethod,
        trailingWindowYears: config.trailingWindowYears,
      });
      normalized = normalizeMetric(config, projection.value);
    }

    // Dividing by the total is what makes the scaled weights sum to 1, so the
    // sum below is a weighted mean rather than a weighted total.
    const contribution = totalWeight > 0 ? (config.weight * normalized) / totalWeight : 0;

    return {
      metricId: config.id,
      label: config.label,
      normalized,
      contribution,
      weight: config.weight,
      polarity: config.polarity,
    };
  });

  const raw = contributions.reduce((total, entry) => total + entry.contribution, 0);

  return { score: Math.min(1, Math.max(0, raw)), contributions };
}

/** Below this, week-on-week movement is noise in the projection, not news. */
const FLAT_THRESHOLD = 0.0005;

export function computeCompositeScore(inputs: ScoreInputs): CompositeResult {
  const { score, contributions } = scoreAt(inputs);

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
    perMetricContributions: [...contributions].sort(
      (a, b) => Math.abs(b.contribution) - Math.abs(a.contribution),
    ),
    direction,
    deltaVsLastWeek,
    deltaVsLastMonth,
  };
}

/**
 * A past date can predate a metric's first observation, which `nowcast` refuses
 * to project from. That is a missing delta, not a failed run.
 */
function safeScoreAt(inputs: ScoreInputs): number | null {
  try {
    return scoreAt(inputs).score;
  } catch {
    return null;
  }
}

function shiftDays(date: Date, days: number): Date {
  const shifted = new Date(date);
  shifted.setDate(shifted.getDate() + days);
  return shifted;
}
