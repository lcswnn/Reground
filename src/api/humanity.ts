/**
 * The humanity progress artifact, back in the app.
 *
 * One static JSON, rebuilt daily by the data layer (`.github/workflows/data-refresh.yml`)
 * and served from a public Supabase Storage bucket. The app never calls OWID,
 * NOAA, NSIDC or the WHO — this is the only thing that crosses that boundary,
 * which is what keeps the calibration screen at one request instead of nineteen.
 *
 * ## Why this is a network call and not a bundled file
 *
 * `humanity.json` is gitignored (`.gitignore:57`) and lives only in CI and in
 * the bucket, so there is nothing to `require()`. Bundling a snapshot would also
 * freeze it at build time, and the nowcast moves the displayed numbers every
 * day even when no source published anything.
 *
 * The cost is that the session is no longer strictly offline. That is bounded
 * deliberately: nothing before `/calibration` waits on this, the fetch is warmed
 * the moment GROUP A picks a topic (see `use-humanity`), and a failure costs the
 * charts and nothing else — the screen's three sections are authored copy and
 * render either way.
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
  /** Progress from baseline to target. Negative when regressed past baseline. */
  normalized: number;
  /**
   * Which way the indicator has to move to count as progress.
   *
   * Optional because it was added after the first artifacts were published, and
   * the app reads whatever is currently in the bucket. Anything using it has to
   * treat that absence as "don't know", not as a direction.
   */
  direction?: 'higher_is_better' | 'lower_is_better';
  unit: string;
  basis: string;
  /** Computed from the real series by the data layer, not hand-authored. */
  delta: string;
  /** Who publishes the underlying data, and where to go read it. */
  sourceName: string;
  sourceUrl: string;
  series: HumanitySeriesPoint[];
}

export interface HumanityArtifact {
  generatedAt: string;
  compositeScore: number;
  metrics: HumanityMetric[];
}

/**
 * Public bucket, so no key and no Supabase client — this is a plain GET of a
 * static file.
 *
 * Null rather than a throw when the env var is missing. It is inlined at bundle
 * time, so an unset value is a build that shipped wrong — and the session has
 * eleven screens that do not care. Failing here would take all of them down to
 * lose one chart.
 */
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;

export const ARTIFACT_URL = SUPABASE_URL
  ? `${SUPABASE_URL}/storage/v1/object/public/artifacts/humanity.json`
  : null;

/**
 * Long enough for a bad connection, short enough that a prefetch started at the
 * topic picker has given up well before the user reaches the screen it feeds.
 */
const TIMEOUT_MS = 12_000;

export async function fetchHumanityArtifact(): Promise<HumanityArtifact> {
  if (!ARTIFACT_URL) {
    throw new Error('EXPO_PUBLIC_SUPABASE_URL is not set, so there is nowhere to read data from');
  }

  // `AbortSignal.timeout` is not in Hermes, so the controller is wired by hand.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(ARTIFACT_URL, { signal: controller.signal });

    if (!response.ok) {
      throw new Error(`Could not load the data (${response.status})`);
    }

    const artifact = (await response.json()) as HumanityArtifact;

    // A truncated or half-written file would otherwise render as a screen of
    // empty cards, which reads as "there is nothing to say" rather than "this
    // failed to load".
    if (!Array.isArray(artifact.metrics) || artifact.metrics.length === 0) {
      throw new Error('The data arrived empty');
    }

    return artifact;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * The metrics a topic asks for, in the order it asked for them.
 *
 * Ids the artifact does not carry are dropped rather than rendered as blanks —
 * a metric can be promoted or retired in the data layer between two app
 * releases, and the screen has to survive both directions. The caller decides
 * what an empty result means; see `calibration.tsx`.
 */
export function metricsFor(
  artifact: HumanityArtifact,
  ids: readonly string[],
): HumanityMetric[] {
  const byId = new Map(artifact.metrics.map((metric) => [metric.id, metric]));

  return ids
    .map((id) => byId.get(id))
    .filter((metric): metric is HumanityMetric => metric !== undefined);
}

/** Formats a metric's current value for display. */
export function formatMetricValue(metric: HumanityMetric): string {
  return formatValueWithUnit(metric.currentValue, metric.unit);
}

/**
 * The data layer stores bare numbers and a unit, so the presentation decision
 * is made here rather than baked into the artifact.
 */
export function formatValueWithUnit(value: number, unit: string): string {
  // Two significant-ish digits below 10, none above 100 — a rate of 3.62 wants
  // its decimals, a percentage of 94.49 does not.
  const rounded =
    Math.abs(value) >= 100
      ? value.toFixed(0)
      : Math.abs(value) >= 10
        ? value.toFixed(1)
        : value.toFixed(2);

  switch (unit) {
    case '%':
      return `${rounded}%`;
    case 'years':
      return `${rounded} yrs`;
    case 't':
      return `${rounded} t`;
    case 'ppm':
      return `${rounded} ppm`;
    // Written out rather than left to the default branch, which renders the
    // conflict and homicide rates as "3.33 /100k" — a slash a reader has to
    // decode mid-sentence on the one screen that cannot afford it.
    case '/100k':
      return `${rounded} per 100k`;
    // The currency goes in front of the number, not after it — the default
    // branch would render solar as "0.20 $/W".
    case '$/W':
      return `$${rounded}/W`;
    default:
      return `${rounded} ${unit}`;
  }
}

/** The year of the last real measurement, for the card's provenance line. */
export function lastObservedYear(metric: HumanityMetric): string {
  return metric.lastObservedAt.slice(0, 4);
}

/** The year the series starts, for the same line. */
export function firstYear(metric: HumanityMetric): string | null {
  return metric.series[0]?.t.slice(0, 4) ?? null;
}

/**
 * True when an indicator has regressed past its own baseline — worse than where
 * we started, not merely short of the target.
 *
 * A statement about *position*, not about movement. See `isMovingWrongWay`,
 * which is what the charts colour by, and which is not the same question.
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
 * roughly 0 — not negative — and `isRegressing` reads false. The card would then
 * paint "↓ 1.9 M km² since 1990" as an improvement, which is the opposite of
 * what happened.
 *
 * Falls back to `isRegressing` when `direction` is absent: it is optional in the
 * artifact, missing from anything published before it was added, and guessing a
 * direction from the numbers alone would be worse than deferring to position.
 */
export function isMovingWrongWay(metric: HumanityMetric): boolean {
  if (!metric.direction) return isRegressing(metric);

  // Measured points only, matching how the data layer computes `delta` — the
  // arrow and the number beside it must agree, and a projected tail can point
  // the other way from the measurements it was drawn from.
  const measured = metric.series.filter((point) => !point.projected);
  const points = measured.length >= 2 ? measured : metric.series;
  if (points.length < 2) return isRegressing(metric);

  const change = points[points.length - 1].v - points[0].v;
  // Dead flat is not the wrong way. Anything genuinely unchanged reads as
  // neutral rather than as a problem.
  if (change === 0) return false;

  return metric.direction === 'higher_is_better' ? change < 0 : change > 0;
}
