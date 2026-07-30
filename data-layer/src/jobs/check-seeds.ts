/**
 * Reports how current each manually-maintained CSV is.
 *
 *   npx tsx data-layer/src/jobs/check-seeds.ts
 *   npx tsx data-layer/src/jobs/check-seeds.ts --strict   # exit 1 if any stale
 *
 * The seeded metrics are the ones whose sources publish a PDF once a year
 * instead of a feed. Nothing can fetch them, so the failure mode is not "the
 * fetch broke" — it is "a person stopped updating a file and nobody noticed for
 * eighteen months". This job exists to make that visible in the daily run log.
 *
 * Non-strict by default, and wired into the workflow that way: a stale press
 * freedom score is a nag, not a reason to skip publishing everything else.
 */

import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { parseSeedCsv, SEED_DIR, SEEDED_ADAPTERS } from '../adapters/seeded.js';
import { PENDING_METRICS } from '../config/metrics.js';

const strict = process.argv.includes('--strict');

/** Mirrors the `staleAfterDays` each adapter was built with. */
const WINDOWS: Record<string, number> = {
  'seed:press-freedom': 430,
  'seed:democracy': 430,
  'seed:internet-shutdowns': 430,
  'seed:modern-slavery': 2000,
  'seed:food-insecurity': 120,
};

const FILES: Record<string, string> = {
  'seed:press-freedom': 'press-freedom.csv',
  'seed:democracy': 'democracy.csv',
  'seed:internet-shutdowns': 'internet-shutdowns.csv',
  'seed:modern-slavery': 'modern-slavery.csv',
  'seed:food-insecurity': 'food-insecurity.csv',
};

async function main() {
  let stale = 0;
  let empty = 0;

  for (const adapter of SEEDED_ADAPTERS) {
    const file = FILES[adapter.id];
    const metric = PENDING_METRICS.find((entry) => entry.sourceAdapterId === adapter.id);
    const name = metric?.id ?? adapter.id;

    let rows;
    try {
      rows = parseSeedCsv(await readFile(resolve(SEED_DIR, file), 'utf8'), adapter.id);
    } catch (error) {
      console.log(`BAD    ${name.padEnd(20)} ${(error as Error).message}`);
      stale += 1;
      continue;
    }

    if (rows.length === 0) {
      // Not an error. These ship empty on purpose and their metrics are unscored
      // until someone fills them in.
      console.log(`EMPTY  ${name.padEnd(20)} awaiting first entry — ${file}`);
      empty += 1;
      continue;
    }

    const entered = rows
      .map((row) => row.enteredOn)
      .filter((date): date is string => date !== null)
      .sort();

    const latestObservation = rows[rows.length - 1].observedAt;

    if (entered.length === 0) {
      console.log(`OK?    ${name.padEnd(20)} ${rows.length} rows, no entered_on dates to age`);
      continue;
    }

    const newest = entered[entered.length - 1];
    const ageDays = Math.round((Date.now() - Date.parse(`${newest}T00:00:00Z`)) / 86_400_000);
    const limit = WINDOWS[adapter.id] ?? 430;

    if (ageDays > limit) {
      console.log(
        `STALE  ${name.padEnd(20)} last entered ${newest} (${ageDays}d ago, limit ${limit}d), ` +
          `newest value ${latestObservation}`,
      );
      stale += 1;
    } else {
      console.log(
        `OK     ${name.padEnd(20)} last entered ${newest} (${ageDays}d ago), ` +
          `newest value ${latestObservation}`,
      );
    }
  }

  console.log(`\n${stale} stale, ${empty} awaiting first entry, ${SEEDED_ADAPTERS.length} total`);

  if (stale > 0 && strict) process.exitCode = 1;
}

void main();
