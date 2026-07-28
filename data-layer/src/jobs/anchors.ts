/**
 * One-shot research script, not part of the pipeline.
 *
 * Pulls every candidate series and prints the values needed to author baselines
 * and targets against real history instead of guesses: the value at each
 * metric's stated comparison year, the latest observation, and the computed
 * delta to compare against the hand-authored strings in the old constants file.
 *
 *   npx tsx data-layer/src/jobs/anchors.ts
 */

import { makeOwidAdapter } from '../adapters/owid.js';
import { noaaCo2Adapter } from '../adapters/noaa-co2.js';
import type { Observation } from '../types.js';

interface Probe {
  metricId: string;
  label: string;
  slug?: string;
  params?: Record<string, string>;
  unit: string;
  /** The year the old hand-authored delta string compared against. */
  compareYear: number;
  /** What the hardcoded constants file claimed. */
  hardcodedValue: number;
  hardcodedDelta: string;
}

const PROBES: Probe[] = [
  { metricId: 'child-mortality', label: 'Child mortality before 5', slug: 'child-mortality-igme', unit: '%', compareYear: 1990, hardcodedValue: 3.6, hardcodedDelta: '↓ 61% since 1990' },
  { metricId: 'life-expectancy', label: 'Life expectancy', slug: 'life-expectancy', unit: 'years', compareYear: 1990, hardcodedValue: 73.4, hardcodedDelta: '↑ 9 yrs since 1990' },
  { metricId: 'extreme-poverty', label: 'Living in extreme poverty', slug: 'share-of-population-in-extreme-poverty', unit: '%', compareYear: 1990, hardcodedValue: 8.5, hardcodedDelta: '↓ 28 pts since 1990' },
  { metricId: 'undernourishment', label: 'Undernourished', slug: 'prevalence-of-undernourishment', unit: '%', compareYear: 2000, hardcodedValue: 9.1, hardcodedDelta: '↓ 10 pts since 1990' },
  { metricId: 'renewable-share', label: 'Electricity from renewables', slug: 'share-electricity-renewables', unit: '%', compareYear: 2000, hardcodedValue: 30, hardcodedDelta: '↑ 11 pts since 2000' },
  { metricId: 'co2-per-person', label: 'CO₂ per person', slug: 'co-emissions-per-capita', unit: 't', compareYear: 1990, hardcodedValue: 4.7, hardcodedDelta: '↑ 0.3 t since 2000' },
  { metricId: 'homicide-rate', label: 'Homicide rate', slug: 'homicide-rate-unodc', unit: '/100k', compareYear: 2000, hardcodedValue: 5.8, hardcodedDelta: '↓ 1.4 since 1993' },
  { metricId: 'conflict-deaths', label: 'Deaths in conflict', slug: 'death-rate-in-armed-conflicts', unit: '/100k', compareYear: 1989, hardcodedValue: 0.6, hardcodedDelta: '↓ 88% since 1950' },
  { metricId: 'internet-access', label: 'People online', slug: 'share-of-individuals-using-the-internet', unit: '%', compareYear: 2005, hardcodedValue: 68, hardcodedDelta: '↑ 41 pts since 2005' },
  { metricId: 'electricity-access', label: 'Access to electricity', slug: 'share-of-the-population-with-access-to-electricity', unit: '%', compareYear: 2000, hardcodedValue: 95, hardcodedDelta: '(replaces mobile coverage)' },
  { metricId: 'adult-literacy', label: 'Adult literacy', slug: 'literacy', params: { age_group: 'adult', sex: 'both' }, unit: '%', compareYear: 1980, hardcodedValue: 87, hardcodedDelta: '↑ 19 pts since 1980' },
  { metricId: 'years-of-schooling', label: 'Years of schooling', slug: 'mean-years-of-schooling-long-run', unit: 'years', compareYear: 1990, hardcodedValue: 90, hardcodedDelta: '(replaces girls in primary school)' },
  { metricId: 'co2-concentration', label: 'Atmospheric CO₂', unit: 'ppm', compareYear: 2015, hardcodedValue: 0, hardcodedDelta: '(new metric)' },
];

function valueAtYear(observations: Observation[], year: number): Observation | null {
  const atOrBefore = observations.filter((o) => Number(o.observedAt.slice(0, 4)) <= year);
  return atOrBefore[atOrBefore.length - 1] ?? null;
}

async function main() {
  for (const probe of PROBES) {
    try {
      const adapter = probe.slug
        ? makeOwidAdapter({
            metricId: probe.metricId,
            slug: probe.slug,
            params: probe.params,
            refreshCadence: '0 6 * * 1',
            sourceUpdateCadence: 'annual',
            unit: probe.unit,
          })
        : noaaCo2Adapter;

      const all = await adapter.fetchAll!();
      const observed = all.filter((o) => o.provenance === 'observed');
      const projected = all.filter((o) => o.provenance === 'projected');

      const first = observed[0];
      const last = observed[observed.length - 1];
      const atCompare = valueAtYear(observed, probe.compareYear);

      const computedDelta =
        atCompare && last ? last.value - atCompare.value : null;
      const computedPct =
        atCompare && last && atCompare.value !== 0
          ? ((last.value - atCompare.value) / atCompare.value) * 100
          : null;

      console.log(`\n=== ${probe.metricId}  (${probe.slug ?? adapter.id})`);
      console.log(`  observed: ${observed.length} pts  ${first?.observedAt}..${last?.observedAt}` +
        (projected.length ? `   [+${projected.length} arrived PROJECTED]` : ''));
      console.log(`  latest       : ${last?.value.toFixed(3)} ${probe.unit}  @ ${last?.observedAt}`);
      console.log(`  hardcoded    : ${probe.hardcodedValue} ${probe.unit}   -> diff ${last ? (last.value - probe.hardcodedValue).toFixed(3) : '?'}`);
      console.log(`  @${probe.compareYear}        : ${atCompare?.value.toFixed(3)} ${probe.unit} @ ${atCompare?.observedAt}`);
      console.log(`  computed delta: ${computedDelta?.toFixed(2)} ${probe.unit} (${computedPct?.toFixed(1)}%)   old string: "${probe.hardcodedDelta}"`);
      console.log(`  sourceLastUpdated=${last?.sourceLastUpdated}  nextUpdate=${last?.sourceNextUpdate}`);
      if (projected.length) {
        const lastProjected = projected[projected.length - 1];
        console.log(`  NOTE: source ships projections through ${lastProjected.observedAt} (${lastProjected.value.toFixed(3)})`);
      }
    } catch (error) {
      console.log(`\n=== ${probe.metricId} FAILED: ${(error as Error).message}`);
    }
  }
}

void main();
