import type { Observation } from '../types.js';
import { fetchText, type SourceAdapter } from './types.js';

/**
 * UNHCR Refugee Data Finder — world forced displacement.
 *
 * A genuine public API with no key and no registration. Omitting the country
 * parameters entirely is what returns the world aggregate: passing
 * `coo_all=true` or `coa_all=true` instead expands to ~6,200 pages of
 * origin/asylum pairs that would then have to be summed, with double-counting
 * risk on every row. One request, one row per year.
 *
 * ## What is counted
 *
 * Refugees + asylum-seekers + internally displaced people.
 *
 * This is deliberately *not* UNHCR's headline "forcibly displaced" figure
 * (123.2M for 2024). That headline also folds in Palestine refugees under
 * UNRWA's mandate, "other people in need of international protection", and
 * "others of concern" — categories whose definitions have changed several times
 * over the period, most recently in 2023. Reconstructing it from these fields
 * does not reproduce the published number, and a series whose *definition*
 * moves is worse than a smaller one that holds still. The three categories here
 * are unambiguous and consistently reported, so the number is lower than the
 * one in UNHCR's press releases and comparable across years, which is the trade
 * this metric needs.
 *
 * ## Why the series starts in 1993
 *
 * The API returns refugee counts back to 1951, but `asylum_seekers` and `idps`
 * are literally `0` for every year before 1993 — they were not tracked, not
 * absent. Summing the three across that boundary produces a 4-million-person
 * jump in 1993 that is entirely an artefact of UNHCR starting to count, and
 * `nowcast` would happily fit a trend through it. So the series is cut at the
 * first year all three components exist.
 */

const BASE = 'https://api.unhcr.org/population/v1/population/';

const METRIC_ID = 'forced-displacement';
const SOURCE = 'unhcr:population';

/** First year `idps` and `asylum_seekers` are actually collected. */
const FIRST_COMPLETE_YEAR = 1993;

interface PopulationRow {
  year?: number | string;
  refugees?: number | string;
  asylum_seekers?: number | string;
  idps?: number | string;
}

interface PopulationResponse {
  items?: PopulationRow[];
}

/**
 * The API returns `"0"` and `"-"` as strings alongside genuine numbers, so every
 * field has to be coerced rather than trusted. `"-"` means "not reported",
 * which for a component of a sum is zero.
 */
function toNumber(value: number | string | undefined): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value !== 'string') return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

async function fetchFrom(yearFrom: number): Promise<Observation[]> {
  const params = new URLSearchParams({
    yearFrom: String(yearFrom),
    // Deliberately open-ended: the API clamps to the latest year it has, and
    // hardcoding a bound here would silently stop ingesting a year from now.
    yearTo: String(new Date().getUTCFullYear() + 1),
    columns: 'refugees,asylum_seekers,idps',
  });

  const body = await fetchText(`${BASE}?${params.toString()}`);
  const parsed = JSON.parse(body) as PopulationResponse;
  const rows = parsed.items ?? [];

  const fetchedAt = new Date().toISOString();
  const observations: Observation[] = [];

  for (const row of rows) {
    const year = Number(row.year);
    if (!Number.isFinite(year) || year < FIRST_COMPLETE_YEAR) continue;

    const total = toNumber(row.refugees) + toNumber(row.asylum_seekers) + toNumber(row.idps);
    if (total <= 0) continue;

    observations.push({
      metricId: METRIC_ID,
      value: total / 1_000_000,
      observedAt: `${year}-01-01`,
      provenance: 'observed',
      sourceLastUpdated: null,
      sourceNextUpdate: null,
      fetchedAt,
      source: SOURCE,
      unit: 'M people',
    });
  }

  if (observations.length === 0) {
    throw new Error(
      `UNHCR returned no usable world rows from ${yearFrom}. ` +
        'Check that the country parameters are still omitted — passing them switches the ' +
        'response to per-country pairs and this aggregate disappears.',
    );
  }

  return observations;
}

export const unhcrAdapter: SourceAdapter = {
  id: SOURCE,
  label: 'UNHCR — Refugee Data Finder',
  // UNHCR publishes the consolidated year in June and revises through the year;
  // per-situation portals move faster but do not feed this aggregate.
  refreshCadence: '0 8 * * 3',
  sourceUpdateCadence: 'annual',
  // The whole series is one request, so there is no separate backfill path.
  fetchAll: () => fetchFrom(FIRST_COMPLETE_YEAR),
  fetchLatest: () => fetchFrom(new Date().getUTCFullYear() - 3),
};
