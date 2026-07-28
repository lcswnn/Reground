/**
 * One-shot backfill.
 *
 * OWID's CSV endpoint returns the *full* historical series, so decades of
 * history land in a single pass rather than accumulating going forward. Run
 * once, then let `refresh.ts` keep the tail current.
 *
 *   npx tsx data-layer/src/jobs/backfill.ts          # write to Supabase
 *   npx tsx data-layer/src/jobs/backfill.ts --dry    # fetch and report only
 *
 * Idempotent: re-running upserts the same rows on the same keys.
 */

import '../env.js';

import { adapterFor } from '../adapters/registry.js';
import { isEmberConfigured } from '../adapters/ember.js';
import { METRICS } from '../config/metrics.js';
import { recordRun, syncMetricConfig, writeObservations } from '../storage/supabase.js';
import type { Observation } from '../types.js';

const dryRun = process.argv.includes('--dry');

interface Summary {
  metricId: string;
  observed: number;
  projected: number;
  first?: string;
  last?: string;
  latestValue?: number;
  error?: string;
}

async function main() {
  const summaries: Summary[] = [];

  if (!dryRun) await syncMetricConfig(METRICS);

  for (const metric of METRICS) {
    try {
      const adapter = adapterFor(metric.sourceAdapterId);
      const fetchAll = adapter.fetchAll ?? adapter.fetchLatest;
      const observations = await fetchAll();

      if (!dryRun) {
        const written = await writeObservations(observations);
        await recordRun(adapter.id, 'ok', written);
      }

      summaries.push(summarise(metric.id, observations));
    } catch (error) {
      const message = (error as Error).message;
      summaries.push({ metricId: metric.id, observed: 0, projected: 0, error: message });
      if (!dryRun) await recordRun(metric.sourceAdapterId, 'failed', 0, message);
    }
  }

  // Ember is an optional upgrade to renewable-share's resolution, not a metric
  // of its own, so it is backfilled separately and its absence is not an error.
  if (isEmberConfigured()) {
    try {
      const ember = adapterFor('ember:monthly-generation');
      const observations = await ember.fetchAll!();
      if (!dryRun) {
        const written = await writeObservations(observations);
        await recordRun(ember.id, 'ok', written);
      }
      summaries.push(summarise('renewable-share (ember monthly)', observations));
    } catch (error) {
      summaries.push({
        metricId: 'renewable-share (ember monthly)',
        observed: 0,
        projected: 0,
        error: (error as Error).message,
      });
    }
  } else {
    console.log('\nEMBER_API_KEY not set — skipping the monthly renewables upgrade.');
    console.log('Register free at https://ember-energy.org/data/api/\n');
  }

  report(summaries);

  const failed = summaries.filter((summary) => summary.error);
  if (failed.length > 0) process.exitCode = 1;
}

function summarise(metricId: string, observations: Observation[]): Summary {
  const observed = observations.filter((o) => o.provenance === 'observed');
  return {
    metricId,
    observed: observed.length,
    projected: observations.length - observed.length,
    first: observations[0]?.observedAt,
    last: observations[observations.length - 1]?.observedAt,
    latestValue: observed[observed.length - 1]?.value,
  };
}

function report(summaries: Summary[]) {
  console.log(`\n${dryRun ? 'DRY RUN — nothing written' : 'Backfill complete'}\n`);
  console.log('metric                        obs   proj  span                      latest');
  console.log('─'.repeat(88));

  for (const summary of summaries) {
    if (summary.error) {
      // Printed in full, on its own line. Truncating to fit the column hid the
      // operative half of a Postgres error ("...column of 'observations' in the
      // schema cache") behind a tidy table.
      console.log(`${summary.metricId.padEnd(30)}FAILED`);
      console.log(`${' '.repeat(30)}${summary.error}`);
      continue;
    }
    const span = `${summary.first?.slice(0, 4) ?? '?'}..${summary.last?.slice(0, 4) ?? '?'}`;
    console.log(
      `${summary.metricId.padEnd(30)}${String(summary.observed).padStart(4)}  ` +
        `${String(summary.projected).padStart(5)}  ${span.padEnd(24)}  ` +
        `${summary.latestValue?.toFixed(3) ?? '-'}`,
    );
  }

  const total = summaries.reduce((sum, s) => sum + s.observed + s.projected, 0);
  console.log('─'.repeat(88));
  console.log(`${total} observations across ${summaries.length} series\n`);
}

void main();
