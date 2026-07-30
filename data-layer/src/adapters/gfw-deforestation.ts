import type { Observation } from '../types.js';
import { fetchText, type SourceAdapter } from './types.js';

/**
 * Global Forest Watch — integrated deforestation alerts.
 *
 * `gfw_integrated_alerts` is the combined GLAD-Landsat + GLAD-Sentinel-2 + RADD
 * product, which is the right choice over any single one of them: the three
 * have different sensors, revisit rates and geographic coverage, so a series
 * built on one alone steps whenever that system's coverage changes.
 *
 * Requires a free API key: https://data-api.globalforestwatch.org/#tag/Authentication
 * Set `GFW_API_KEY`. Without it the adapter reports itself unavailable rather
 * than throwing, so a refresh run degrades to leaving this metric stale instead
 * of failing the whole job — the same contract as the Ember adapter.
 *
 * The dataset name, the field names in the SQL below, and the 403-without-key
 * behaviour were all read off the live API:
 *   .../dataset/gadm__integrated_alerts__iso_daily_alerts/latest/fields
 * That endpoint is open; only `/query` is gated. If the SQL here starts failing,
 * check the field list there first — GFW versions these datasets and the
 * `latest` alias moves.
 *
 * ## Caveat that belongs on the tile
 *
 * Alert *area* is not deforested area. An alert is a detection of likely tree
 * cover loss, it includes natural disturbance and some plantation harvest, and
 * the systems have grown more sensitive over time — coverage expanded to new
 * regions in 2021 and 2023. So the level is not comparable to FAO or Hansen
 * annual forest loss, and long-run trend claims from it are weak. What it is
 * good for is direction over a few years and for being *current*, which no
 * annual forest statistic is.
 *
 * NOTE: unlike the NOAA, NSIDC, WHO and UNHCR adapters, this one has not been
 * run against a live response — no key was available at the time it was
 * written. The request shape is built from the published schema; the parsing is
 * defensive for that reason.
 */

const BASE = 'https://data-api.globalforestwatch.org';
const DATASET = 'gadm__integrated_alerts__iso_daily_alerts';

const METRIC_ID = 'deforestation-alerts';
const SOURCE = 'gfw:integrated-alerts';

export function isGfwConfigured(): boolean {
  return Boolean(process.env.GFW_API_KEY);
}

interface QueryResponse {
  data?: { week_start?: string; alert_area_ha?: number | string }[];
}

/**
 * Weekly world total alert area.
 *
 * Aggregated in the query rather than client-side: the raw table is one row per
 * country per day per confidence class per land-cover flag combination, which is
 * millions of rows, and GFW's query endpoint has a response size limit that a
 * `SELECT *` would blow through immediately.
 *
 * High-confidence alerts only. The low-confidence tier is dominated by cloud and
 * sensor artefacts and its volume swings with weather rather than with logging.
 */
function buildSql(fromDate: string): string {
  return [
    "SELECT DATE_TRUNC('week', gfw_integrated_alerts__date) AS week_start,",
    'SUM(alert_area__ha) AS alert_area_ha',
    'FROM data',
    `WHERE gfw_integrated_alerts__date >= '${fromDate}'`,
    "AND gfw_integrated_alerts__confidence = 'high'",
    'GROUP BY week_start',
    'ORDER BY week_start',
  ].join(' ');
}

async function fetchFrom(fromDate: string): Promise<Observation[]> {
  const key = process.env.GFW_API_KEY;
  if (!key) {
    throw new Error(
      'GFW_API_KEY is not set — create one at https://data-api.globalforestwatch.org/#tag/Authentication',
    );
  }

  const url = `${BASE}/dataset/${DATASET}/latest/query?sql=${encodeURIComponent(buildSql(fromDate))}`;

  // `fetchText` sends no auth header, so the key goes on the query string form
  // GFW also accepts. Kept out of any error message below for that reason.
  const body = await fetchText(`${url}&x-api-key=${encodeURIComponent(key)}`);
  const parsed = JSON.parse(body) as QueryResponse;
  const rows = parsed.data ?? [];

  const fetchedAt = new Date().toISOString();
  const observations: Observation[] = [];

  for (const row of rows) {
    const area = typeof row.alert_area_ha === 'string' ? Number(row.alert_area_ha) : row.alert_area_ha;
    if (typeof area !== 'number' || !Number.isFinite(area)) continue;

    const week = (row.week_start ?? '').slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(week)) continue;

    observations.push({
      metricId: METRIC_ID,
      value: area / 1000,
      observedAt: week,
      provenance: 'observed',
      sourceLastUpdated: null,
      sourceNextUpdate: null,
      fetchedAt,
      source: SOURCE,
      unit: 'k ha/wk',
    });
  }

  if (observations.length === 0) {
    throw new Error(
      `GFW returned no usable rows from ${fromDate}. Check the field names against ` +
        `${BASE}/dataset/${DATASET}/latest/fields — the dataset is versioned and "latest" moves.`,
    );
  }

  // The most recent week is always partial, and a half-week of alerts reads as a
  // 50% improvement. Drop it rather than let the tile celebrate a Tuesday.
  return observations.slice(0, -1);
}

/** RADD joins the integrated product here; earlier weeks are GLAD-only. */
const SERIES_START = '2021-01-01';

export const gfwDeforestationAdapter: SourceAdapter = {
  id: SOURCE,
  label: 'Global Forest Watch — integrated deforestation alerts',
  refreshCadence: '0 9 * * 4',
  sourceUpdateCadence: 'daily',
  fetchAll: () => fetchFrom(SERIES_START),
  // Alerts are revised as confidence is upgraded on later satellite passes, so
  // the trailing quarter genuinely moves and is worth re-reading.
  fetchLatest: () => {
    const from = new Date();
    from.setUTCMonth(from.getUTCMonth() - 3);
    return fetchFrom(from.toISOString().slice(0, 10));
  },
};
