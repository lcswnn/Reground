import { env } from '@/lib/env';

/**
 * The humanity progress artifact.
 *
 * One static JSON, built daily by the data layer and served from a public
 * Supabase Storage bucket. The app never calls OWID, NOAA, or Ember — this is
 * the only thing that crosses that boundary, which is what keeps a cold start
 * at one request instead of thirteen.
 *
 * Shapes here mirror `data-layer/src/types.ts`. They are hand-written rather
 * than imported because the data layer is outside the Expo bundle and has its
 * own module resolution; if you change one, change both.
 */

export interface HumanitySeriesPoint {
  t: string;
  v: number;
  /** Present only on projected points, to keep the payload small. */
  projected?: true;
}

export interface HumanityMetric {
  id: string;
  label: string;
  category: string;
  /** Nowcast for today. See `isProjected` — this is usually modelled. */
  currentValue: number;
  isProjected: boolean;
  lastObservedAt: string;
  lastObservedValue: number;
  sourceLastUpdated: string | null;
  /** Progress from baseline to target. Negative when regressed past baseline. */
  normalized: number;
  /** Same, for `lastObservedValue` — the solid end of the tile's bar. */
  normalizedObserved: number;
  /** Signed share of the composite, as a fraction. */
  contribution: number;
  weight: number;
  /**
   * The normalisation anchors, for scoring a value the server never saw — the
   * reader's birth year is per-user and cannot be precomputed.
   *
   * Optional for the same reason as `direction`: added after the first
   * artifacts were published, and the app reads whatever is in the bucket.
   */
  baselineValue?: number;
  targetValue?: number;
  /**
   * Which way the indicator has to move to count as progress.
   *
   * Optional because it was added after the first artifacts were published, and
   * the app reads whatever is currently in the bucket — it is absent until the
   * next `data:artifact` + `data:publish`. Anything using it has to treat that
   * absence as "don't know", not as a direction.
   */
  direction?: 'higher_is_better' | 'lower_is_better';
  polarity: 'contributor' | 'detractor';
  unit: string;
  basis: string;
  /** Computed from the real series, not hand-authored. */
  delta: string;
  nowcastConfidence: number;
  /** Who publishes the underlying data, and where to go read it. */
  sourceName: string;
  sourceUrl: string;
  series: HumanitySeriesPoint[];
}

export interface HumanityArtifact {
  generatedAt: string;
  compositeScore: number;
  direction: 'up' | 'down' | 'flat';
  deltas: { week: number | null; month: number | null };
  metrics: HumanityMetric[];
}

// Public bucket, so no key and no session — this is the one thing the app reads
// without going through the Supabase client at all.
const ARTIFACT_URL = `${env.supabaseUrl}/storage/v1/object/public/artifacts/humanity.json`;

export async function fetchHumanityArtifact(): Promise<HumanityArtifact> {
  const response = await fetch(ARTIFACT_URL);

  if (!response.ok) {
    throw new Error(`Could not load progress data (${response.status})`);
  }

  const artifact = (await response.json()) as HumanityArtifact;

  // A truncated or half-written file would otherwise render as an empty grid
  // and a 0% bar, which reads as "the world scores zero" rather than "this
  // failed to load".
  if (!Array.isArray(artifact.metrics) || artifact.metrics.length === 0) {
    throw new Error('Progress data arrived empty');
  }

  return artifact;
}

/**
 * Formats a metric's current value for display.
 *
 * The data layer stores bare numbers and a unit; the old hardcoded file stored
 * pre-formatted strings. Doing it here keeps the artifact free of presentation
 * decisions.
 */
export function formatMetricValue(metric: HumanityMetric): string {
  return formatValueWithUnit(metric.currentValue, metric.unit);
}

/**
 * The same formatting for a bare number, so a previously-seen value can be
 * rendered beside the current one without inventing a synthetic metric.
 */
export function formatValueWithUnit(value: number, unit: string): string {
  // Two significant-ish digits below 10, none above 100 — a rate of 3.62 wants
  // its decimals, a percentage of 94.49 does not.
  const rounded =
    Math.abs(value) >= 100 ? value.toFixed(0) : Math.abs(value) >= 10 ? value.toFixed(1) : value.toFixed(2);

  switch (unit) {
    case '%':
      return `${rounded}%`;
    case 'years':
      return `${rounded} yrs`;
    case 't':
      return `${rounded} t`;
    case 'ppm':
      return `${rounded} ppm`;
    // The currency goes in front of the number, not after it — the default
    // branch would render solar as "0.26 $/W".
    case '$/W':
      return `$${rounded}/W`;
    default:
      return `${rounded} ${unit}`;
  }
}

/** The year of the last real measurement, for the tile's provenance line. */
export function lastObservedYear(metric: HumanityMetric): string {
  return metric.lastObservedAt.slice(0, 4);
}

/**
 * True when an indicator has regressed past its own baseline — worse than where
 * we started, not merely short of the target. Drives which way `barFill` reads.
 *
 * This is a statement about *position*, not about movement, and the two are not
 * the same question — see `isMovingWrongWay`, which is what the charts colour by.
 */
export function isRegressing(metric: HumanityMetric): boolean {
  return metric.normalized < 0;
}

/**
 * True when the series has moved in the direction that counts as worse.
 *
 * Distinct from `isRegressing`, and the distinction is not academic. That one
 * asks "are we below the baseline"; this asks "which way are we going". They
 * agree for most indicators and come apart whenever a baseline is anchored at
 * the bad end of the range rather than at the start of the record.
 *
 * Arctic sea ice is exactly that case. Its baseline is the record-low annual
 * mean, so sitting at the worst level in the satellite record normalises to
 * roughly 0 — not negative — and `isRegressing` reads false. The chart card
 * would then paint "↓ 1.9 M km² since 1990" in the improvement colour, which is
 * the opposite of what happened.
 *
 * Falls back to `isRegressing` when `direction` is absent: it is optional in the
 * artifact, missing from anything published before it was added, and guessing a
 * direction from the numbers alone would be worse than deferring to position.
 */
export function isMovingWrongWay(metric: HumanityMetric): boolean {
  if (!metric.direction) return isRegressing(metric);

  // Measured points only, matching how the data layer computes `delta` — the
  // colour and the number in the pill must agree, and a projected tail can point
  // the other way from the measurements it is drawn from.
  const measured = metric.series.filter((point) => !point.projected);
  const points = measured.length >= 2 ? measured : metric.series;
  if (points.length < 2) return isRegressing(metric);

  const change = points[points.length - 1].v - points[0].v;
  // Dead flat is not the wrong way. Anything genuinely unchanged reads as
  // neutral rather than as a problem.
  if (change === 0) return false;

  return metric.direction === 'higher_is_better' ? change < 0 : change > 0;
}

/**
 * The widest a regressing bar draws, leaving the rest of the track free.
 *
 * Without it the worst metrics pin flush to the end and the dotted projection
 * tail has nowhere to render — a bar cannot be more than 100% wide, so the gap
 * between measured and projected gets clipped away exactly where the problem is
 * most worth showing.
 */
const REGRESSING_CAP = 0.92;

/**
 * Normalized runs from -0.5 (the scoring floor, worst) to 1 (target), so
 * "problem remaining" spans 1.5 before it is scaled onto the track.
 */
const REGRESSING_SPAN = 1.5;

/**
 * How much of a bar to fill, 0–1.
 *
 * The two states read the bar differently, on purpose:
 *
 *   progressing — fill is progress made. Empty at the baseline, full at target.
 *   regressing  — fill is the problem left. Near-full at its worst, draining as
 *                 the metric improves, and gone entirely at target.
 *
 * Without the second case a regressing metric renders as an empty bar, which
 * looks identical to "nothing measured yet" and reads far milder than "worse
 * than when we started".
 *
 * The regressing side is divided by its own span rather than clamped at 1. A
 * bare `1 - normalized` saturates for *every* metric below the baseline, so a
 * mild regression and a catastrophic one both draw a flush-full bar and become
 * indistinguishable. Scaling keeps them apart: emissions per person at -0.16
 * draws noticeably shorter than atmospheric CO₂ at the -0.5 floor.
 *
 * The two scales meet discontinuously at the baseline: a metric crossing zero
 * flips from a mostly-full red bar to an empty blue one. That threshold is
 * genuinely where the story changes from "losing ground" to "making progress",
 * so the jump means something rather than being a glitch — but it is a jump,
 * and none of the current thirteen sits near it.
 */
export function barFill(normalized: number, regressing: boolean): number {
  if (!regressing) return clamp01(normalized);

  return clamp01((1 - normalized) / REGRESSING_SPAN) * REGRESSING_CAP;
}

function clamp01(value: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.min(1, Math.max(0, value));
}
