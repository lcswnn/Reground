import type { Observation } from '../types.js';
import { fetchText, type SourceAdapter } from './types.js';

/**
 * Ember monthly electricity data.
 *
 * Exists to upgrade renewable share from OWID's annual resolution to monthly,
 * so the metric moves several times a year on real measurements rather than
 * only on the nowcast. Ember publishes twice a month (first and third week),
 * CC BY 4.0.
 *
 * Requires a free API key: https://ember-energy.org/data/api/
 * Set `EMBER_API_KEY`. Without it the adapter reports itself unavailable rather
 * than throwing, so a refresh run degrades to the OWID annual series for this
 * metric instead of failing the whole job.
 *
 * The endpoint and parameter names below come from the live OpenAPI spec at
 * https://api.ember-energy.org/v1/openapi.json, not from prose docs.
 */

const BASE = 'https://api.ember-energy.org/v1/electricity-generation/monthly';

const METRIC_ID = 'renewable-share';

/** Ember returns a `{ data: [...] }` envelope. */
interface EmberResponse {
  data?: {
    date?: string;
    entity?: string;
    entity_code?: string;
    series?: string;
    share_of_generation_pct?: number;
    generation_twh?: number;
  }[];
}

export function isEmberConfigured(): boolean {
  return Boolean(process.env.EMBER_API_KEY);
}

function buildUrl(startDate: string): string {
  const params = new URLSearchParams({
    entity: 'World',
    is_aggregate_entity: 'true',
    series: 'Renewables',
    start_date: startDate,
    api_key: process.env.EMBER_API_KEY ?? '',
  });
  return `${BASE}?${params.toString()}`;
}

async function fetchFrom(startDate: string): Promise<Observation[]> {
  if (!isEmberConfigured()) {
    throw new Error('EMBER_API_KEY is not set — register at https://ember-energy.org/data/api/');
  }

  const body = await fetchText(buildUrl(startDate));
  const parsed = JSON.parse(body) as EmberResponse;
  const rows = parsed.data ?? [];

  const fetchedAt = new Date().toISOString();
  const observations: Observation[] = [];

  for (const row of rows) {
    const share = row.share_of_generation_pct;
    if (typeof share !== 'number' || !Number.isFinite(share)) continue;
    if (!row.date) continue;

    // Ember dates monthly rows as YYYY-MM; normalise to the first of the month
    // so they sort alongside the annual points stored as YYYY-01-01.
    const observedAt = /^\d{4}-\d{2}$/.test(row.date) ? `${row.date}-01` : row.date;

    observations.push({
      metricId: METRIC_ID,
      value: share,
      observedAt,
      provenance: 'observed',
      sourceLastUpdated: null,
      sourceNextUpdate: null,
      fetchedAt,
      source: 'ember:monthly-generation',
      unit: '%',
    });
  }

  if (observations.length === 0) {
    throw new Error(
      `Ember returned no usable rows from ${startDate}. Check the series name and entity in the OpenAPI spec.`,
    );
  }

  return observations;
}

export const emberAdapter: SourceAdapter = {
  id: 'ember:monthly-generation',
  label: 'Ember — monthly electricity generation',
  // Twice-monthly publication; polling weekly catches both without hammering.
  refreshCadence: '0 9 * * 1',
  sourceUpdateCadence: 'monthly',
  // Ember's monthly series starts in 2015.
  fetchAll: () => fetchFrom('2015-01'),
  // A rolling two-year tail is plenty to pick up revisions to recent months,
  // which is the only part of the series that moves.
  fetchLatest: () => {
    const from = new Date();
    from.setFullYear(from.getFullYear() - 2);
    return fetchFrom(`${from.getFullYear()}-${String(from.getMonth() + 1).padStart(2, '0')}`);
  },
};
