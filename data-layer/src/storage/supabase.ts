import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import type { MetricConfig, Observation } from '../types.js';

/**
 * Storage for the ingest layer.
 *
 * Runs under the service role — RLS lets the app read observations and nothing
 * else, so writes have to come from here rather than from a client key.
 *
 * Append-only in practice as well as in policy: `upsert` on the
 * `(metric_id, observed_at, source)` key means a re-fetch corrects the value of
 * a point that already exists (sources genuinely do revise the last year or
 * two) but never removes a date, and never merges two sources into one row.
 */

let cached: SupabaseClient | null = null;

export function client(): SupabaseClient {
  if (cached) return cached;

  const url = process.env.SUPABASE_URL ?? process.env.EXPO_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) throw new Error('SUPABASE_URL is not set');
  if (!key) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY is not set — the publishable key cannot write to observations under RLS',
    );
  }

  cached = createClient(url, key, { auth: { persistSession: false } });
  return cached;
}

/** Chunked so a full backfill doesn't exceed the request size limit. */
const CHUNK = 500;

export async function writeObservations(observations: Observation[]): Promise<number> {
  if (observations.length === 0) return 0;

  const rows = observations.map((observation) => ({
    metric_id: observation.metricId,
    observed_at: observation.observedAt,
    source: observation.source,
    value: observation.value,
    provenance: observation.provenance,
    source_last_updated: observation.sourceLastUpdated,
    source_next_update: observation.sourceNextUpdate,
    unit: observation.unit,
    fetched_at: observation.fetchedAt,
  }));

  let written = 0;
  for (let index = 0; index < rows.length; index += CHUNK) {
    const chunk = rows.slice(index, index + CHUNK);
    const { error } = await client()
      .from('observations')
      .upsert(chunk, { onConflict: 'metric_id,observed_at,source' });

    if (error) throw new Error(`writeObservations failed at row ${index}: ${error.message}`);
    written += chunk.length;
  }

  return written;
}

/**
 * The full series for one metric, oldest first.
 *
 * Paged explicitly: PostgREST caps a response at 1,000 rows by default, and the
 * NOAA series alone is ~3,900 points — without this the nowcast would silently
 * fit a truncated window.
 */
export async function readObservations(metricId: string): Promise<Observation[]> {
  const PAGE = 1000;
  const all: Observation[] = [];

  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await client()
      .from('observations')
      .select('*')
      .eq('metric_id', metricId)
      .order('observed_at', { ascending: true })
      .range(offset, offset + PAGE - 1);

    if (error) throw new Error(`readObservations(${metricId}) failed: ${error.message}`);
    if (!data || data.length === 0) break;

    for (const row of data) {
      all.push({
        metricId: row.metric_id,
        value: row.value,
        observedAt: row.observed_at,
        provenance: row.provenance,
        sourceLastUpdated: row.source_last_updated,
        sourceNextUpdate: row.source_next_update,
        fetchedAt: row.fetched_at,
        source: row.source,
        unit: row.unit,
      });
    }

    if (data.length < PAGE) break;
  }

  return all;
}

/** Mirrors the TS config into the database so the schema is self-describing. */
export async function syncMetricConfig(metrics: MetricConfig[]): Promise<void> {
  const rows = metrics.map((metric) => ({
    id: metric.id,
    label: metric.label,
    category: metric.category,
    baseline_value: metric.baselineValue,
    target_value: metric.targetValue,
    direction: metric.direction,
    weight: metric.weight,
    polarity: metric.polarity,
    nowcast_method: metric.nowcastMethod,
    trailing_window_years: metric.trailingWindowYears,
    source_adapter_id: metric.sourceAdapterId,
    owid_slug: metric.owidSlug ?? null,
    owid_params: metric.owidParams ?? null,
    observed_through_year: metric.observedThroughYear ?? null,
    unit: metric.unit,
    basis: metric.basis,
    updated_at: new Date().toISOString(),
  }));

  const { error } = await client().from('metrics_config').upsert(rows, { onConflict: 'id' });
  if (error) throw new Error(`syncMetricConfig failed: ${error.message}`);
}

export async function recordRun(
  adapterId: string,
  status: 'ok' | 'failed' | 'skipped',
  rowsWritten: number,
  error?: string,
): Promise<void> {
  const { error: writeError } = await client().from('ingest_runs').insert({
    adapter_id: adapterId,
    finished_at: new Date().toISOString(),
    status,
    rows_written: rowsWritten,
    error: error ?? null,
  });

  // Observability failing must not fail the ingest it was observing.
  if (writeError) console.warn(`[ingest_runs] could not record ${adapterId}: ${writeError.message}`);
}
