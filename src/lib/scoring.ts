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
 * Same formula, same weight rescaling, same clamps. Two implementations of one
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
  /**
   * Whether the metric could be scored at all.
   *
   * False means `normalized` is a placeholder zero, not a reading. Such a metric
   * is dropped before the weights are rescaled, so its share redistributes
   * across the metrics that do have data rather than counting as no progress.
   */
  hasData: boolean;
  polarity: 'contributor' | 'detractor';
}

export interface CategoryBreakdown {
  categoryId: string;
  /**
   * Weighted mean of the category's scored `normalized` values, 0–100.
   *
   * Presented per category on the weighting screen so a slider has something to
   * be about. Since aggregation is polarity-blind this *is* the category's
   * contribution to the composite, weighted by `effectiveWeight` — the two are
   * one number now, where under the old detractor handicap they were not.
   *
   * Metrics with no data are left out, so this reads over the same set the
   * composite scored.
   */
  score: number;
  /** Share of the composite this category actually took, after normalisation. */
  effectiveWeight: number;
  /** How many of the category's metrics were actually scored. */
  metricCount: number;
  /** How many were skipped for want of data. Sums with `metricCount`. */
  unscoredMetricCount: number;
}

/** One metric's signed share of the score, under the weighting that produced it. */
export interface MetricShare {
  metricId: string;
  /**
   * `scaled weight × normalized`. Shares sum to the unclamped score.
   *
   * Recomputed rather than taken from the artifact's own `contribution`, which
   * is the share under the *research* weighting. A breakdown itemising one
   * weighting beneath a headline computed from another does not add up, and the
   * reader who opened it is exactly the one who would check.
   */
  contribution: number;
  /**
   * The metric's rescaled weight — its actual share of the reader's budget,
   * summing to 1 across scored metrics. Not the artifact's default weight.
   */
  weight: number;
  /** False when the metric had no data and was left out of the score entirely. */
  hasData: boolean;
}

export interface CompositeResult {
  /** 0–1, matching the artifact's `compositeScore`. */
  score: number;
  /**
   * Fraction of the total configured weight that had data behind it.
   *
   * Weight rather than count, for the same reason the data layer reports it that
   * way: one missing heavy metric is not four missing trivial ones.
   */
  coverage: number;
  categories: CategoryBreakdown[];
  /**
   * Every metric, scored or not, ordered as supplied.
   *
   * Unscored metrics appear carrying 0 so a breakdown can render "no data yet"
   * rather than dropping them silently — the same contract the data layer's
   * `perMetricContributions` keeps.
   */
  contributions: MetricShare[];
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
 *   score = Σ (scaled weight × normalized)
 *
 * `rescaleWeights` makes the scaled weights sum to 1 across live categories, so
 * this is a plain weighted mean of per-metric progress — a dot product, nothing
 * more.
 *
 * **Aggregation is polarity-blind, and must stay that way.** `normalized` is
 * already direction-corrected upstream, in `data-layer/src/scoring/normalize.ts`:
 * progress is `(value − baseline) / (target − baseline)` with a *signed* span,
 * so a metric that has to fall has a negative span and a negative numerator and
 * still reads positive when it improves. A detractor on target and a contributor
 * on target both read `1`; both at baseline both read `0`. There is no
 * directional difference left for this function to resolve.
 *
 * An earlier version charged detractors `(weight × normalized) − weight`. That
 * was not a second look at direction, it was a flat handicap — an
 * all-at-baseline world scored `−Σ detractor weights` and only read as 0%
 * because the clamp hid it, and an all-detractor weighting had an arithmetic
 * ceiling of 0% even with every indicator exactly on target. This is the thing a
 * future reader is most likely to "fix" back. Don't.
 *
 * **The clamp is a safety rail, not model logic.** Scaled weights sum to 1 and
 * `normalized` is bounded to `[-0.5, 1]` by the data layer, so the pre-clamp
 * total is provably within `[-0.5, 1]`. `Math.min(1, …)` cannot fire and is kept
 * as defensive code only; `Math.max(0, …)` is the one that can, and only when
 * metrics have regressed past their own baselines.
 *
 * **Metrics with no data are excluded from both sums.** They are filtered out
 * before the weights are rescaled, so their share redistributes across the
 * metrics that do have data instead of vanishing into the denominator as zero
 * progress. `coverage` reports how much of the weight budget that left.
 */
export function computeComposite(
  metrics: ScorableMetric[],
  categoryWeights: CategoryWeights,
): CompositeResult {
  const scored = metrics.filter((metric) => metric.hasData);
  const weights = rescaleWeights(scored, categoryWeights);
  const raw = weightedMean(scored, weights);

  const configuredWeight = metrics.reduce((total, metric) => total + metric.weight, 0);
  const scoredWeight = scored.reduce((total, metric) => total + metric.weight, 0);

  return {
    score: Math.min(1, Math.max(0, raw)),
    coverage: configuredWeight > 0 ? scoredWeight / configuredWeight : 0,
    // Every metric, not just the scored ones — a category needs to be able to
    // say how many of its indicators are waiting on data.
    categories: summariseCategories(metrics, weights),
    contributions: metrics.map((metric) => {
      const weight = metric.hasData ? (weights.get(metric.id) ?? 0) : 0;
      return {
        metricId: metric.id,
        contribution: weight * metric.normalized,
        weight,
        hasData: metric.hasData,
      };
    }),
  };
}

function weightedMean(metrics: ScorableMetric[], weights: Map<string, number>): number {
  let raw = 0;
  for (const metric of metrics) {
    raw += (weights.get(metric.id) ?? 0) * metric.normalized;
  }
  return raw;
}

/**
 * The composite before the clamp.
 *
 * Exported so the bounding argument above is testable rather than merely
 * asserted: `raw <= 1` has to hold for every input — which is what makes
 * `Math.min(1, …)` unreachable — and `raw < 0` has to stay reachable, which is
 * what makes `Math.max(0, …)` the clamp that does the work.
 *
 * Not used to render anything. The number on screen is always the clamped one.
 */
export function unclampedComposite(
  metrics: ScorableMetric[],
  categoryWeights: CategoryWeights,
): number {
  const scored = metrics.filter((metric) => metric.hasData);
  return weightedMean(scored, rescaleWeights(scored, categoryWeights));
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
    // Only metrics that could be scored. A metric waiting on data has a
    // placeholder 0 in `normalized`, and averaging that in would report the
    // category as making no progress on something it has not measured.
    const scored = bucket.filter((metric) => metric.hasData);

    // Weighted by the metrics' own default weights, not a flat mean: within
    // health, child mortality is authored to matter more than vaccination
    // coverage, and a flat average would throw that away. Falls back to a flat
    // mean when every scored metric in the category sits at weight 0, so a
    // category holding only zero-weight metrics still reports a readable score.
    const totalWeight = scored.reduce((sum, metric) => sum + metric.weight, 0);
    const score =
      scored.length === 0
        ? 0
        : totalWeight > 0
          ? scored.reduce((sum, metric) => sum + metric.normalized * metric.weight, 0) / totalWeight
          : scored.reduce((sum, metric) => sum + metric.normalized, 0) / scored.length;

    out.push({
      categoryId,
      score: score * 100,
      effectiveWeight: bucket.reduce((sum, metric) => sum + (weights.get(metric.id) ?? 0), 0),
      metricCount: scored.length,
      unscoredMetricCount: bucket.length - scored.length,
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
    // Absent on artifacts published before the field existed. Those only ever
    // carried metrics that had been scored, so `true` is the right reading.
    hasData: metric.hasData ?? true,
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
