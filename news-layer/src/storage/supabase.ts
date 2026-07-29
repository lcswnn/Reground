import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import type { StoryRow } from '../types.js';

/**
 * Storage for the news ingest.
 *
 * Runs under the service role for the same reason the data layer does: RLS
 * lets the app read `stories` and nothing else, so writes cannot come from a
 * client key.
 *
 * Idempotent by construction. `upsert` on `source_url` — the unique index added
 * in `supabase/migrations/0001_news_ingest.sql` — means re-running a morning
 * corrects a summary in place and never produces a second copy of an article.
 */

let cached: SupabaseClient | null = null;

export function client(): SupabaseClient {
  if (cached) return cached;

  const url = process.env.SUPABASE_URL ?? process.env.EXPO_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) throw new Error('SUPABASE_URL is not set');
  if (!key) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY is not set — the publishable key cannot write to stories under RLS',
    );
  }

  cached = createClient(url, key, { auth: { persistSession: false } });
  return cached;
}

/** PostgREST caps a response at 1,000 rows, and `in` filters have URL limits. */
const CHUNK = 200;

/**
 * Which of these URLs the database already has.
 *
 * Called before the curator, not after, and that ordering is the whole point:
 * roughly two thirds of a morning's feed items were already judged on a
 * previous run, and paying a model to re-read them every day is the single
 * largest avoidable cost in this pipeline.
 */
export async function findExistingUrls(urls: string[]): Promise<Set<string>> {
  const found = new Set<string>();

  for (let index = 0; index < urls.length; index += CHUNK) {
    const chunk = urls.slice(index, index + CHUNK);
    const { data, error } = await client().from('stories').select('source_url').in('source_url', chunk);

    if (error) throw new Error(`findExistingUrls failed at row ${index}: ${error.message}`);
    for (const row of data ?? []) found.add(row.source_url as string);
  }

  return found;
}

/** Rows written. Upserts, so this counts stories touched rather than created. */
export async function writeStories(stories: StoryRow[]): Promise<number> {
  if (stories.length === 0) return 0;

  const rows = stories.map((story) => ({
    title: story.title,
    summary: story.summary,
    category: story.category,
    source_name: story.sourceName,
    source_url: story.url,
    published_at: story.publishedAt,
    metric_id: story.metricId,
  }));

  const { error } = await client().from('stories').upsert(rows, { onConflict: 'source_url' });
  if (error) throw new Error(`writeStories failed: ${error.message}`);

  return rows.length;
}

/**
 * Whether a story is already featured for this date.
 *
 * `fetchDailyProof` falls back to the most recent featured story when today has
 * none, so a day with nothing to feature degrades gracefully — which is exactly
 * why this must not overwrite a day that already has one. Re-running the job
 * after a manual editorial pick would otherwise silently replace it.
 */
export async function hasFeaturedStory(date: string): Promise<boolean> {
  const { data, error } = await client()
    .from('stories')
    .select('id')
    .eq('featured_date', date)
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(`hasFeaturedStory failed: ${error.message}`);
  return data !== null;
}

export async function featureStory(url: string, date: string): Promise<void> {
  const { error } = await client()
    .from('stories')
    .update({ featured_date: date })
    .eq('source_url', url);

  if (error) throw new Error(`featureStory failed: ${error.message}`);
}

export interface StoredStory {
  id: string;
  title: string;
  summary: string;
  metricId: string | null;
}

/**
 * Stories to reconsider for tagging.
 *
 * `untaggedOnly` is the cheap default — after adding an indicator, only the
 * stories that found no home last time can gain one. Pass false to re-examine
 * everything, which is what you want after loosening the guidance rather than
 * extending the list.
 */
export async function readStoriesForTagging(untaggedOnly = true): Promise<StoredStory[]> {
  let query = client()
    .from('stories')
    .select('id, title, summary, metric_id')
    .order('published_at', { ascending: false });

  if (untaggedOnly) query = query.is('metric_id', null);

  const { data, error } = await query;
  if (error) throw new Error(`readStoriesForTagging failed: ${error.message}`);

  return (data ?? []).map((row) => ({
    id: row.id as string,
    title: row.title as string,
    summary: row.summary as string,
    metricId: row.metric_id as string | null,
  }));
}

export async function setStoryMetric(id: string, metricId: string | null): Promise<void> {
  const { error } = await client().from('stories').update({ metric_id: metricId }).eq('id', id);
  if (error) throw new Error(`setStoryMetric(${id}) failed: ${error.message}`);
}

export async function recordRun(
  feedId: string,
  status: 'ok' | 'failed' | 'skipped',
  itemsFound: number,
  storiesWritten: number,
  error?: string,
): Promise<void> {
  const { error: writeError } = await client().from('news_runs').insert({
    feed_id: feedId,
    finished_at: new Date().toISOString(),
    status,
    items_found: itemsFound,
    stories_written: storiesWritten,
    error: error ?? null,
  });

  // Observability failing must not fail the ingest it was observing.
  if (writeError) console.warn(`[news_runs] could not record ${feedId}: ${writeError.message}`);
}
