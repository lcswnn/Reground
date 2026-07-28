/**
 * Incremental refresh.
 *
 * Per-source, not one blanket daily job — that distinction is the whole point
 * of separating the three cadences. Most of these series change once a year and
 * publish the date they will next change; polling them daily would be 364
 * wasted runs and a false impression of freshness.
 *
 *   npx tsx data-layer/src/jobs/refresh.ts
 *   npx tsx data-layer/src/jobs/refresh.ts --force   # ignore nextUpdate gates
 *
 * Intended to run daily from cron. Each adapter decides for itself whether
 * today is a day it has anything to say.
 */

import '../env.js';

import { adapterFor, ADAPTERS } from '../adapters/registry.js';
import { isEmberConfigured } from '../adapters/ember.js';
import { METRICS } from '../config/metrics.js';
import { readObservations, recordRun, writeObservations } from '../storage/supabase.js';

const force = process.argv.includes('--force');

/**
 * Whether a source is worth polling today.
 *
 * Driven by the source's own `nextUpdate` where it publishes one — OWID does,
 * per column, and it is the difference between a weekly poll of an annual
 * series being sensible and being noise. Sources without one (NOAA, Ember) fall
 * back to their declared cadence.
 */
async function isDue(metricId: string, adapterId: string): Promise<boolean> {
  if (force) return true;

  const adapter = adapterFor(adapterId);
  if (adapter.sourceUpdateCadence === 'daily') return true;

  const existing = await readObservations(metricId);
  if (existing.length === 0) return true;

  const latest = existing[existing.length - 1];
  if (!latest.sourceNextUpdate) {
    // No published schedule. Monthly sources are worth a weekly look; annual
    // ones get polled anyway, since the cron that invoked us is already weekly.
    return true;
  }

  const nextUpdate = new Date(latest.sourceNextUpdate);
  // A week of slack either side of the published date, since "next update" is
  // a plan rather than a promise.
  const soon = new Date();
  soon.setDate(soon.getDate() + 7);

  return nextUpdate <= soon;
}

async function main() {
  let refreshed = 0;
  let skipped = 0;
  let failed = 0;

  for (const metric of METRICS) {
    const adapterId = metric.sourceAdapterId;

    try {
      if (!(await isDue(metric.id, adapterId))) {
        skipped += 1;
        await recordRun(adapterId, 'skipped', 0);
        console.log(`skip   ${metric.id.padEnd(24)} not due`);
        continue;
      }

      const observations = await adapterFor(adapterId).fetchLatest();
      const written = await writeObservations(observations);
      await recordRun(adapterId, 'ok', written);
      refreshed += 1;
      console.log(`ok     ${metric.id.padEnd(24)} ${written} rows`);
    } catch (error) {
      const message = (error as Error).message;
      failed += 1;
      await recordRun(adapterId, 'failed', 0, message);
      // One dead source must not stop the rest — the artifact can be rebuilt
      // from whatever did land, and the run table records what didn't.
      console.error(`FAIL   ${metric.id.padEnd(24)} ${message}`);
    }
  }

  if (isEmberConfigured()) {
    try {
      const ember = adapterFor('ember:monthly-generation');
      const written = await writeObservations(await ember.fetchLatest());
      await recordRun(ember.id, 'ok', written);
      console.log(`ok     ${'renewable-share (ember)'.padEnd(24)} ${written} rows`);
    } catch (error) {
      failed += 1;
      await recordRun('ember:monthly-generation', 'failed', 0, (error as Error).message);
      console.error(`FAIL   ember: ${(error as Error).message}`);
    }
  }

  console.log(
    `\n${refreshed} refreshed, ${skipped} skipped, ${failed} failed ` +
      `(${ADAPTERS.size} adapters registered)`,
  );

  if (failed > 0) process.exitCode = 1;
}

void main();
