/**
 * Computes the composite straight from the live sources, with no database.
 *
 * The same code path `build-artifact.ts` uses, minus storage — for checking
 * what a config change does to the score before committing it, and for
 * reviewing the model without provisioning anything.
 *
 *   npx tsx data-layer/src/jobs/preview.ts
 */

import '../env.js';

import { adapterFor } from '../adapters/registry.js';
import { METRICS } from '../config/metrics.js';
import { nowcast } from '../nowcast/index.js';
import { computeCompositeScore } from '../scoring/composite.js';
import type { Observation } from '../types.js';

async function main() {
  const asOf = new Date();
  const observations = new Map<string, Observation[]>();

  for (const metric of METRICS) {
    const adapter = adapterFor(metric.sourceAdapterId);
    observations.set(metric.id, await (adapter.fetchAll ?? adapter.fetchLatest)());
  }

  const composite = computeCompositeScore({ configs: METRICS, observations, asOf });

  console.log(`\nComposite: ${(composite.score * 100).toFixed(1)}%   direction=${composite.direction}`);
  console.log(
    `Δ week ${fmtDelta(composite.deltaVsLastWeek)}   Δ month ${fmtDelta(composite.deltaVsLastMonth)}`,
  );
  console.log(`Coverage:  ${(composite.coverage * 100).toFixed(1)}% of the weight budget\n`);

  console.log(
    'metric                 w     latest      now(proj)   norm     contrib   conf  lastObs',
  );
  console.log('─'.repeat(100));

  for (const entry of composite.perMetricContributions) {
    const metric = METRICS.find((candidate) => candidate.id === entry.metricId)!;
    const series = observations.get(metric.id) ?? [];

    // Unscored metrics stay in the listing rather than being dropped — the
    // whole point of tracking `hasData` is that missing weight is visible.
    if (!entry.hasData) {
      console.log(`${metric.id.padEnd(20)} ${metric.weight.toFixed(2)}       — no data —`);
      continue;
    }

    const projection = nowcast(series, asOf, {
      method: metric.nowcastMethod,
      trailingWindowYears: metric.trailingWindowYears,
    });

    const observed = series.filter((o) => o.provenance === 'observed');
    const latest = observed[observed.length - 1];

    console.log(
      `${metric.id.padEnd(20)} ${metric.weight.toFixed(2)}  ` +
        `${latest.value.toFixed(2).padStart(9)}  ` +
        `${projection.value.toFixed(2).padStart(9)}${projection.isProjected ? '*' : ' '}  ` +
        `${entry.normalized.toFixed(3).padStart(7)}  ` +
        `${(entry.contribution * 100).toFixed(2).padStart(8)}  ` +
        `${projection.confidence.toFixed(2)}  ${projection.lastObservedAt.slice(0, 7)}` +
        `${metric.polarity === 'detractor' ? '   [detractor]' : ''}`,
    );
  }

  console.log('─'.repeat(100));
  console.log('* = projected\n');
}

function fmtDelta(delta: number | null): string {
  if (delta === null) return 'n/a';
  const points = delta * 100;
  return `${points >= 0 ? '+' : ''}${points.toFixed(3)} pts`;
}

void main();
