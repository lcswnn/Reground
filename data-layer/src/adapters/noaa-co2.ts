import type { Observation } from '../types.js';
import { fetchText, type SourceAdapter } from './types.js';

/**
 * NOAA GML global CO₂ daily trend.
 *
 * One of the very few genuinely daily sources in the set, which makes it the
 * only metric whose displayed number moves without a nowcast. Everything else
 * is annual and projected forward.
 *
 * Format is a whitespace-delimited text file behind `#` comment lines:
 *
 *   # year  month  day  smoothed  trend
 *     2026     7    27    425.12    427.84
 *
 * We take `trend`, not `smoothed`: `smoothed` retains the seasonal cycle, so it
 * rises and falls ~6ppm through the year and would read as the world getting
 * better every northern summer. `trend` is the seasonally adjusted series,
 * which is the one that answers "is this going up".
 */

const URL = 'https://gml.noaa.gov/webdata/ccgg/trends/co2/co2_trend_gl.txt';

const METRIC_ID = 'co2-concentration';

export interface NoaaRow {
  date: string;
  smoothed: number;
  trend: number;
}

/** Split out from the adapter so the parser is testable without a network. */
export function parseNoaaTrend(body: string): NoaaRow[] {
  const rows: NoaaRow[] = [];

  for (const line of body.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const fields = trimmed.split(/\s+/);
    if (fields.length < 5) continue;

    const [year, month, day, smoothed, trend] = fields.map(Number);
    if (![year, month, day, smoothed, trend].every(Number.isFinite)) continue;

    // NOAA uses -999.99 for missing values rather than an empty field.
    if (trend < 0 || smoothed < 0) continue;

    rows.push({
      date: `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
      smoothed,
      trend,
    });
  }

  return rows;
}

async function fetchAll(): Promise<Observation[]> {
  const body = await fetchText(URL);
  const rows = parseNoaaTrend(body);

  if (rows.length === 0) {
    throw new Error('NOAA global CO₂ trend file parsed to zero rows — format may have changed.');
  }

  const fetchedAt = new Date().toISOString();
  // The file has no metadata endpoint; its last data point is the best
  // available statement of how current it is.
  const sourceLastUpdated = rows[rows.length - 1].date;

  return rows.map((row) => ({
    metricId: METRIC_ID,
    value: row.trend,
    observedAt: row.date,
    provenance: 'observed' as const,
    sourceLastUpdated,
    // NOAA publishes no forward schedule; it simply updates most days.
    sourceNextUpdate: null,
    fetchedAt,
    source: 'noaa:co2-trend-gl',
    unit: 'ppm',
  }));
}

export const noaaCo2Adapter: SourceAdapter = {
  id: 'noaa:co2-trend-gl',
  label: 'NOAA GML — global CO₂ daily trend',
  // Genuinely daily, and cheap: one ~200KB text file.
  refreshCadence: '0 8 * * *',
  sourceUpdateCadence: 'daily',
  fetchAll,
  // The whole file is ~3,900 lines; there is no tail endpoint, and slicing it
  // client-side would save nothing worth the branch.
  fetchLatest: fetchAll,
};
