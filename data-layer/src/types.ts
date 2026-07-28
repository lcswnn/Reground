/**
 * Core types for the ingest + nowcast layer.
 *
 * This layer is deliberately separate from the Expo app: nothing here imports
 * React Native, and the app never imports from here. The only thing that
 * crosses the boundary is the built JSON artifact described at the bottom of
 * this file.
 *
 * Three cadences are kept distinct throughout, and conflating them is the
 * mistake this whole design exists to avoid:
 *
 *   source cadence  — how often the upstream number actually changes. Mostly
 *                     annual. `SourceAdapter.sourceUpdateCadence`.
 *   refresh cadence — how often we poll. Per-source, driven by the source's own
 *                     `nextUpdate` where it publishes one.
 *                     `SourceAdapter.refreshCadence`.
 *   display cadence — how often the user-visible number moves. Daily, via
 *                     `nowcast`, which is a projection and is labelled as one.
 */

/** How often the upstream source revises its numbers. */
export type Cadence = 'daily' | 'monthly' | 'quarterly' | 'annual';

/**
 * Whether a value was measured or modelled.
 *
 * Not purely ours to assign: OWID republishes World Bank nowcasts and
 * carries values forward between survey years, so some points arrive already
 * projected. Those are tagged `projected` at ingest rather than being laundered
 * into observations — otherwise our own nowcast would be extrapolating from
 * someone else's extrapolation without saying so.
 */
export type Provenance = 'observed' | 'projected';

/**
 * One number, at one date, from one source.
 *
 * Append-only. `(metricId, observedAt, source)` is the identity — a re-fetch
 * that returns a revised value for an existing date updates that row's value
 * and `fetchedAt`, but never deletes history for other dates, and never merges
 * two sources into one row.
 */
export interface Observation {
  metricId: string;
  value: number;
  /** ISO date. Annual series are stored as YYYY-01-01. */
  observedAt: string;
  provenance: Provenance;
  /** From the source's own metadata, where it publishes one. */
  sourceLastUpdated: string | null;
  /**
   * When the source says it will next revise. Drives the refresh scheduler —
   * there is no point polling an annual series daily for eleven months.
   */
  sourceNextUpdate: string | null;
  fetchedAt: string;
  /** The adapter id that produced this. */
  source: string;
  unit: string;
}

export type NowcastMethod = 'linear' | 'cagr';

export type MetricDirection = 'higher_is_better' | 'lower_is_better';

export type MetricPolarity = 'contributor' | 'detractor';

export interface MetricConfig {
  id: string;
  label: string;
  category: string;

  /** The 0 anchor. Progress is measured from here. */
  baselineValue: number;
  /** The 1.0 anchor. Reaching it means done. */
  targetValue: number;
  direction: MetricDirection;

  /** Share of the composite. Weights sum to 1 across the set. */
  weight: number;
  polarity: MetricPolarity;

  nowcastMethod: NowcastMethod;
  /** Trailing window the trend is fit over. */
  trailingWindowYears: number;

  sourceAdapterId: string;
  owidSlug?: string;
  /** Extra grapher params — `literacy` needs age_group and sex, for instance. */
  owidParams?: Record<string, string>;

  /**
   * Anything dated after this year is forced to `projected` at ingest.
   *
   * Needed because the automatic detection can't always fire: OWID's *filtered*
   * CSV carries a `__original_year` companion column marking carried-forward
   * values, but the *full* CSV — the one we have to use, since the country
   * filter is unreliable — drops it. The World Bank poverty series ships
   * nowcasts three years past its last survey with no marker left in the
   * payload, so the cutoff has to be stated here or we would ingest a
   * projection as a measurement.
   */
  observedThroughYear?: number;

  unit: string;
  /** Why these anchors, in the user's words. Surfaced in the app. */
  basis: string;
}

export interface NowcastResult {
  value: number;
  /** `observed` when asOf lands on or before the last real observation. */
  method: NowcastMethod | 'observed';
  /**
   * 0–1. Decays as `asOf` drifts past `lastObservedAt`, and is penalised
   * further when the trailing window fits the data poorly.
   */
  confidence: number;
  lastObservedValue: number;
  lastObservedAt: string;
  isProjected: boolean;
}

/** One metric's signed share of the composite. */
export interface MetricContribution {
  metricId: string;
  label: string;
  /** Progress from baseline to target. Can be negative — see `normalizeMetric`. */
  normalized: number;
  /** Signed share of the final score. Contributions sum to the unclamped total. */
  contribution: number;
  weight: number;
  polarity: MetricPolarity;
}

export interface CompositeResult {
  score: number;
  perMetricContributions: MetricContribution[];
  direction: 'up' | 'down' | 'flat';
  /** Signed change in score. Null when there is not enough history to say. */
  deltaVsLastWeek: number | null;
  deltaVsLastMonth: number | null;
}

/** A point as it appears in the served artifact. */
export interface SeriesPoint {
  t: string;
  v: number;
  /** Present and true only for projected points, to keep the payload small. */
  projected?: true;
}

export interface ArtifactMetric {
  id: string;
  label: string;
  category: string;
  currentValue: number;
  isProjected: boolean;
  lastObservedAt: string;
  /** The last real measurement, before any projection. */
  lastObservedValue: number;
  sourceLastUpdated: string | null;
  normalized: number;
  /**
   * `normalized` of `lastObservedValue`.
   *
   * Sent rather than derived because the client has no baseline or target to
   * compute it from, and the tile needs both ends to draw the solid bar out to
   * what was measured and a dotted tail across the projected gap.
   */
  normalizedObserved: number;
  contribution: number;
  weight: number;
  polarity: MetricPolarity;
  unit: string;
  basis: string;
  /** Computed from the real series, replacing the hand-authored strings. */
  delta: string;
  nowcastConfidence: number;
  series: SeriesPoint[];
}

/** The single JSON the Expo app fetches. Nothing else crosses the boundary. */
export interface Artifact {
  generatedAt: string;
  compositeScore: number;
  direction: 'up' | 'down' | 'flat';
  deltas: {
    week: number | null;
    month: number | null;
  };
  metrics: ArtifactMetric[];
}
