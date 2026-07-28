/**
 * The composite "humanity progress" score.
 *
 * Deliberately free of React, React Native, and any data access: everything
 * here is a pure function of its arguments, so the model can be tested and
 * argued with on its own. The indicator set lives in `@/constants/world-metrics`;
 * this file only knows how to score whatever it's handed.
 *
 * The shape follows the weighted/normalized approach in "Calculating Human
 * Progress" (Timeline of Technology), with one change worth stating up front:
 * that piece averages seven equally-weighted factors and lets climate change
 * enter as a negative number. Equal weights are the part that doesn't survive
 * contact with twelve indicators — mobile network coverage should not move the
 * headline as far as extreme poverty does — so weights are explicit here. The
 * detractor idea is kept intact: a metric marked `detractor` subtracts from the
 * total rather than contributing a small positive share, because "we are making
 * the climate worse" is not the same statement as "we have made a little
 * progress on the climate".
 */

export type MetricDirection = 'higher_is_better' | 'lower_is_better';

/**
 * `contributor` — progress on this adds to the score.
 * `detractor`   — failure on this subtracts from it. See `computeCompositeScore`
 *                 for exactly how much.
 */
export type MetricPolarity = 'contributor' | 'detractor';

export interface MetricConfig<Category extends string = string> {
  id: string;
  label: string;
  category: Category;

  /** Where the indicator stands now, in the same units as baseline and target. */
  currentValue: number;
  /** The 0% anchor: the reference point progress is measured from. */
  baselineValue: number;
  /** The 100% anchor: the level at which this indicator counts as solved. */
  targetValue: number;

  direction: MetricDirection;

  /**
   * Relative importance, 0–1. Authored to sum to 1 across the whole set —
   * `validateWeights` checks that, and `computeCompositeScore` explains what
   * the contributor and detractor halves of that budget each do.
   */
  weight: number;

  polarity: MetricPolarity;
}

/** One metric's share of the headline, as `computeCompositeScore` used it. */
export interface MetricContribution<Category extends string = string> {
  metric: MetricConfig<Category>;
  /** 0–1 progress from baseline to target. */
  normalized: number;
  /**
   * Signed percentage points this metric put into (or took out of) the final
   * score. Contributors are positive, detractors are zero or negative, and the
   * whole list sums to the unclamped composite.
   */
  points: number;
}

export interface CompositeBreakdown<Category extends string = string> {
  /** The headline, 0–1, after clamping. */
  score: number;
  /** Every metric's signed share, largest absolute contribution first. */
  contributions: MetricContribution<Category>[];
}

/**
 * Where `currentValue` sits between the two anchors, as 0–1.
 *
 * `(current - baseline) / (target - baseline)` already handles both directions
 * on its own — when a metric is meant to fall, both numerator and denominator
 * come out negative and the ratio is the right way up — so `direction` is not
 * arithmetic here. It's a declared intent that the anchors are checked against:
 * a metric that says `lower_is_better` while its target sits *above* its
 * baseline is a config error, and returning 0 for it is the loud, visible
 * failure. Inferring the direction from the anchors instead would silently
 * score that metric backwards, which is the failure mode this guards.
 *
 * Both ends clamp. Overshooting the target banks no credit: a solved indicator
 * is solved, and letting one run past 100% would let it pay for another's
 * failure. Falling below the baseline floors at 0 rather than going negative,
 * so a metric that has regressed past its own starting point reads as "no
 * progress" — the extra penalty for that case belongs to detractor polarity,
 * not to an unbounded normalized value.
 */
export function normalizeMetric(metric: MetricConfig): number {
  const span = metric.targetValue - metric.baselineValue;

  // A zero span has no scale to place `current` on. Nothing sensible to return,
  // so return the pessimistic end rather than inventing progress.
  if (span === 0) return 0;

  const declaredFall = metric.direction === 'lower_is_better';
  const anchorsFall = span < 0;
  if (declaredFall !== anchorsFall) return 0;

  const raw = (metric.currentValue - metric.baselineValue) / span;
  return clamp(raw, 0, 1);
}

/**
 * The headline number, 0–1.
 *
 *   score = Σ contributors (weight × normalized) / Σ contributor weights
 *         − Σ detractors  (weight × (1 − normalized))
 *
 * Three decisions are packed into that, and each is arguable:
 *
 * **Detractors subtract their shortfall, not their value.** A detractor's
 * `normalized` still reads "how close to the target" — CO₂ per person at the
 * 1.5°C-consistent level normalizes to 1. Subtracting that directly would
 * punish the metric for doing well, so what's subtracted is `1 - normalized`:
 * a detractor sitting on its target costs nothing, one sitting at (or past) its
 * baseline costs its full weight.
 *
 * **Contributor weights are renormalized by their own sum.** Weights are
 * authored to total 1 across every metric, but if detractors held part of that
 * budget while only ever subtracting, the bar could never reach 100% even in a
 * solved world — the ceiling would silently be the contributor share. Dividing
 * by the contributor total restores a reachable 100%, and leaves the detractor
 * weights meaning what they look like they mean: the share of the score that
 * failing at this is allowed to destroy.
 *
 * **The result clamps at 0.** Detractors can outweigh contributors on paper.
 * A negative score isn't a claim the model can support, and there's no bar to
 * draw for it.
 *
 * Note what this does *not* do, since the previous model did: there is no
 * worst-single-indicator term. This is a weighted sum, so eleven healthy
 * indicators can and do outvote one bad one — the detractors are the only
 * mechanism by which a single metric drags the total down disproportionately.
 * That's the article's structure, and it's why the headline reads higher than
 * the geometric-mean-and-min blend it replaces.
 */
export function computeCompositeScore(metrics: MetricConfig[]): number {
  return computeBreakdown(metrics).score;
}

/**
 * `computeCompositeScore` with each metric's share kept, for the UI to list.
 * Same arithmetic, one pass — the score is not recomputed from the parts.
 */
export function computeBreakdown<Category extends string>(
  metrics: MetricConfig<Category>[],
): CompositeBreakdown<Category> {
  const contributorWeight = metrics
    .filter((metric) => metric.polarity === 'contributor')
    .reduce((total, metric) => total + metric.weight, 0);

  const contributions = metrics.map((metric) => {
    const normalized = normalizeMetric(metric);

    // No contributors means no scale to divide by; every metric is then a
    // detractor and the score is whatever they leave of zero.
    const points =
      metric.polarity === 'contributor'
        ? contributorWeight > 0
          ? (metric.weight * normalized) / contributorWeight
          : 0
        : -(metric.weight * (1 - normalized));

    return { metric, normalized, points };
  });

  const raw = contributions.reduce((total, entry) => total + entry.points, 0);

  return {
    score: clamp(raw, 0, 1),
    contributions: [...contributions].sort(
      (a, b) => Math.abs(b.points) - Math.abs(a.points),
    ),
  };
}

/**
 * How far the authored weights are from summing to 1.
 *
 * The math doesn't require it — contributors are renormalized and detractors
 * are read as absolute shares either way — but the convention is what makes a
 * weight legible when reading the config, so drift is worth catching. Returns
 * the signed error; callers decide whether to warn or throw.
 */
export function weightError(metrics: MetricConfig[]): number {
  return metrics.reduce((total, metric) => total + metric.weight, 0) - 1;
}

function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min;
  return Math.min(max, Math.max(min, value));
}
