/**
 * Builds the single JSON the Expo app consumes.
 *
 * The client never calls OWID, NOAA, or Ember. It fetches this file and renders
 * it — which is what keeps the three cadences from leaking into the UI, and
 * what makes the app's cold start one request instead of thirteen.
 *
 *   npx tsx data-layer/src/jobs/build-artifact.ts > artifact.json
 *   npx tsx data-layer/src/jobs/build-artifact.ts --out public/humanity.json
 */

import '../env.js';

import { writeFile } from 'node:fs/promises';

import { METRICS } from '../config/metrics.js';
import { nowcast } from '../nowcast/index.js';
import { computeCompositeScore } from '../scoring/composite.js';
import { normalizeMetric } from '../scoring/normalize.js';
import { readObservations } from '../storage/supabase.js';
import type {
  Artifact,
  ArtifactMetric,
  MetricConfig,
  Observation,
  SeriesPoint,
} from '../types.js';

/**
 * How much history each metric ships.
 *
 * Enough for the app to draw a sparkline without a second request, capped so
 * the payload stays small — the NOAA series alone is ~3,900 daily points, which
 * would be most of the file for one metric.
 */
const MAX_SERIES_POINTS = 120;

function downsample(observations: Observation[]): SeriesPoint[] {
  const points = observations.map((observation) => {
    const point: SeriesPoint = { t: observation.observedAt, v: observation.value };
    if (observation.provenance === 'projected') point.projected = true;
    return point;
  });

  if (points.length <= MAX_SERIES_POINTS) return points;

  // Keep every nth, but always keep the last point — the latest value is the
  // one the app puts on screen, and dropping it to keep the stride even would
  // make the chart disagree with the headline.
  const stride = Math.ceil(points.length / MAX_SERIES_POINTS);
  const sampled = points.filter((_, index) => index % stride === 0);
  const last = points[points.length - 1];
  if (sampled[sampled.length - 1]?.t !== last.t) sampled.push(last);

  return sampled;
}

/** Replaces the hand-authored delta strings with one computed from the series. */
function describeDelta(observations: Observation[], unit: string): string {
  const observed = observations.filter((observation) => observation.provenance === 'observed');
  if (observed.length < 2) return '';

  const last = observed[observed.length - 1];
  const firstYear = Number(observed[0].observedAt.slice(0, 4));
  const lastYear = Number(last.observedAt.slice(0, 4));

  // Anchor on the comparison year most of these series share, falling back to
  // the start of the series when it does not reach back that far.
  const preferred = observed.filter((observation) => observation.observedAt >= '1990-01-01');
  const from = preferred.length >= 2 ? preferred[0] : observed[0];

  const change = last.value - from.value;
  const arrow = change >= 0 ? '↑' : '↓';
  const magnitude = Math.abs(change);
  const since = Number(from.observedAt.slice(0, 4));

  const rounded = magnitude >= 10 ? magnitude.toFixed(0) : magnitude.toFixed(1);

  // Percent-valued metrics read naturally in points; a currency wants its
  // symbol in front of the number rather than trailing it as a unit, which is
  // what turned solar into "11 $/W"; everything else takes its unit as a suffix.
  const amount =
    unit === '%' ? `${rounded} pts` : unit === '$/W' ? `$${rounded}/W` : `${rounded} ${unit}`;

  return `${arrow} ${amount} since ${since}${lastYear === firstYear ? '' : ''}`;
}

/**
 * Where a metric's numbers come from, for the "View source" link.
 *
 * Derived from the adapter rather than authored per metric: an OWID chart's
 * public page is always its slug, so restating it thirteen times would only
 * create thirteen chances to get it wrong.
 */
function sourceOf(metric: MetricConfig): { sourceName: string; sourceUrl: string } {
  if (metric.owidSlug) {
    const params = new URLSearchParams(metric.owidParams ?? {}).toString();
    return {
      sourceName: 'Our World in Data',
      sourceUrl: `https://ourworldindata.org/grapher/${metric.owidSlug}${params ? `?${params}` : ''}`,
    };
  }

  switch (metric.sourceAdapterId) {
    case 'noaa:co2-trend-gl':
      return { sourceName: 'NOAA Global Monitoring Laboratory', sourceUrl: 'https://gml.noaa.gov/ccgg/trends/global.html' };
    case 'ember:monthly-generation':
      return { sourceName: 'Ember', sourceUrl: 'https://ember-energy.org/data/monthly-electricity-data/' };
    case 'nsidc:sea-ice-index-north':
      return { sourceName: 'NSIDC Sea Ice Index', sourceUrl: 'https://nsidc.org/data/seaice_index' };
    case 'who:disease-outbreak-news':
      return { sourceName: 'World Health Organization', sourceUrl: 'https://www.who.int/emergencies/disease-outbreak-news' };
    case 'unhcr:population':
      return { sourceName: 'UNHCR Refugee Data Finder', sourceUrl: 'https://www.unhcr.org/refugee-statistics/' };
    case 'acled:weekly-fatalities':
      return { sourceName: 'ACLED', sourceUrl: 'https://acleddata.com/' };
    case 'electricitymaps:carbon-intensity':
      return { sourceName: 'Electricity Maps', sourceUrl: 'https://app.electricitymaps.com/' };
    case 'gfw:integrated-alerts':
      return { sourceName: 'Global Forest Watch', sourceUrl: 'https://www.globalforestwatch.org/' };
    case 'seed:press-freedom':
      return { sourceName: 'Reporters Without Borders', sourceUrl: 'https://rsf.org/en/index' };
    case 'seed:democracy':
      return { sourceName: 'V-Dem Institute', sourceUrl: 'https://v-dem.net/data/the-v-dem-dataset/' };
    case 'seed:internet-shutdowns':
      return { sourceName: 'Access Now #KeepItOn', sourceUrl: 'https://www.accessnow.org/keepiton-data/' };
    case 'seed:modern-slavery':
      return { sourceName: 'Walk Free', sourceUrl: 'https://www.walkfree.org/global-slavery-index/' };
    case 'seed:food-insecurity':
      return { sourceName: 'IPC / FEWS NET', sourceUrl: 'https://www.ipcinfo.org/' };
    default:
      throw new Error(`No source link known for adapter ${metric.sourceAdapterId}`);
  }
}

async function main() {
  const asOf = new Date();

  const observations = new Map<string, Observation[]>();
  for (const metric of METRICS) {
    observations.set(metric.id, await readObservations(metric.id));
  }

  const composite = computeCompositeScore({ configs: METRICS, observations, asOf });
  const byId = new Map(composite.perMetricContributions.map((entry) => [entry.metricId, entry]));

  const metrics: ArtifactMetric[] = METRICS.map((metric) => {
    const series = observations.get(metric.id) ?? [];
    const contribution = byId.get(metric.id);

    if (series.length === 0) {
      throw new Error(`No observations for ${metric.id} — run the backfill before building.`);
    }

    const projection = nowcast(series, asOf, {
      method: metric.nowcastMethod,
      trailingWindowYears: metric.trailingWindowYears,
    });

    // `normalizeMetric` returns null when the metric cannot be placed on its
    // scale. The artifact's `normalized` is a plain number the tiles and charts
    // read, so absence is carried in `hasData` and the number falls back to a
    // placeholder 0 that consumers must gate on. `scoreAt` reached the same
    // conclusion independently; trust it, since it is the one that decided
    // whether the metric was in the composite's denominator.
    const normalized = normalizeMetric(metric, projection.value);
    const normalizedObserved = normalizeMetric(metric, projection.lastObservedValue);
    const hasData = contribution?.hasData ?? normalized !== null;

    return {
      id: metric.id,
      label: metric.label,
      category: metric.category,
      currentValue: projection.value,
      isProjected: projection.isProjected,
      lastObservedAt: projection.lastObservedAt,
      lastObservedValue: projection.lastObservedValue,
      sourceLastUpdated: series[series.length - 1]?.sourceLastUpdated ?? null,
      normalized: normalized ?? 0,
      normalizedObserved: normalizedObserved ?? 0,
      contribution: contribution?.contribution ?? 0,
      weight: metric.weight,
      hasData,
      baselineValue: metric.baselineValue,
      targetValue: metric.targetValue,
      direction: metric.direction,
      polarity: metric.polarity,
      unit: metric.unit,
      basis: metric.basis,
      delta: describeDelta(series, metric.unit),
      nowcastConfidence: projection.confidence,
      ...sourceOf(metric),
      series: downsample(series),
    };
  });

  const artifact: Artifact = {
    generatedAt: asOf.toISOString(),
    compositeScore: composite.score,
    direction: composite.direction,
    deltas: { week: composite.deltaVsLastWeek, month: composite.deltaVsLastMonth },
    metrics,
  };

  const outIndex = process.argv.indexOf('--out');
  const json = JSON.stringify(artifact, null, 2);

  if (outIndex !== -1 && process.argv[outIndex + 1]) {
    await writeFile(process.argv[outIndex + 1], json);
    console.error(`Wrote ${process.argv[outIndex + 1]} (${(json.length / 1024).toFixed(1)} KB)`);
  } else {
    console.log(json);
  }
}

void main();
