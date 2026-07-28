import type { NowcastMethod, NowcastResult, Observation } from '../types.js';

/**
 * Take slow, mostly-annual survey data and project it forward to today, then
 * ship the projection *as a projection* — the World Poverty Clock approach.
 * The product is the modelled number plus an honest label, not a number
 * pretending to be a measurement.
 *
 * The hard requirement, stated once here because every function below is
 * written to preserve it: **the projection follows the trend it is given.** A
 * falling trailing window projects downward, without limit and without special
 * cases. There is no flooring at the last observed value, no `Math.abs`, no
 * optimism term, and no smoothing that would damp a decline. If the world is
 * getting worse at something, this says so.
 */

const MS_PER_YEAR = 365.2425 * 24 * 60 * 60 * 1000;

export interface NowcastOptions {
  method: NowcastMethod;
  /** Trailing window the trend is fit over. */
  trailingWindowYears: number;
}

/** Fractional years between two dates. Signed: negative when `to` precedes `from`. */
function yearsBetween(from: Date, to: Date): number {
  return (to.getTime() - from.getTime()) / MS_PER_YEAR;
}

/**
 * Ordinary least squares on (yearsSinceStart, value).
 *
 * Returns the slope in units per year. A negative slope is returned as a
 * negative number and used as one.
 */
export function linearFit(points: { t: number; v: number }[]): { slope: number; intercept: number; r2: number } {
  const n = points.length;
  const meanT = points.reduce((sum, p) => sum + p.t, 0) / n;
  const meanV = points.reduce((sum, p) => sum + p.v, 0) / n;

  let covariance = 0;
  let varianceT = 0;
  for (const point of points) {
    covariance += (point.t - meanT) * (point.v - meanV);
    varianceT += (point.t - meanT) ** 2;
  }

  // Every point at the same instant: no slope is defined, so hold flat rather
  // than dividing by zero.
  const slope = varianceT === 0 ? 0 : covariance / varianceT;
  const intercept = meanV - slope * meanT;

  let ssRes = 0;
  let ssTot = 0;
  for (const point of points) {
    ssRes += (point.v - (slope * point.t + intercept)) ** 2;
    ssTot += (point.v - meanV) ** 2;
  }
  const r2 = ssTot === 0 ? 1 : Math.max(0, 1 - ssRes / ssTot);

  return { slope, intercept, r2 };
}

/**
 * Compound annual growth rate between the window's ends.
 *
 * Only defined for strictly positive values on a consistent sign — a series
 * that crosses zero, or sits at it, has no meaningful ratio. Callers fall back
 * to linear in that case rather than producing a number with no support.
 *
 * A shrinking series yields a rate below 1 and the projection decays. That is
 * the intended behaviour for metrics like poverty and child mortality, and it
 * is equally the intended behaviour when something we want to grow is
 * shrinking instead.
 */
export function cagrFit(
  first: { t: number; v: number },
  last: { t: number; v: number },
): { rate: number } | null {
  const span = last.t - first.t;
  if (span <= 0) return null;
  if (first.v <= 0 || last.v <= 0) return null;

  return { rate: (last.v / first.v) ** (1 / span) };
}

/**
 * Confidence in a projection, 0–1.
 *
 * Two independent penalties, multiplied:
 *
 *   drift — how far past the last observation we are extrapolating, relative to
 *           the window we fit. Extrapolating one year off a ten-year window is
 *           a mild claim; extrapolating eight is not.
 *   fit   — how well the trend described the window in the first place. A noisy
 *           series projected confidently is the failure mode here.
 *
 * Floors at 0.05 rather than 0 so the artifact can still render something and
 * the UI can decide what to do with a weak number.
 */
export function projectionConfidence(driftYears: number, windowYears: number, fitQuality: number): number {
  if (driftYears <= 0) return 1;

  const driftPenalty = 1 / (1 + (driftYears / Math.max(windowYears, 1)) * 2);
  const fitPenalty = 0.4 + 0.6 * clamp01(fitQuality);

  return Math.max(0.05, clamp01(driftPenalty * fitPenalty));
}

function clamp01(value: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

/**
 * Projects a metric forward to `asOf`.
 *
 * Only `observed` points are fitted. Points that arrived already projected —
 * World Bank nowcasts republished by OWID, say — are excluded from the fit, so
 * we are never extrapolating from someone else's extrapolation.
 */
export function nowcast(
  observations: Observation[],
  asOf: Date,
  options: NowcastOptions,
): NowcastResult {
  const observed = observations
    .filter((observation) => observation.provenance === 'observed')
    .filter((observation) => Number.isFinite(observation.value))
    .sort((a, b) => (a.observedAt < b.observedAt ? -1 : a.observedAt > b.observedAt ? 1 : 0));

  if (observed.length === 0) {
    throw new Error('nowcast requires at least one observed point');
  }

  const last = observed[observed.length - 1];
  const lastDate = new Date(last.observedAt);
  const driftYears = yearsBetween(lastDate, asOf);

  // At or before the last real observation there is nothing to project. Return
  // the nearest observation at or before `asOf` and say it is observed.
  if (driftYears <= 0) {
    const atOrBefore = observed.filter((observation) => new Date(observation.observedAt) <= asOf);
    const point = atOrBefore[atOrBefore.length - 1] ?? observed[0];
    return {
      value: point.value,
      method: 'observed',
      confidence: 1,
      lastObservedValue: point.value,
      lastObservedAt: point.observedAt,
      isProjected: false,
    };
  }

  const windowStart = new Date(lastDate.getTime() - options.trailingWindowYears * MS_PER_YEAR);
  let window = observed.filter((observation) => new Date(observation.observedAt) >= windowStart);

  // Two points are the minimum for any trend. A short or sparse series widens
  // the window rather than refusing to project.
  if (window.length < 2) window = observed.slice(-2);

  if (window.length < 2) {
    // A single point in the entire series: hold it flat and say so with a low
    // confidence. Inventing a slope from one observation would be fabrication.
    return {
      value: last.value,
      method: 'observed',
      confidence: 0.05,
      lastObservedValue: last.value,
      lastObservedAt: last.observedAt,
      isProjected: true,
    };
  }

  const origin = new Date(window[0].observedAt);
  const points = window.map((observation) => ({
    t: yearsBetween(origin, new Date(observation.observedAt)),
    v: observation.value,
  }));

  const targetT = yearsBetween(origin, asOf);

  let value: number;
  let method: NowcastMethod = options.method;
  let fitQuality: number;

  if (options.method === 'cagr') {
    const fit = cagrFit(points[0], points[points.length - 1]);
    if (fit) {
      value = points[0].v * fit.rate ** targetT;
      // CAGR uses only the endpoints, so R² of a line through the window is a
      // reasonable stand-in for how orderly the series is.
      fitQuality = linearFit(points).r2;
    } else {
      // Non-positive or zero-crossing values: CAGR is undefined. Fall back
      // rather than emitting a NaN or clamping the series positive.
      const fallback = linearFit(points);
      value = fallback.slope * targetT + fallback.intercept;
      method = 'linear';
      fitQuality = fallback.r2;
    }
  } else {
    const fit = linearFit(points);
    value = fit.slope * targetT + fit.intercept;
    fitQuality = fit.r2;
  }

  return {
    value,
    method,
    confidence: projectionConfidence(driftYears, options.trailingWindowYears, fitQuality),
    lastObservedValue: last.value,
    lastObservedAt: last.observedAt,
    isProjected: true,
  };
}
