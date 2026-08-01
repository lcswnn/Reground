import type { HumanityMetric } from '@/api/humanity';

/**
 * "Since you were born" — what has changed in one person's lifetime.
 *
 * The point of the section is scale: a global indicator moving a few percent a
 * year is invisible day to day and enormous across twenty-five years. Anchoring
 * it to the reader's own birthday is what makes that legible.
 *
 * Kept as a pure module rather than living in the component so the arithmetic —
 * which is where this can quietly go wrong — is testable without a simulator.
 */

export interface BirthComparison {
  metric: HumanityMetric;
  /** The indicator's value at the reader's birth. */
  fromValue: number;
  /** Today's value, nowcast included. */
  toValue: number;
  /** Year the `fromValue` was measured, which may trail the birth year. */
  fromYear: string;
  /** Change relative to `fromValue`, as a percentage. */
  changePct: number;
  /**
   * Whether the change is progress, or null when the artifact predates the
   * `direction` field. Null means "we don't know", and must not be rendered as
   * either — a red arrow on rising life expectancy is worse than no arrow.
   */
  isProgress: boolean | null;
}

/** Below this the comparison is noise dressed up as a finding. */
const MIN_CHANGE_PCT = 1;

/**
 * The composite score then and now, in points.
 *
 * `null` from `compositeSinceBirth` rather than a zero, because "we cannot
 * compute this" and "nothing changed" must not render the same way.
 */
export interface CompositeSinceBirth {
  fromScore: number;
  toScore: number;
  /** Signed change in percentage points. */
  deltaPoints: number;
  /** How many indicators the score was computed over, of how many exist. */
  coverage: { scored: number; total: number };
  /** Earliest year any scored indicator was measured at or before the birthday. */
  fromYear: string;
}

/** Mirrors `NORMALIZED_FLOOR` / `NORMALIZED_CEILING` in the data layer. */
const NORMALIZED_FLOOR = -0.5;
const NORMALIZED_CEILING = 1;

/**
 * Progress from baseline toward target, clamped the way the data layer clamps
 * it — see `data-layer/src/scoring/normalize.ts` for why the floor is negative.
 *
 * The subtraction handles both directions unaided: a metric meant to fall has a
 * negative span, and the ratio comes out the right way up. The data layer's
 * version additionally *throws* when `direction` contradicts the anchors; that
 * check belongs where the config is authored, not on a phone rendering an
 * artifact that already passed it.
 */
function normalize(metric: HumanityMetric, value: number): number {
  const baseline = metric.baselineValue;
  const target = metric.targetValue;
  if (baseline === undefined || target === undefined) return 0;

  const span = target - baseline;
  if (span === 0 || !Number.isFinite(span) || !Number.isFinite(value)) return 0;

  const raw = (value - baseline) / span;
  // `+ 0` collapses -0, which would format as "-0.0".
  return Math.min(NORMALIZED_CEILING, Math.max(NORMALIZED_FLOOR, raw)) + 0;
}

/**
 * The composite score over a set of already-normalised metrics.
 *
 * Mirrors `scoreAt` in `data-layer/src/scoring/composite.ts`: a weighted mean of
 * per-metric progress, `Σ (weight × normalized) / Σ weight`, clamped to 0–1.
 *
 * Polarity is not read here, and deliberately so — `normalize` above already
 * resolves direction through the signed span, exactly as the data layer does, so
 * a detractor on target and a contributor on target both read `1`. See the doc
 * comment on `computeComposite` in `scoring.ts`.
 *
 * Duplicated rather than shared because that module imports the nowcast and the
 * whole `MetricConfig` shape, neither of which exists in the app bundle. If the
 * scoring model changes, this has to change with it — the tests import the data
 * layer's own `normalizeMetric` and assert the two agree, which is the guard
 * that makes the duplication safe rather than merely convenient.
 */
function scoreOver(metrics: HumanityMetric[], valueOf: (metric: HumanityMetric) => number): number {
  const totalWeight = metrics.reduce((total, metric) => total + metric.weight, 0);
  if (totalWeight <= 0) return 0;

  const raw = metrics.reduce(
    (total, metric) => total + (metric.weight * normalize(metric, valueOf(metric))) / totalWeight,
    0,
  );

  return Math.min(1, Math.max(0, raw));
}

/**
 * The headline number: how far humanity's overall score has moved in this
 * reader's lifetime.
 *
 * Scored over only the indicators whose history actually reaches back past the
 * birthday, and over the *same* set at both ends — comparing a score computed
 * from nine indicators against one computed from thirteen would attribute the
 * difference in coverage to progress. `coverage` is returned so the UI can say
 * how much of the model it is speaking for.
 *
 * Returns null when the artifact carries no anchors (it predates them), or when
 * too little of the model reaches back that far for a composite to mean
 * anything.
 */
export function compositeSinceBirth(
  metrics: HumanityMetric[],
  birthDate: string,
  minimumCoverage = 0.5,
): CompositeSinceBirth | null {
  const scored: { metric: HumanityMetric; fromValue: number; fromYear: string }[] = [];

  for (const metric of metrics) {
    if (metric.baselineValue === undefined || metric.targetValue === undefined) return null;

    const at = valueAt(metric, birthDate);
    if (!at) continue;
    scored.push({ metric, fromValue: at.value, fromYear: at.year });
  }

  if (metrics.length === 0) return null;
  if (scored.length / metrics.length < minimumCoverage) return null;

  const included = scored.map((entry) => entry.metric);
  const fromValues = new Map(scored.map((entry) => [entry.metric.id, entry.fromValue]));

  const fromScore = scoreOver(included, (metric) => fromValues.get(metric.id) ?? 0);
  const toScore = scoreOver(included, (metric) => metric.currentValue);

  return {
    fromScore,
    toScore,
    deltaPoints: (toScore - fromScore) * 100,
    coverage: { scored: scored.length, total: metrics.length },
    fromYear: scored.reduce(
      (earliest, entry) => (entry.fromYear < earliest ? entry.fromYear : earliest),
      scored[0].fromYear,
    ),
  };
}

/**
 * The indicator's value on a given date.
 *
 * The last observation at or before the date, not the nearest — a series is a
 * step function of published measurements, and reading forward to a point that
 * had not happened yet would credit someone's birth year with a number
 * collected after it.
 *
 * Returns null when the series begins after the date, which is the honest
 * answer for a reader born in 1970 asking about a series that starts in 2005.
 * Those metrics are dropped rather than silently compared against their own
 * first point.
 */
function valueAt(metric: HumanityMetric, isoDate: string): { value: number; year: string } | null {
  const series = [...metric.series].sort((a, b) => a.t.localeCompare(b.t));

  let found: { value: number; year: string } | null = null;
  for (const point of series) {
    if (point.t > isoDate) break;
    found = { value: point.v, year: point.t.slice(0, 4) };
  }

  return found;
}

/**
 * Everything that has measurably moved in this reader's lifetime, biggest
 * relative change first.
 *
 * Ranked by magnitude rather than by whether it is good news. A section that
 * only ever surfaces improvements is not evidence of anything — if CO₂ per
 * person is the largest change since 1998, that belongs at the top, and the
 * app's whole claim is weaker without it.
 */
export function comparisonsSinceBirth(
  metrics: HumanityMetric[],
  birthDate: string,
  limit = 4,
): BirthComparison[] {
  const comparisons: BirthComparison[] = [];

  for (const metric of metrics) {
    const at = valueAt(metric, birthDate);
    if (!at) continue;
    // A zero baseline makes a relative change either infinite or meaningless.
    if (at.value === 0) continue;

    const changePct = ((metric.currentValue - at.value) / Math.abs(at.value)) * 100;
    if (Math.abs(changePct) < MIN_CHANGE_PCT) continue;

    const rose = metric.currentValue > at.value;
    const isProgress = metric.direction
      ? metric.direction === 'higher_is_better'
        ? rose
        : !rose
      : null;

    comparisons.push({
      metric,
      fromValue: at.value,
      toValue: metric.currentValue,
      fromYear: at.year,
      changePct,
      isProgress,
    });
  }

  return comparisons.sort((a, b) => Math.abs(b.changePct) - Math.abs(a.changePct)).slice(0, limit);
}
