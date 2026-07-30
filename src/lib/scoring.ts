import type { HumanityMetric } from '@/api/humanity';

/**
 * Client-side recomputation of the composite under custom category weights.
 *
 * The server already computes the composite and ships it in the artifact. This
 * exists for one thing the server cannot do: the reader's own weighting is
 * per-device and arrives after the artifact was built, so "Your Score" has to be
 * computed here or not at all.
 *
 * ## This deliberately mirrors `data-layer/src/scoring/composite.ts`
 *
 * Same formula, same detractor handling, same clamps. Two implementations of one
 * model is a real cost and worth naming: if you change the maths there, change
 * it here. The alternative — shipping every metric's raw series to the client
 * and scoring from scratch — is a much larger payload and a second place for the
 * *normalisation* to drift, which is worse.
 *
 * The guard against drift is `defaultWeightsMatchArtifact`, which recomputes the
 * server's own number from its own inputs and compares. It runs in the test
 * suite against a real artifact, so a change on one side fails CI rather than
 * silently showing two different scores on one screen.
 *
 * ## What is NOT recomputed here
 *
 * `normalized` — how far a metric sits between its baseline and its target — is
 * taken from the artifact as given. It depends on the nowcast, the trailing
 * window, the observed/projected split and the anchors, none of which the client
 * has. Reweighting changes how much each metric *counts*, never what it says.
 */

export type CategoryWeights = Record<string, number>;

/** The subset of a metric this module needs. Keeps the tests free of fixtures. */
export interface ScorableMetric {
  id: string;
  category: string;
  /** Default weight from the artifact. Relative size within a category. */
  weight: number;
  normalized: number;
  polarity: 'contributor' | 'detractor';
}

export interface CategoryBreakdown {
  categoryId: string;
  /**
   * Weighted mean of the category's metric `normalized` values, 0–100.
   *
   * Presented per category on the weighting screen so a slider has something to
   * be about. Note this is a plain average of progress within the category and
   * is *not* the category's contribution to the composite — detractors subtract
   * there and merely score low here.
   */
  score: number;
  /** Share of the composite this category actually took, after normalisation. */
  effectiveWeight: number;
  metricCount: number;
}

export interface CompositeResult {
  /** 0–1, matching the artifact's `compositeScore`. */
  score: number;
  categories: CategoryBreakdown[];
}

/**
 * Rescales metric weights so each category totals the weight the reader gave it.
 *
 * Within a category the metrics keep their relative proportions — a reader
 * saying "health matters twice as much to me" is not also saying "and child
 * mortality should matter more than life expectancy than it did". That split is
 * an editorial judgement in the data layer and stays there.
 *
 * Categories with no metrics are skipped in *both* sums, so an empty category
 * cannot silently drain weight from the ones that have data. This is why
 * `freedom_rights` at 10% does not depress the score while it holds a single
 * series, and why a reader can set a weight on a category that has nothing in it
 * yet without breaking the total.
 */
function rescaleWeights(
  metrics: ScorableMetric[],
  categoryWeights: CategoryWeights,
): Map<string, number> {
  const defaultTotals = new Map<string, number>();
  for (const metric of metrics) {
    defaultTotals.set(metric.category, (defaultTotals.get(metric.category) ?? 0) + metric.weight);
  }

  // Only categories that have metrics carrying weight can receive a share.
  // A category whose metrics all sit at weight 0 — `disease-outbreaks` is the
  // live example — has nothing to scale, and dividing by its zero total would
  // produce Infinity.
  let liveWeightTotal = 0;
  for (const [category, total] of defaultTotals) {
    if (total <= 0) continue;
    liveWeightTotal += Math.max(0, categoryWeights[category] ?? 0);
  }

  const scaled = new Map<string, number>();

  // Every live category was given zero. There is no meaningful composite to
  // report, and returning zero weights lets the caller render 0% rather than
  // NaN — which is the honest answer to "score the world by nothing".
  if (liveWeightTotal <= 0) {
    for (const metric of metrics) scaled.set(metric.id, 0);
    return scaled;
  }

  for (const metric of metrics) {
    const defaultTotal = defaultTotals.get(metric.category) ?? 0;
    const requested = Math.max(0, categoryWeights[metric.category] ?? 0);

    if (defaultTotal <= 0 || requested <= 0) {
      scaled.set(metric.id, 0);
      continue;
    }

    // targetShare is the category's slice of 1.0; the metric takes its own
    // proportion of that slice.
    const targetShare = requested / liveWeightTotal;
    scaled.set(metric.id, (metric.weight / defaultTotal) * targetShare);
  }

  return scaled;
}

/**
 * The composite, under the given category weights.
 *
 *   score = Σ contributors (weight × normalized) / Σ contributor weights
 *         − Σ detractors  (weight × (1 − normalized))
 *
 * Detractors subtract their *shortfall*, not their value: one sitting on its
 * target costs nothing, one at its baseline costs its full weight, and one that
 * has regressed past its baseline — `normalized` as low as −0.5 — costs up to
 * 1.5× its weight. That is how the score falls when the world gets worse, and it
 * is the reason this model is not a plain weighted average.
 *
 * Contributor weights are renormalised by their own sum so a solved world can
 * still reach 100% even though detractors hold part of the weight budget.
 *
 * The final clamp to 0–1 is on the total only. It does not stop the score
 * falling; it stops it going negative, which is not a claim this model supports.
 */
export function computeComposite(
  metrics: ScorableMetric[],
  categoryWeights: CategoryWeights,
): CompositeResult {
  const weights = rescaleWeights(metrics, categoryWeights);

  let contributorWeight = 0;
  for (const metric of metrics) {
    if (metric.polarity === 'contributor') contributorWeight += weights.get(metric.id) ?? 0;
  }

  let raw = 0;
  for (const metric of metrics) {
    const weight = weights.get(metric.id) ?? 0;
    if (weight === 0) continue;

    raw +=
      metric.polarity === 'contributor'
        ? contributorWeight > 0
          ? (weight * metric.normalized) / contributorWeight
          : 0
        : -(weight * (1 - metric.normalized));
  }

  return {
    score: Math.min(1, Math.max(0, raw)),
    categories: summariseCategories(metrics, weights),
  };
}

function summariseCategories(
  metrics: ScorableMetric[],
  weights: Map<string, number>,
): CategoryBreakdown[] {
  const grouped = new Map<string, ScorableMetric[]>();
  for (const metric of metrics) {
    const bucket = grouped.get(metric.category) ?? [];
    bucket.push(metric);
    grouped.set(metric.category, bucket);
  }

  const out: CategoryBreakdown[] = [];

  for (const [categoryId, bucket] of grouped) {
    // Weighted by the metrics' own default weights, not a flat mean: within
    // health, child mortality is authored to matter more than vaccination
    // coverage, and a flat average would throw that away. Falls back to a flat
    // mean when every metric in the category sits at weight 0, so a category
    // holding only unscored metrics still reports a readable score.
    const totalWeight = bucket.reduce((sum, metric) => sum + metric.weight, 0);
    const score =
      totalWeight > 0
        ? bucket.reduce((sum, metric) => sum + metric.normalized * metric.weight, 0) / totalWeight
        : bucket.reduce((sum, metric) => sum + metric.normalized, 0) / bucket.length;

    out.push({
      categoryId,
      score: score * 100,
      effectiveWeight: bucket.reduce((sum, metric) => sum + (weights.get(metric.id) ?? 0), 0),
      metricCount: bucket.length,
    });
  }

  return out;
}

/** Narrows artifact metrics to what `computeComposite` needs. */
export function toScorable(metrics: HumanityMetric[]): ScorableMetric[] {
  return metrics.map((metric) => ({
    id: metric.id,
    category: metric.category,
    weight: metric.weight,
    normalized: metric.normalized,
    polarity: metric.polarity,
  }));
}

/** Category weights derived from the artifact itself, for "reset to defaults". */
export function defaultWeightsFrom(metrics: ScorableMetric[]): CategoryWeights {
  const weights: CategoryWeights = {};
  for (const metric of metrics) {
    weights[metric.category] = (weights[metric.category] ?? 0) + metric.weight;
  }
  return weights;
}

/**
 * True when a reader's weights are the defaults, within a tolerance.
 *
 * Drives whether the home screen shows one score or two — an untouched reader
 * should not be shown "Your Score" next to an identical "Humanity Score".
 * Tolerant rather than exact because weights round-trip through JSON and a
 * slider emits floats.
 */
export function isDefaultWeighting(
  weights: CategoryWeights,
  defaults: CategoryWeights,
  tolerance = 0.005,
): boolean {
  const keys = new Set([...Object.keys(weights), ...Object.keys(defaults)]);
  for (const key of keys) {
    if (Math.abs((weights[key] ?? 0) - (defaults[key] ?? 0)) > tolerance) return false;
  }
  return true;
}
