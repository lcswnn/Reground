import type { MetricConfig } from '../types.js';

/**
 * Progress from baseline toward target, as a number that can go negative.
 *
 * The asymmetry is deliberate and is the reason the composite can fall:
 *
 *   upper bound 1.0   — a solved indicator is solved. Overshooting the target
 *                       banks no credit, because letting one metric run past
 *                       100% would let it pay for another's failure.
 *   lower bound -0.5  — a metric that has regressed *past its own baseline* is
 *                       not making zero progress, it is making negative
 *                       progress, and the score must be able to say so. The
 *                       floor exists only so one catastrophic metric cannot
 *                       drive the whole composite to zero on its own; it does
 *                       not prevent downward pressure, it bounds it.
 *
 * This is the single most important behavioural difference from the previous
 * implementation, which floored at 0 and so could only ever be dragged down as
 * far as "no progress".
 */
export const NORMALIZED_FLOOR = -0.5;
export const NORMALIZED_CEILING = 1;

/**
 * Progress from baseline toward target, or `null` when the metric cannot be
 * placed on its scale at all.
 *
 * `null` is not a score and must never be coerced into one. `0` in this model
 * is a claim — "sitting exactly at baseline, no progress made" — and a metric we
 * cannot measure has made no such claim. Collapsing the two biases the composite
 * downward, and does it invisibly, because a metric scoring 0 for want of data
 * reads identically to one genuinely stuck. Callers exclude `null` metrics from
 * both the numerator and the weight denominator and report coverage separately.
 */
export function normalizeMetric(metric: MetricConfig, value: number): number | null {
  const span = metric.targetValue - metric.baselineValue;

  // A degenerate config gives no scale to place the value on, so there is no
  // progress to report either way. See above for why this is not 0.
  if (span === 0 || !Number.isFinite(span)) return null;

  // The subtraction handles both directions unaided: when a metric is meant to
  // fall, numerator and denominator are both negative and the ratio comes out
  // the right way up. `direction` is therefore a declared intent checked
  // against the anchors, not an arithmetic input — a metric claiming
  // `lower_is_better` while its target sits above its baseline is a config
  // error, and scoring it backwards silently is the failure this catches.
  const declaredFall = metric.direction === 'lower_is_better';
  if (declaredFall !== span < 0) {
    throw new Error(
      `${metric.id}: direction "${metric.direction}" contradicts anchors ` +
        `(baseline ${metric.baselineValue} -> target ${metric.targetValue})`,
    );
  }

  // A nowcast that came back NaN or Infinity has told us nothing about this
  // metric, which is different from telling us nothing has improved.
  if (!Number.isFinite(value)) return null;

  const raw = (value - metric.baselineValue) / span;

  // `+ 0` collapses -0 to 0. A metric sitting exactly on a descending baseline
  // divides 0 by a negative span and yields -0, which compares unequal to 0
  // under Object.is and would read as "-0.0%" anywhere it were formatted.
  return Math.min(NORMALIZED_CEILING, Math.max(NORMALIZED_FLOOR, raw)) + 0;
}

/**
 * Every way a metric's anchors can be unusable, checked once at config load.
 *
 * `normalizeMetric` already refuses these, but it refuses them at scoring time,
 * deep inside `scoreAt`, where a past date runs through `safeScoreAt` and the
 * throw is swallowed. A genuine config error therefore surfaced as a missing
 * delta rather than as a failure — and now that absent data is a normal, silent,
 * expected condition, a config error would look like more of the same.
 *
 * So it is checked up front instead, at import, before anything has been
 * scored. The throw inside `normalizeMetric` stays as a backstop and should now
 * be unreachable in practice, which is the point of having both.
 *
 * Reports every offending metric in one message rather than stopping at the
 * first: fixing anchors one failed import at a time is miserable, and a whole
 * category is usually retuned in one sitting.
 */
export function validateMetricConfigs(configs: MetricConfig[]): void {
  const problems: string[] = [];

  for (const metric of configs) {
    const { id, baselineValue, targetValue, direction } = metric;

    if (!Number.isFinite(baselineValue) || !Number.isFinite(targetValue)) {
      problems.push(`${id}: non-finite anchor (baseline ${baselineValue} -> target ${targetValue})`);
      // The span is meaningless from here, so don't pile a second complaint on
      // top of the one that actually needs fixing.
      continue;
    }

    const span = targetValue - baselineValue;

    if (span === 0) {
      problems.push(
        `${id}: baseline and target are both ${baselineValue}, so there is no scale to score against`,
      );
      continue;
    }

    const declaredFall = direction === 'lower_is_better';
    if (declaredFall !== span < 0) {
      problems.push(
        `${id}: direction "${direction}" contradicts anchors ` +
          `(baseline ${baselineValue} -> target ${targetValue})`,
      );
    }
  }

  if (problems.length > 0) {
    throw new Error(`Invalid metric config:\n  ${problems.join('\n  ')}`);
  }
}
