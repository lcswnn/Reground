import type { Observation } from '../types.js';
import { type SourceAdapter, USER_AGENT } from './types.js';

/**
 * Electricity Maps — grid carbon intensity.
 *
 * Grams of CO₂-equivalent per kWh of electricity consumed. This is the number
 * `renewable-share` cannot give you: a grid can add renewables and hold its
 * emissions flat if demand grows or if what the renewables displaced was
 * already low-carbon. Intensity is the outcome, share is one input to it.
 *
 * Requires an API key. Set `ELECTRICITY_MAPS_API_KEY`; without it the adapter
 * reports itself unavailable rather than throwing, matching the Ember contract.
 *
 * Verified against the live API: `/v3/zones` is public, and
 * `/v3/carbon-intensity/latest`, `/v3/carbon-intensity/history` and
 * `/v3/power-breakdown/latest` all return 401 rather than 404 without a key, so
 * the paths below are right. The auth header name — `auth-token` — is from
 * their API docs. `fetchText` cannot send custom headers, so this adapter does
 * its own fetch.
 *
 * ## The free tier is one zone, and that shapes the metric
 *
 * The free personal tier grants a single zone. There is no world aggregate on
 * any tier — Electricity Maps is a per-zone product, and building a global
 * figure would mean fetching 200+ zones on a commercial plan and weighting them
 * by consumption, which is a different and much larger piece of work.
 *
 * So `ELECTRICITY_MAPS_ZONE` selects the zone and the metric is explicitly about
 * that grid, defaulting to `DE` — Germany has a large, well-instrumented,
 * actively decarbonising grid and a long history in the dataset. It is a sample,
 * not the world, and the metric's `basis` says so on the tile. Treating one
 * zone's intensity as a world indicator would be the dishonest option here.
 *
 * NOTE: not run against a live authenticated response — no key was available
 * when this was written. Paths and header name are verified; the response
 * parsing follows the documented schema and is defensive.
 */

const BASE = 'https://api.electricitymap.org/v3';

const METRIC_ID = 'grid-carbon-intensity';
const SOURCE = 'electricitymaps:carbon-intensity';

const DEFAULT_ZONE = 'DE';

export function isElectricityMapsConfigured(): boolean {
  return Boolean(process.env.ELECTRICITY_MAPS_API_KEY);
}

function zone(): string {
  return process.env.ELECTRICITY_MAPS_ZONE || DEFAULT_ZONE;
}

interface HistoryResponse {
  history?: { datetime?: string; carbonIntensity?: number | null }[];
  zone?: string;
}

async function fetchJson(path: string): Promise<unknown> {
  const key = process.env.ELECTRICITY_MAPS_API_KEY;
  if (!key) {
    throw new Error(
      'ELECTRICITY_MAPS_API_KEY is not set — get one at https://portal.electricitymaps.com/',
    );
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 60_000);

  try {
    const response = await fetch(`${BASE}${path}`, {
      headers: { 'auth-token': key, 'User-Agent': USER_AGENT },
      signal: controller.signal,
    });

    if (!response.ok) {
      const detail = (await response.text()).slice(0, 200);
      // 401 here almost always means the key is fine but the zone is not
      // included in the plan, which is the single most likely failure on the
      // free tier and worth saying outright rather than leaving as "401".
      const hint =
        response.status === 401 || response.status === 403
          ? ` — check that zone "${zone()}" is included in your plan`
          : '';
      throw new Error(`Electricity Maps ${path} -> ${response.status}${hint}: ${detail}`);
    }

    return JSON.parse(await response.text());
  } finally {
    clearTimeout(timer);
  }
}

/**
 * The last 24 hours, hourly, collapsed to one daily mean.
 *
 * `/history` is the only free-tier window into the past and it returns 24 hours.
 * Storing all 24 points would trace the daily solar curve and nothing else —
 * intensity swings by a factor of two between noon and midnight — so what gets
 * stored is the day's mean, which is the figure that can be compared across
 * days and fitted for a trend.
 *
 * The consequence is that history accumulates only from the day ingest starts.
 * There is no backfill: `fetchAll` is `fetchLatest`, and the series grows one
 * point per day from first run.
 */
async function fetchDailyMean(): Promise<Observation[]> {
  const parsed = (await fetchJson(
    `/carbon-intensity/history?zone=${encodeURIComponent(zone())}`,
  )) as HistoryResponse;

  const history = parsed.history ?? [];
  const byDay = new Map<string, { sum: number; count: number }>();

  for (const point of history) {
    const intensity = point.carbonIntensity;
    if (typeof intensity !== 'number' || !Number.isFinite(intensity)) continue;

    const day = (point.datetime ?? '').slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) continue;

    const bucket = byDay.get(day) ?? { sum: 0, count: 0 };
    bucket.sum += intensity;
    bucket.count += 1;
    byDay.set(day, bucket);
  }

  const fetchedAt = new Date().toISOString();
  const observations: Observation[] = [];

  for (const [day, bucket] of [...byDay.entries()].sort()) {
    // A 24-hour window straddles two dates, so the older one is complete and the
    // newer one is a few hours. Require most of a day before storing a mean.
    if (bucket.count < 18) continue;

    observations.push({
      metricId: METRIC_ID,
      value: bucket.sum / bucket.count,
      observedAt: day,
      provenance: 'observed',
      sourceLastUpdated: null,
      sourceNextUpdate: null,
      fetchedAt,
      source: SOURCE,
      unit: 'gCO₂/kWh',
    });
  }

  if (observations.length === 0) {
    throw new Error(
      `Electricity Maps returned no complete day for zone ${zone()} ` +
        `(${history.length} hourly points).`,
    );
  }

  return observations;
}

export const electricityMapsAdapter: SourceAdapter = {
  id: SOURCE,
  label: 'Electricity Maps — grid carbon intensity',
  // Daily. The endpoint only reaches back 24 hours, so a missed day is a
  // permanent hole in the series — this is the one source here that cannot be
  // re-fetched after the fact.
  refreshCadence: '0 5 * * *',
  sourceUpdateCadence: 'daily',
  fetchLatest: fetchDailyMean,
  // Deliberately identical: there is no historical endpoint on the free tier,
  // so "everything" is the same 24 hours as "latest".
  fetchAll: fetchDailyMean,
};
