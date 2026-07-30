import { METRICS } from '../config/metrics.js';
import { acledAdapter } from './acled.js';
import { electricityMapsAdapter } from './electricity-maps.js';
import { emberAdapter } from './ember.js';
import { gfwDeforestationAdapter } from './gfw-deforestation.js';
import { noaaCo2Adapter } from './noaa-co2.js';
import { nsidcSeaIceAdapter } from './nsidc-sea-ice.js';
import { makeOwidAdapter } from './owid.js';
import { SEEDED_ADAPTERS } from './seeded.js';
import { unhcrAdapter } from './unhcr.js';
import { whoOutbreaksAdapter } from './who-outbreaks.js';

import type { SourceAdapter } from './types.js';

/**
 * Every adapter, keyed by id.
 *
 * OWID adapters are derived from the metric config rather than listed by hand —
 * adding an OWID-backed metric means adding one entry to `config/metrics.ts`
 * and nothing here. A non-OWID source needs one import and one line in
 * `STANDALONE`.
 *
 * Registration is independent of scoring. Several adapters here back metrics in
 * `PENDING_METRICS` rather than `METRICS`: `refresh.ts` runs them every day so
 * their history accumulates, but nothing reads them during scoring until they
 * have enough of it to derive a real baseline from. That ordering is the point —
 * a metric cannot be scored before it has been measured.
 */

const STANDALONE: SourceAdapter[] = [
  noaaCo2Adapter,
  emberAdapter,
  nsidcSeaIceAdapter,
  whoOutbreaksAdapter,
  unhcrAdapter,
  acledAdapter,
  electricityMapsAdapter,
  gfwDeforestationAdapter,
  ...SEEDED_ADAPTERS,
];

function buildRegistry(): Map<string, SourceAdapter> {
  const registry = new Map<string, SourceAdapter>();

  for (const adapter of STANDALONE) {
    registry.set(adapter.id, adapter);
  }

  for (const metric of METRICS) {
    if (!metric.owidSlug) continue;

    const adapter = makeOwidAdapter({
      metricId: metric.id,
      slug: metric.owidSlug,
      params: metric.owidParams,
      columnIndex: metric.owidColumnIndex,
      observedThroughYear: metric.observedThroughYear,
      unit: metric.unit,
      // Annual sources, polled weekly. Cheap enough to catch an early
      // publication, far short of pretending the number changes daily. The
      // scheduler skips a source entirely when its own `nextUpdate` is in the
      // future — see jobs/refresh.ts.
      refreshCadence: '0 6 * * 1',
      sourceUpdateCadence: 'annual',
    });

    if (registry.has(adapter.id)) {
      throw new Error(`Duplicate adapter id: ${adapter.id}`);
    }
    registry.set(adapter.id, adapter);
  }

  return registry;
}

export const ADAPTERS = buildRegistry();

export function adapterFor(id: string): SourceAdapter {
  const adapter = ADAPTERS.get(id);
  if (!adapter) throw new Error(`Unknown adapter: ${id}`);
  return adapter;
}
