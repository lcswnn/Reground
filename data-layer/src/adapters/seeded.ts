import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { Cadence, Observation } from '../types.js';
import type { SourceAdapter } from './types.js';

/**
 * Adapter for sources with no machine-readable feed.
 *
 * Some of the best indicators in this space are published once a year as a PDF
 * and a press release. RSF's Press Freedom Index, the Global Slavery Index,
 * Freedom House, Access Now's #KeepItOn shutdown counts and FEWS NET's IPC
 * classifications all fall in this category: real, authoritative, and not
 * available over HTTP as anything a program can parse.
 *
 * The options for those are to scrape a PDF whose layout changes every edition,
 * or to type the number in once a year. This layer takes the second: a CSV per
 * metric under `data-layer/data/`, checked into git, with the source URL and the
 * date it was entered recorded alongside every value.
 *
 * That is not a worse engineering answer, it is the honest one. A PDF scraper
 * for an annual report is a year-long silent failure waiting to happen — it
 * breaks on the next edition, and nobody finds out until the number on the tile
 * is a year stale. A CSV that a human updates once a year fails loudly, because
 * `staleAfterDays` below turns "nobody updated this" into a failed ingest run
 * that shows up in `ingest_runs` rather than into a quietly frozen tile.
 *
 * ## File format
 *
 *   # Any number of comment lines, for the source URL and the update procedure.
 *   observed_at,value,source_url,entered_on
 *   2024-01-01,66.02,https://rsf.org/en/index,2026-07-30
 *
 * `observed_at` is an ISO date; annual figures use YYYY-01-01, matching how the
 * OWID adapter stores them. `entered_on` is when a human copied the value in,
 * and exists so a stale file is detectable — it is not the observation date.
 */

const HERE = dirname(fileURLToPath(import.meta.url));

/** `data-layer/data/`, resolved from this file rather than from the cwd. */
export const SEED_DIR = resolve(HERE, '../../data');

export interface SeededRow {
  observedAt: string;
  value: number;
  sourceUrl: string | null;
  enteredOn: string | null;
}

/** Exported so the tests can exercise the parser without touching the disk. */
export function parseSeedCsv(body: string, label: string): SeededRow[] {
  const rows: SeededRow[] = [];
  let seenHeader = false;

  for (const line of body.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const fields = trimmed.split(',').map((field) => field.trim());

    if (!seenHeader) {
      seenHeader = true;
      // Tolerate a file that omits the header rather than silently eating its
      // first data row.
      if (fields[0]?.toLowerCase() === 'observed_at') continue;
    }

    const [observedAt, rawValue, sourceUrl, enteredOn] = fields;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(observedAt ?? '')) {
      throw new Error(`${label}: bad observed_at "${observedAt}" — expected YYYY-MM-DD.`);
    }

    const value = Number(rawValue);
    if (!Number.isFinite(value)) {
      throw new Error(`${label}: bad value "${rawValue}" at ${observedAt}.`);
    }

    rows.push({
      observedAt,
      value,
      sourceUrl: sourceUrl || null,
      enteredOn: /^\d{4}-\d{2}-\d{2}$/.test(enteredOn ?? '') ? enteredOn : null,
    });
  }

  return rows.sort((a, b) => a.observedAt.localeCompare(b.observedAt));
}

export interface SeededAdapterOptions {
  id: string;
  label: string;
  metricId: string;
  /** Filename under `data-layer/data/`. */
  file: string;
  unit: string;
  sourceUpdateCadence: Cadence;
  /**
   * How long after the newest `entered_on` the file is considered stale.
   *
   * Generous by default — an annual index published in April and entered in May
   * should not start failing in June. The point is to catch a file nobody has
   * touched in two publication cycles, not to nag.
   */
  staleAfterDays: number;
}

export function makeSeededAdapter(options: SeededAdapterOptions): SourceAdapter {
  async function fetchAll(): Promise<Observation[]> {
    const path = resolve(SEED_DIR, options.file);

    let body: string;
    try {
      body = await readFile(path, 'utf8');
    } catch {
      throw new Error(`${options.id}: no seed file at ${path}.`);
    }

    const rows = parseSeedCsv(body, options.id);

    if (rows.length === 0) {
      throw new Error(
        `${options.id}: ${options.file} has no data rows yet. ` +
          'Add values from the source named in the file header before enabling this metric.',
      );
    }

    const entered = rows
      .map((row) => row.enteredOn)
      .filter((date): date is string => date !== null)
      .sort();

    if (entered.length > 0) {
      const newest = new Date(`${entered[entered.length - 1]}T00:00:00Z`);
      const ageDays = (Date.now() - newest.getTime()) / 86_400_000;
      if (ageDays > options.staleAfterDays) {
        throw new Error(
          `${options.id}: ${options.file} was last updated ${Math.round(ageDays)} days ago ` +
            `(limit ${options.staleAfterDays}). Check the source for a new release and add it.`,
        );
      }
    }

    const fetchedAt = new Date().toISOString();

    return rows.map((row) => ({
      metricId: options.metricId,
      value: row.value,
      observedAt: row.observedAt,
      provenance: 'observed' as const,
      sourceLastUpdated: row.enteredOn,
      sourceNextUpdate: null,
      fetchedAt,
      source: options.id,
      unit: options.unit,
    }));
  }

  return {
    id: options.id,
    label: options.label,
    // Reading a local file is free. Daily means the staleness check reports in
    // `ingest_runs` promptly once a file falls behind.
    refreshCadence: '0 6 * * *',
    sourceUpdateCadence: options.sourceUpdateCadence,
    fetchAll,
    fetchLatest: fetchAll,
  };
}

/**
 * The manual-update metrics, and what each one costs to keep current.
 *
 * None of these is wired into `METRICS` yet — see `config/metrics.ts`. Each
 * needs its CSV populated from the source first, and the `basis` text written,
 * before it can be scored.
 */
export const SEEDED_ADAPTERS: SourceAdapter[] = [
  makeSeededAdapter({
    id: 'seed:press-freedom',
    label: 'RSF — World Press Freedom Index',
    metricId: 'press-freedom',
    file: 'press-freedom.csv',
    unit: 'score',
    sourceUpdateCadence: 'annual',
    // Published early May each year; two months of slack, then it complains.
    staleAfterDays: 430,
  }),
  makeSeededAdapter({
    id: 'seed:democracy',
    label: 'V-Dem — Liberal Democracy Index',
    metricId: 'democracy-index',
    file: 'democracy.csv',
    unit: 'index',
    sourceUpdateCadence: 'annual',
    staleAfterDays: 430,
  }),
  makeSeededAdapter({
    id: 'seed:internet-shutdowns',
    label: 'Access Now — #KeepItOn shutdown count',
    metricId: 'internet-shutdowns',
    file: 'internet-shutdowns.csv',
    unit: 'shutdowns',
    sourceUpdateCadence: 'annual',
    staleAfterDays: 430,
  }),
  makeSeededAdapter({
    id: 'seed:modern-slavery',
    label: 'Walk Free — Global Slavery Index',
    metricId: 'modern-slavery',
    file: 'modern-slavery.csv',
    unit: '/1k',
    // Published every ~5 years, so staleness is measured in years.
    sourceUpdateCadence: 'annual',
    staleAfterDays: 2000,
  }),
  makeSeededAdapter({
    id: 'seed:food-insecurity',
    label: 'FEWS NET / IPC — countries in Phase 3+',
    metricId: 'food-insecurity',
    file: 'food-insecurity.csv',
    unit: 'countries',
    sourceUpdateCadence: 'monthly',
    // Monthly source; a quarter without an update means nobody is watching.
    staleAfterDays: 120,
  }),
];
