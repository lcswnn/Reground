import { nowcast } from '../nowcast/index.js';
import type { CompositeResult, MetricConfig, MetricContribution, Observation } from '../types.js';
import { normalizeMetric } from './normalize.js';

/**
 * The composite score.
 *
 *   score = Σ contributors (weight × normalized) / Σ contributor weights
 *         − Σ detractors  (weight × (1 − normalized))
 *
 * Three decisions, each arguable:
 *
 * **Detractors subtract their shortfall, not their value.** A detractor's
 * normalized value still reads "how close to the target", so subtracting it
 * directly would punish the metric for doing well. What is subtracted is
 * `1 − normalized`: a detractor sitting on its target costs nothing, one at its
 * baseline costs its full weight, and one that has regressed past its baseline
 * — normalized as low as −0.5 — costs up to 1.5× its weight. That last case is
 * how a worsening detractor actively drags the composite down.
 *
 * **Contributor weights are renormalized by their own sum.** Weights are
 * authored to total 1 across every metric, but if detractors held part of that
 * budget while only ever subtracting, the score could never reach 100% even in
 * a solved world. Dividing by the contributor total restores a reachable
 * ceiling and leaves detractor weights meaning what they appear to mean.
 *
 * **The floor is 0, the ceiling is 1.** Detractors can outweigh contributors on
 * paper; a negative score is not a claim this model can support. Note that this
 * clamp is on the *final* number only — it does not stop the score falling, it
 * stops it going below zero.
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

  const contributorWeight = configs
    .filter((config) => config.polarity === 'contributor')
    .reduce((total, config) => total + config.weight, 0);

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

    const contribution =
      config.polarity === 'contributor'
        ? contributorWeight > 0
          ? (config.weight * normalized) / contributorWeight
          : 0
        : -(config.weight * (1 - normalized));

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
