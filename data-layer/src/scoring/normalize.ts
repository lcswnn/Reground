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

export function normalizeMetric(metric: MetricConfig, value: number): number {
  const span = metric.targetValue - metric.baselineValue;

  // No scale to place the value on. Return the pessimistic end rather than
  // inventing progress from a degenerate config.
  if (span === 0 || !Number.isFinite(span)) return 0;

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

  if (!Number.isFinite(value)) return 0;

  const raw = (value - metric.baselineValue) / span;

  // `+ 0` collapses -0 to 0. A metric sitting exactly on a descending baseline
  // divides 0 by a negative span and yields -0, which compares unequal to 0
  // under Object.is and would read as "-0.0%" anywhere it were formatted.
  return Math.min(NORMALIZED_CEILING, Math.max(NORMALIZED_FLOOR, raw)) + 0;
}
