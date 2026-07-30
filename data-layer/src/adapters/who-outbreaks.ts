import type { Observation } from '../types.js';
import { fetchText, type SourceAdapter } from './types.js';

/**
 * WHO Disease Outbreak News — annual count of published outbreak reports.
 *
 * The endpoint is an OData feed behind who.int's CMS rather than a documented
 * public API: there is no reference page for it, and the prose docs point only
 * at the HTML index. It is the same data that index renders, and it carries the
 * archive back to 1996.
 *
 * Verified behaviour, since none of it is written down anywhere:
 *   - `$select`, `$skip` work; `$count=true` returns `@odata.count` (3,192).
 *   - `$top` is capped at 100 — asking for 200 returns HTTP 400, not a clamped
 *     page, so the page size below is a hard limit rather than a preference.
 *   - Results are unordered and `$orderby` is accepted and ignored, so dates are
 *     sorted client-side rather than trusted in sequence.
 *
 * ## Why annual, when the source is continuous
 *
 * Because month-level precision is not recoverable from this feed.
 *
 * `PublicationDate` is corrupted for roughly a third of the archive. WHO
 * migrated who.int around mid-2021 and the migration overwrote the field on the
 * records it touched: 979 items — the entire 1996–2018 archive — carry
 * `PublicationDate` in June 2021, and a further block carries March 2021. Taken
 * at face value the field puts 979 outbreak reports in a single month and
 * leaves calendar year 2020 completely empty, which is how this was caught.
 *
 * `UrlName` survived the migration and is the reliable field, but it exists in
 * four formats, and one of them carries no month:
 *
 *   `2003_05_23b-en`                      → full date
 *   `24-july-2015-mers-saudi-arabia-en`   → full date
 *   `2020-DON236`                         → year only, no month or day
 *   `cholera---haiti` (post-migration)    → no date; PublicationDate is sound
 *
 * The third form covers the 2019–2022 block, ~640 records. There is no way to
 * recover a month for those short of fetching and parsing 640 article bodies,
 * so a monthly series would have a multi-year hole precisely where recent
 * history is. Year is recoverable for every record in the archive, so year is
 * what this stores.
 *
 * ## Read this before weighting it
 *
 * This counts *reports WHO chose to publish*, not outbreaks and not their
 * severity. One imported measles case and an Ebola epidemic are one item each,
 * and the annual totals track WHO's editorial practice at least as strongly as
 * they track the world: 189 in 2003 (SARS), 206 in 2014 (West Africa Ebola),
 * then a decline to 52 in 2024 that is substantially WHO consolidating many
 * short updates into fewer, longer ones rather than the world getting quieter.
 *
 * A metric whose downward trend is mostly an artefact of the publisher's style
 * guide should not be allowed to push a progress score upward, which is why
 * this ships at weight 0 — charted and visible, deliberately not scored. See
 * the note on `disease-outbreaks` in `config/metrics.ts`.
 */

const BASE = 'https://www.who.int/api/news/diseaseoutbreaknews';

const METRIC_ID = 'disease-outbreaks';
const SOURCE = 'who:disease-outbreak-news';

/** WHO's cap. Larger values 400 rather than clamping. */
const PAGE = 100;

interface DonRecord {
  PublicationDate?: string | null;
  UrlName?: string | null;
}

interface ODataPage {
  value?: DonRecord[];
  '@odata.count'?: number;
}

const MONTH_NAMES: Record<string, string> = {
  january: '01',
  february: '02',
  march: '03',
  april: '04',
  may: '05',
  june: '06',
  july: '07',
  august: '08',
  september: '09',
  october: '10',
  november: '11',
  december: '12',
};

/**
 * The publication year of one report, or null if nothing in the record says.
 *
 * Ordered by trust: the two dated `UrlName` forms first because they survived
 * the CMS migration, then the year-only DON form, and `PublicationDate` last
 * because it is only reliable for records created after the migration — which
 * is exactly the set that has no date in its slug.
 *
 * Exported for the tests, which pin all four formats against the real strings
 * observed in the feed.
 */
export function publicationYear(record: DonRecord): number | null {
  const slug = (record.UrlName ?? '').replace(/^\//, '').toLowerCase();

  // 2003_05_23b-en — a trailing letter disambiguates same-day reports.
  const iso = /^(\d{4})[-_](\d{2})[-_](\d{2})/.exec(slug);
  if (iso) return Number(iso[1]);

  // 24-july-2015-mers-saudi-arabia-en
  const long = /^(\d{1,2})-([a-z]+)-(\d{4})/.exec(slug);
  if (long && MONTH_NAMES[long[2]]) return Number(long[3]);

  // 2020-DON236 — year and a sequence number, no month.
  const don = /^(\d{4})[-_]?don\d*/.exec(slug);
  if (don) return Number(don[1]);

  // Post-migration records: no date in the slug, but the field is sound.
  const published = record.PublicationDate;
  if (typeof published === 'string' && /^\d{4}/.test(published)) {
    return Number(published.slice(0, 4));
  }

  return null;
}

async function fetchRecords(): Promise<DonRecord[]> {
  const records: DonRecord[] = [];
  let expected: number | null = null;

  for (let skip = 0; ; skip += PAGE) {
    const params = new URLSearchParams({
      $top: String(PAGE),
      $select: 'PublicationDate,UrlName',
    });
    if (skip > 0) params.set('$skip', String(skip));
    if (skip === 0) params.set('$count', 'true');

    const body = await fetchText(`${BASE}?${params.toString()}`);
    const page = JSON.parse(body) as ODataPage;
    const rows = page.value ?? [];

    if (skip === 0) {
      expected = typeof page['@odata.count'] === 'number' ? page['@odata.count'] : null;
      if (rows.length === 0) {
        throw new Error('WHO outbreak news returned an empty first page — endpoint may have moved.');
      }
    }

    records.push(...rows);

    if (rows.length < PAGE) break;
    // The feed is unordered, so a paging fault shows up as a run that never
    // ends rather than as a short read. Bound it by the API's own count.
    if (expected !== null && skip + PAGE >= expected) break;
    if (skip > 50_000) throw new Error('WHO outbreak news paging did not terminate.');
  }

  return records;
}

/** Reports per calendar year, oldest first, with interior gaps filled as zero. */
export function annualCounts(records: DonRecord[]): { year: number; count: number }[] {
  const perYear = new Map<number, number>();

  for (const record of records) {
    const year = publicationYear(record);
    if (year === null || year < 1990 || year > 2100) continue;
    perYear.set(year, (perYear.get(year) ?? 0) + 1);
  }

  if (perYear.size === 0) return [];

  const years = [...perYear.keys()].sort((a, b) => a - b);
  const out: { year: number; count: number }[] = [];

  // A year with no reports would be real information, so interior gaps are
  // filled rather than skipped — a missing year and a zero year must not render
  // as the same thing on a chart.
  for (let year = years[0]; year <= years[years.length - 1]; year += 1) {
    out.push({ year, count: perYear.get(year) ?? 0 });
  }

  return out;
}

async function fetchAll(): Promise<Observation[]> {
  const records = await fetchRecords();
  const series = annualCounts(records);

  if (series.length === 0) {
    throw new Error(
      `WHO outbreak news: ${records.length} records produced no dated years — ` +
        'the UrlName formats may have changed again.',
    );
  }

  const unresolved = records.filter((record) => publicationYear(record) === null).length;
  // Every record in the archive resolves today. If that stops being true, the
  // count silently drops and the metric quietly improves, so refuse instead.
  if (unresolved > records.length * 0.02) {
    throw new Error(
      `WHO outbreak news: ${unresolved} of ${records.length} records have no recoverable year.`,
    );
  }

  const fetchedAt = new Date().toISOString();
  const currentYear = new Date().getUTCFullYear();

  return series.map((point) => ({
    metricId: METRIC_ID,
    value: point.count,
    observedAt: `${point.year}-01-01`,
    // The current year is still accruing reports, so its count is a partial
    // total rather than a measurement — tagging it `projected` keeps `nowcast`
    // from fitting a trend to a year that is only half over and reading the
    // shortfall as improvement.
    provenance: point.year >= currentYear ? ('projected' as const) : ('observed' as const),
    sourceLastUpdated: null,
    sourceNextUpdate: null,
    fetchedAt,
    source: SOURCE,
    unit: 'reports',
  }));
}

export const whoOutbreaksAdapter: SourceAdapter = {
  id: SOURCE,
  label: 'WHO — Disease Outbreak News',
  // The stored series is annual, so there is nothing to gain from polling often.
  // Weekly keeps the current year's partial count roughly current.
  refreshCadence: '0 7 * * 2',
  sourceUpdateCadence: 'annual',
  fetchAll,
  // Counting by year requires the whole archive, and the whole archive is 32
  // requests returning two fields each. There is no cheaper incremental form.
  fetchLatest: fetchAll,
};
