/**
 * CSV parsing for OWID grapher exports.
 *
 * Two things here are load-bearing and were both found by probing the real
 * endpoints rather than reading the docs:
 *
 * 1. The third column is `Year` on annual charts and `Day` on daily ones, and
 *    nothing in the response announces which. `parseOwidCsv` reads the header
 *    rather than assuming a position, and normalises both into an ISO date.
 *
 * 2. `csvType=filtered&country=OWID_WRL` does NOT reliably filter. On charts
 *    whose saved view is the map tab it returns every country at a single year
 *    and ignores the country param entirely — which looks like a successful
 *    fetch and silently ingests Zimbabwe as the world. The adapter therefore
 *    requests `csvType=full` and filters on the ISO code here, where a missing
 *    World row is a loud error instead of a wrong number.
 */

/** A parsed CSV row, before it becomes an Observation. */
export interface OwidRow {
  entity: string;
  code: string;
  /** ISO date. Annual rows become YYYY-01-01. */
  date: string;
  /** The raw year/day token, kept for diagnostics. */
  period: string;
  values: Record<string, string>;
}

/**
 * Minimal RFC-4180 split: handles quoted fields containing commas and escaped
 * quotes. OWID entity names include "Congo, Dem. Rep." and similar, so a naive
 * `split(',')` shifts every subsequent column on those rows.
 */
export function splitCsvLine(line: string): string[] {
  const fields: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];

    if (inQuotes) {
      if (char === '"') {
        // A doubled quote inside a quoted field is a literal quote.
        if (line[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      fields.push(field);
      field = '';
    } else {
      field += char;
    }
  }

  fields.push(field);
  return fields;
}

/**
 * OWID sometimes answers with a JSON error body and a 200, most notably for
 * charts carrying non-redistributable data:
 *
 *   {"status":403,"error":"This chart contains non-redistributable data..."}
 *
 * Parsed as CSV that becomes a one-row table with a garbage header, so it has
 * to be caught before anything downstream trusts it.
 */
export function assertNotJsonError(body: string, slug: string): void {
  const head = body.trimStart();
  if (!head.startsWith('{')) return;

  try {
    const parsed = JSON.parse(head) as { error?: string; status?: number };
    throw new Error(
      `OWID refused ${slug}: ${parsed.error ?? head.slice(0, 200)} (status ${parsed.status ?? '?'})`,
    );
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('OWID refused')) throw error;
    throw new Error(`OWID returned a non-CSV body for ${slug}: ${head.slice(0, 200)}`);
  }
}

/** Turns a `Year` or `Day` token into an ISO date. */
export function periodToIsoDate(period: string, columnName: string): string {
  const token = period.trim();

  // Daily charts already carry a full date.
  if (/^\d{4}-\d{2}-\d{2}$/.test(token)) return token;

  const year = Number(token);
  if (!Number.isInteger(year)) {
    throw new Error(`Unparseable ${columnName} value: ${JSON.stringify(period)}`);
  }

  // Negative years appear in long-run series (poverty reaches back to -10000).
  // `padStart` keeps them from silently becoming "-100-01-01".
  const sign = year < 0 ? '-' : '';
  return `${sign}${String(Math.abs(year)).padStart(4, '0')}-01-01`;
}

export interface ParsedOwidCsv {
  /** Data column keys, in order, excluding entity/code/period. */
  columns: string[];
  /** Whether the third column was `Day` (daily) or `Year` (annual). */
  periodColumn: 'Year' | 'Day';
  rows: OwidRow[];
}

/**
 * Parses a grapher CSV.
 *
 * `entityCode` filters to a single entity — pass `OWID_WRL` for the world
 * aggregate. Filtering here rather than in the request is deliberate; see the
 * note at the top of this file.
 */
export function parseOwidCsv(body: string, options: { slug: string; entityCode?: string }): ParsedOwidCsv {
  assertNotJsonError(body, options.slug);

  const lines = body.trim().split(/\r?\n/);
  if (lines.length < 2) throw new Error(`Empty CSV for ${options.slug}`);

  const header = splitCsvLine(lines[0]);
  if (header.length < 4) {
    throw new Error(`Unexpected CSV header for ${options.slug}: ${JSON.stringify(header)}`);
  }

  // Column three is the variance the spec called out. `useColumnShortNames`
  // lowercases the fixed columns, so compare case-insensitively.
  const periodHeader = header[2].trim().toLowerCase();
  if (periodHeader !== 'year' && periodHeader !== 'day') {
    throw new Error(
      `Expected a Year or Day column in position 3 for ${options.slug}, found ${JSON.stringify(header[2])}`,
    );
  }
  const periodColumn = periodHeader === 'day' ? 'Day' : 'Year';
  const columns = header.slice(3);

  const rows: OwidRow[] = [];
  for (const line of lines.slice(1)) {
    if (!line.trim()) continue;
    const fields = splitCsvLine(line);
    if (fields.length < 3) continue;

    const code = fields[1]?.trim() ?? '';
    if (options.entityCode && code !== options.entityCode) continue;

    const values: Record<string, string> = {};
    columns.forEach((column, index) => {
      values[column] = fields[3 + index] ?? '';
    });

    rows.push({
      entity: fields[0],
      code,
      period: fields[2],
      date: periodToIsoDate(fields[2], periodColumn),
      values,
    });
  }

  // Long-run series are not always emitted in date order once filtered.
  rows.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

  return { columns, periodColumn, rows };
}
