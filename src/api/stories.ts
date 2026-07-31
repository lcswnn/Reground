import { supabase } from '@/lib/supabase';
import { todayISO } from '@/lib/format';
import { ingestDayStart, isIngestFresh } from '@/lib/ingest';
import type { Story, StoryCategory } from '@/types/database';

export const PAGE_SIZE = 20;

/**
 * The one story featured for a given day. Falls back to the most recent
 * featured story so a missed day never leaves the home screen empty.
 */
export async function fetchDailyProof(date = todayISO()): Promise<Story | null> {
  const { data, error } = await supabase
    .from('stories')
    .select('*')
    .lte('featured_date', date)
    .not('featured_date', 'is', null)
    .order('featured_date', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export interface FeedPage {
  stories: Story[];
  /** Cursor for the next page, or null when the end has been reached. */
  nextCursor: string | null;
}

/**
 * The feed's sort order: newest *ingest* first, then newest published within a
 * batch.
 *
 * Ordering on `published_at` alone hid every late arrival. The refresh job
 * windows 36 hours back, so a story the sources published yesterday evening is
 * written this morning and, sorted by publication date, lands halfway down a
 * list the reader already scrolled past. Ingest order puts it where a reader
 * looks for new things — the top — and `published_at` still decides the order
 * inside one morning's batch.
 *
 * `id` is the final tiebreaker, and it is not optional: a run writes its whole
 * batch in one upsert, so every row in it shares a `created_at` to the
 * microsecond, and several Nature items a day share a midnight `published_at`
 * as well. Without a unique last key the keyset below would skip the rest of a
 * batch whenever a page boundary landed inside one.
 */
const ORDER = [
  { column: 'created_at', cursorKey: 'created_at' },
  { column: 'published_at', cursorKey: 'published_at' },
  { column: 'id', cursorKey: 'id' },
] as const;

/** `created_at|published_at|id` — none of the three can contain a pipe. */
function encodeCursor(story: Story): string {
  return `${story.created_at}|${story.published_at}|${story.id}`;
}

/**
 * The keyset predicate for "strictly after this row in the sort order".
 *
 * Values are double-quoted because timestamptz arrives as
 * `2026-07-30T09:46:05.855063+00:00`, and the `+` is what breaks an unquoted
 * one. Reformatting through `Date` instead would round the microseconds off and
 * reintroduce exactly the skipping this compound key exists to prevent.
 */
function keysetFilter(cursor: string): string | null {
  const [created, published, id] = cursor.split('|');
  if (!created || !published || !id) return null;

  return (
    `created_at.lt."${created}",` +
    `and(created_at.eq."${created}",` +
    `or(published_at.lt."${published}",` +
    `and(published_at.eq."${published}",id.lt."${id}")))`
  );
}

/**
 * Keyset pagination. Offset pagination would drift as new stories land at the
 * top of the feed while the user is scrolling.
 */
export async function fetchFeed(options?: {
  cursor?: string | null;
  category?: StoryCategory | null;
  limit?: number;
}): Promise<FeedPage> {
  const limit = options?.limit ?? PAGE_SIZE;

  let query = supabase.from('stories').select('*').limit(limit);

  for (const { column } of ORDER) {
    query = query.order(column, { ascending: false });
  }

  if (options?.cursor) {
    const filter = keysetFilter(options.cursor);
    if (filter) query = query.or(filter);
  }
  if (options?.category) {
    query = query.eq('category', options.category);
  }

  const { data, error } = await query;
  if (error) throw error;

  const stories = data ?? [];
  return {
    stories,
    nextCursor: stories.length === limit ? encodeCursor(stories[stories.length - 1]) : null,
  };
}

/**
 * When the ingest job last wrote anything, or null if it never has.
 *
 * Deliberately its own query rather than reading the first row of the feed: a
 * category filter would otherwise make the newest batch *in that category* look
 * like the newest run, and a category the run happened to skip would badge
 * week-old stories as new.
 */
export async function fetchLatestIngestAt(): Promise<string | null> {
  const { data, error } = await supabase
    .from('stories')
    .select('created_at')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data?.created_at ?? null;
}

/**
 * The app-side ceiling on a day's batch.
 *
 * The news layer already caps itself at `DAILY_CAP = 12`, so in normal
 * operation this never binds. It exists because the Feed tab's entire promise
 * is that it ends, and a promise that depends on a pipeline in another repo
 * staying correct is not one the app can make. If the cap upstream ever breaks,
 * this is what stops the bounded feed from quietly becoming an unbounded one.
 */
const BATCH_LIMIT = 24;

export interface DailyBatch {
  stories: Story[];
  /** When the run behind this batch wrote, or null if nothing has ever run. */
  ingestedAt: string | null;
  /**
   * Whether that run was recent enough to call this batch "today's".
   *
   * False means the workflow has been down for a day or more, and the screen
   * has to say so rather than promising a batch tomorrow morning that nothing
   * is scheduled to produce.
   */
  isFresh: boolean;
}

/**
 * The finite set the Feed tab shows: everything ingested on the same day as the
 * most recent run.
 *
 * No cursor and no pagination, deliberately. This is the one query in the app
 * whose job is to run out.
 *
 * Sorted by publication within the batch — the arrival ordering `fetchFeed`
 * needs exists to place late-arriving stories against ones the reader has
 * already scrolled past, and inside a single batch there is no such thing:
 * every story here arrived at once and none of it has been seen.
 */
export async function fetchTodaysBatch(): Promise<DailyBatch> {
  const latest = await fetchLatestIngestAt();
  if (!latest) return { stories: [], ingestedAt: null, isFresh: false };

  const { data, error } = await supabase
    .from('stories')
    .select('*')
    .gte('created_at', ingestDayStart(latest))
    .order('published_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(BATCH_LIMIT);

  if (error) throw error;

  return { stories: data ?? [], ingestedAt: latest, isFresh: isIngestFresh(latest) };
}

export async function fetchStory(id: string): Promise<Story | null> {
  const { data, error } = await supabase
    .from('stories')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function fetchSavedStories(): Promise<Story[]> {
  const { data, error } = await supabase
    .from('saved_stories')
    .select('created_at, stories(*)')
    .order('created_at', { ascending: false });

  if (error) throw error;

  // The embedded row is typed as possibly-null because the FK is nullable in
  // the generated shape; in practice the join guarantees it.
  return (data ?? []).flatMap((row) => (row.stories ? [row.stories as Story] : []));
}

export async function fetchSavedStoryIds(): Promise<Set<string>> {
  const { data, error } = await supabase.from('saved_stories').select('story_id');
  if (error) throw error;
  return new Set((data ?? []).map((row) => row.story_id));
}

export async function saveStory(userId: string, storyId: string): Promise<void> {
  const { error } = await supabase
    .from('saved_stories')
    .insert({ user_id: userId, story_id: storyId });
  if (error) throw error;
}

export async function unsaveStory(userId: string, storyId: string): Promise<void> {
  const { error } = await supabase
    .from('saved_stories')
    .delete()
    .eq('user_id', userId)
    .eq('story_id', storyId);
  if (error) throw error;
}

/**
 * Records that the user read a story today. Idempotent: the primary key is
 * (user_id, story_id, read_date), so re-opening the same story is a no-op.
 */
export async function markStoryRead(userId: string, storyId: string): Promise<void> {
  const { error } = await supabase
    .from('story_reads')
    .upsert(
      { user_id: userId, story_id: storyId, read_date: todayISO() },
      { onConflict: 'user_id,story_id,read_date', ignoreDuplicates: true },
    );
  if (error) throw error;
}

/**
 * `fetchCurrentStreak` used to live here, reading the `current_streak` RPC over
 * `story_reads`. Nothing displays a consecutive-day count any more, so it went
 * with the tile that showed it — see `DaysPill` for why the app stopped keeping
 * streaks at all.
 *
 * The RPC and the `story_reads` rows both remain. The writes are cheap, the
 * history is worth having, and a database function nobody calls costs nothing.
 */
