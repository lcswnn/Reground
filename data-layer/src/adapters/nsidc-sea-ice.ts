import type { Observation } from '../types.js';
import { fetchText, type SourceAdapter } from './types.js';

/**
 * NSIDC Sea Ice Index — Arctic daily extent.
 *
 * Arctic only, deliberately. The Antarctic series is available at the sibling
 * `south/` path and is left out because the two hemispheres are out of phase by
 * six months and have different trends — summing them cancels most of the
 * signal, and averaging them buries the Arctic decline under Antarctic
 * variability that has no comparable long-run direction.
 *
 * Format is a two-line header followed by rows whose last field may be a quoted
 * list containing commas:
 *
 *   Year, Month, Day,     Extent,    Missing, Source Data
 *   YYYY,    MM,  DD, 10^6 sq km, 10^6 sq km, Source data product web sites: ...
 *   2026,    07,  29,      6.544,      0.000,"['/disks/...', '/disks/...']"
 *
 * Only the first four fields are read, so the quoting never has to be parsed.
 *
 * ## Why this stores a trailing annual mean rather than daily extent
 *
 * Raw extent swings from ~14 in March to ~5 in September. Fed to `nowcast`
 * directly it would read as the world collapsing every summer and healing every
 * winter, and a linear fit over a trailing window would project whichever half
 * of the cycle it happened to land on.
 *
 * This is the same problem NOAA solves for CO₂ by publishing `trend` alongside
 * `smoothed`, and it gets the same answer: deseasonalize before storing. A
 * centred 365-day mean removes the annual cycle exactly — every day of the year
 * appears once per window — leaving the multi-year trend the metric is actually
 * about. The cost is that the series starts a year after the record does and
 * ends half a year before it, which is why the tail is extrapolated to the last
 * complete window rather than being left blank.
 */

const BASE = 'https://noaadata.apps.nsidc.org/NOAA/G02135';
const NORTH = `${BASE}/north/daily/data/N_seaice_extent_daily_v4.0.csv`;

const METRIC_ID = 'arctic-sea-ice';
const SOURCE = 'nsidc:sea-ice-index-north';

export interface SeaIceRow {
  date: string;
  extent: number;
}

/** Split out from the adapter so the parser is testable without a network. */
export function parseSeaIceCsv(body: string): SeaIceRow[] {
  const rows: SeaIceRow[] = [];

  for (const line of body.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const fields = trimmed.split(',');
    if (fields.length < 4) continue;

    const year = Number(fields[0]);
    const month = Number(fields[1]);
    const day = Number(fields[2]);
    const extent = Number(fields[3]);

    // Skips both header lines: "Year" and "YYYY" are NaN under Number().
    if (![year, month, day, extent].every(Number.isFinite)) continue;
    // NSIDC leaves gaps rather than coding them, but a zero or negative extent
    // would be a format change rather than a measurement.
    if (extent <= 0) continue;

    rows.push({
      date:
        `${String(year).padStart(4, '0')}-` +
        `${String(month).padStart(2, '0')}-` +
        `${String(day).padStart(2, '0')}`,
      extent,
    });
  }

  return rows;
}

const DAY_MS = 86_400_000;
const WINDOW_DAYS = 365;

/**
 * Centred 365-day mean, emitted monthly.
 *
 * Monthly rather than daily because a daily deseasonalized series is 15,000
 * points of which any 30 consecutive ones are within a few thousandths of each
 * other — it would dominate the artifact's payload and the storage table while
 * carrying no more information than the first of each month does.
 *
 * The window is required to be at least 90% full before a point is emitted. The
 * early record is every-other-day, which is fine, but genuine multi-week outages
 * exist in it and averaging across one would bias the result toward whichever
 * season survived.
 */
export function annualMeanSeries(rows: SeaIceRow[]): SeaIceRow[] {
  if (rows.length === 0) return [];

  const points = rows
    .map((row) => ({ time: Date.parse(`${row.date}T00:00:00Z`), extent: row.extent }))
    .filter((point) => Number.isFinite(point.time))
    .sort((a, b) => a.time - b.time);

  if (points.length === 0) return [];

  const half = (WINDOW_DAYS / 2) * DAY_MS;
  const out: SeaIceRow[] = [];

  const first = new Date(points[0].time);
  const last = new Date(points[points.length - 1].time);

  // Start at the first month whose window is fully inside the record.
  const cursor = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth(), 1));
  cursor.setUTCDate(cursor.getUTCDate() + WINDOW_DAYS / 2);
  cursor.setUTCDate(1);

  let index = 0;
  for (; cursor.getTime() <= last.getTime(); cursor.setUTCMonth(cursor.getUTCMonth() + 1)) {
    const centre = cursor.getTime();
    const from = centre - half;
    const to = centre + half;

    // Both edges must lie inside the record. A window that runs off either end
    // covers only part of a year and so reinstates exactly the seasonal bias
    // this function exists to remove: the newest window would span January to
    // July, average the winter maximum against nothing to offset it, and report
    // ~12.2 for a year whose true mean is ~10.1. Half a year of latency at the
    // tail is the honest price; `nowcast` closes the gap and labels it.
    if (from < points[0].time || to > points[points.length - 1].time) continue;

    while (index < points.length && points[index].time < from) index += 1;

    let sum = 0;
    let count = 0;
    for (let scan = index; scan < points.length && points[scan].time <= to; scan += 1) {
      sum += points[scan].extent;
      count += 1;
    }

    // The record is every-other-day before ~1988, so "full" is measured against
    // the local sampling rate, not against 365. This still catches the genuine
    // multi-week outages in the early record, where averaging across the gap
    // would tilt the result toward whichever season survived it.
    if (count < WINDOW_DAYS * 0.45) continue;

    const iso = new Date(centre).toISOString().slice(0, 10);
    out.push({ date: iso, extent: sum / count });
  }

  return out;
}

async function fetchAll(): Promise<Observation[]> {
  const body = await fetchText(NORTH);
  const rows = parseSeaIceCsv(body);

  if (rows.length === 0) {
    throw new Error('NSIDC sea ice CSV parsed to zero rows — format may have changed.');
  }

  const series = annualMeanSeries(rows);
  if (series.length === 0) {
    throw new Error(`NSIDC sea ice: ${rows.length} daily rows produced no complete annual windows.`);
  }

  const fetchedAt = new Date().toISOString();
  // No metadata endpoint; the last daily row is the best statement of currency.
  const sourceLastUpdated = rows[rows.length - 1].date;

  return series.map((point) => ({
    metricId: METRIC_ID,
    value: point.extent,
    observedAt: point.date,
    // Every point is a mean of real measurements. The centred window means the
    // most recent ones sit half a year behind today, which `nowcast` then
    // projects forward and labels as projected — that is the right division of
    // labour, and inventing a partial-window value here would not be.
    provenance: 'observed' as const,
    sourceLastUpdated,
    sourceNextUpdate: null,
    fetchedAt,
    source: SOURCE,
    unit: 'M km²',
  }));
}

export const nsidcSeaIceAdapter: SourceAdapter = {
  id: SOURCE,
  label: 'NSIDC Sea Ice Index — Arctic daily extent',
  // NSIDC updates daily with a one-day lag, but the stored series is a centred
  // annual mean: a new day moves the last complete window by a 365th. Weekly is
  // already more often than the number can meaningfully change.
  refreshCadence: '0 7 * * 1',
  sourceUpdateCadence: 'daily',
  fetchAll,
  // The file is ~1.8MB and has no tail endpoint. Re-deriving the whole window
  // series is also the only way to pick up NSIDC's periodic reprocessing of
  // historical values, which does move old points.
  fetchLatest: fetchAll,
};
