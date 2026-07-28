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
import type { Artifact, ArtifactMetric, Observation, SeriesPoint } from '../types.js';

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

  // Percent-valued metrics read naturally in points; everything else in units.
  const suffix = unit === '%' ? ' pts' : ` ${unit}`;
  const rounded = magnitude >= 10 ? magnitude.toFixed(0) : magnitude.toFixed(1);

  return `${arrow} ${rounded}${suffix} since ${since}${lastYear === firstYear ? '' : ''}`;
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

    return {
      id: metric.id,
      label: metric.label,
      category: metric.category,
      currentValue: projection.value,
      isProjected: projection.isProjected,
      lastObservedAt: projection.lastObservedAt,
      lastObservedValue: projection.lastObservedValue,
      sourceLastUpdated: series[series.length - 1]?.sourceLastUpdated ?? null,
      normalized: normalizeMetric(metric, projection.value),
      normalizedObserved: normalizeMetric(metric, projection.lastObservedValue),
      contribution: contribution?.contribution ?? 0,
      weight: metric.weight,
      polarity: metric.polarity,
      unit: metric.unit,
      basis: metric.basis,
      delta: describeDelta(series, metric.unit),
      nowcastConfidence: projection.confidence,
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
