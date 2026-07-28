import { parseOwidCsv } from '../csv.js';
import type { Cadence, Observation, Provenance } from '../types.js';
import { fetchText, type SourceAdapter } from './types.js';

/**
 * The workhorse. Most metrics come from an OWID grapher chart.
 *
 * One adapter instance per chart, built by `makeOwidAdapter` — the config in
 * `config/metrics.ts` is the only place slugs appear.
 */

const BASE = 'https://ourworldindata.org/grapher';

/** The subset of `.metadata.json` we actually use. */
interface OwidMetadata {
  columns?: Record<
    string,
    {
      unit?: string;
      shortUnit?: string;
      lastUpdated?: string;
      nextUpdate?: string;
      titleShort?: string;
    }
  >;
}

export interface OwidAdapterOptions {
  metricId: string;
  slug: string;
  /** Extra grapher params, e.g. `{ age_group: 'adult', sex: 'both' }`. */
  params?: Record<string, string>;
  /**
   * Which data column to read. Defaults to the first, which is correct for
   * every chart we use — but poverty and renewables ship extra columns
   * (population, region, `__original_year`), so naming it is safer than
   * trusting order when a chart changes upstream.
   */
  columnIndex?: number;
  refreshCadence: string;
  sourceUpdateCadence: Cadence;
  unit: string;
  /** See `MetricConfig.observedThroughYear`. */
  observedThroughYear?: number;
}

/**
 * OWID appends a `<column>__original_year` column on charts where values are
 * carried forward between survey years. When it disagrees with the row's own
 * year, the value is an interpolation or a projection, not a fresh measurement
 * — the World Bank poverty series ships values dated years ahead of its last
 * survey this way.
 *
 * Treating those as observed would mean our nowcast extrapolates from someone
 * else's extrapolation while labelling the result "observed", which is exactly
 * the confusion the provenance flag exists to prevent.
 */
function provenanceOf(row: { period: string; values: Record<string, string> }, column: string): Provenance {
  const original = row.values[`${column}__original_year`];
  if (!original) return 'observed';

  const originalYear = Number(original);
  const rowYear = Number(row.period.slice(0, 4));
  if (!Number.isFinite(originalYear) || !Number.isFinite(rowYear)) return 'observed';

  return originalYear < rowYear ? 'projected' : 'observed';
}

export function makeOwidAdapter(options: OwidAdapterOptions): SourceAdapter {
  const { metricId, slug, params = {}, columnIndex = 0 } = options;
  const suffix = new URLSearchParams(params).toString();

  const metadataUrl = `${BASE}/${slug}.metadata.json${suffix ? `?${suffix}` : ''}`;
  // `csvType=full` deliberately, not `filtered`. See the note in csv.ts: the
  // country param is ignored on map-tab charts and returns every country at one
  // year, which parses cleanly and is completely wrong.
  const csvUrl = `${BASE}/${slug}.csv?${['csvType=full', 'useColumnShortNames=true', suffix]
    .filter(Boolean)
    .join('&')}`;

  async function fetchAll(): Promise<Observation[]> {
    const [metadataBody, csvBody] = await Promise.all([fetchText(metadataUrl), fetchText(csvUrl)]);

    const metadata = JSON.parse(metadataBody) as OwidMetadata;
    const metaColumns = Object.values(metadata.columns ?? {});
    const meta = metaColumns[columnIndex] ?? metaColumns[0];

    const parsed = parseOwidCsv(csvBody, { slug, entityCode: 'OWID_WRL' });

    if (parsed.rows.length === 0) {
      // The failure mode worth being loud about: a chart with no World
      // aggregate returns a perfectly valid CSV of country rows, and filtering
      // leaves nothing. Silently emitting zero observations would look like a
      // successful no-op run.
      throw new Error(
        `No OWID_WRL rows for ${slug}. The chart may have no world aggregate — check before adding it.`,
      );
    }

    // Skip the derived `__original_year` companions when picking the data
    // column, or `columnIndex: 1` lands on metadata rather than a second series.
    const dataColumns = parsed.columns.filter((column) => !column.endsWith('__original_year'));
    const column = dataColumns[columnIndex];
    if (!column) {
      throw new Error(
        `Column ${columnIndex} missing for ${slug}; available: ${JSON.stringify(dataColumns)}`,
      );
    }

    const fetchedAt = new Date().toISOString();
    const observations: Observation[] = [];

    for (const row of parsed.rows) {
      const raw = row.values[column];
      if (raw === undefined || raw.trim() === '') continue;

      const value = Number(raw);
      if (!Number.isFinite(value)) continue;

      // The explicit cutoff wins over the marker column: where both exist they
      // agree, and where the marker is missing this is the only thing standing
      // between a republished nowcast and our observation table.
      const beyondCutoff =
        options.observedThroughYear !== undefined &&
        Number(row.date.slice(0, 4)) > options.observedThroughYear;

      observations.push({
        metricId,
        value,
        observedAt: row.date,
        provenance: beyondCutoff ? 'projected' : provenanceOf(row, column),
        sourceLastUpdated: meta?.lastUpdated ?? null,
        sourceNextUpdate: meta?.nextUpdate ?? null,
        fetchedAt,
        source: `owid:${slug}`,
        unit: options.unit,
      });
    }

    return observations;
  }

  return {
    id: `owid:${slug}`,
    label: `Our World in Data — ${slug}`,
    refreshCadence: options.refreshCadence,
    sourceUpdateCadence: options.sourceUpdateCadence,
    fetchAll,
    // OWID has no incremental endpoint; the full CSV is the only shape on
    // offer. Storage is idempotent per (metric, date, source), so re-sending
    // the whole series costs a few hundred KB and nothing else.
    fetchLatest: fetchAll,
  };
}
