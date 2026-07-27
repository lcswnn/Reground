import { supabase } from '@/lib/supabase';
import { todayISO } from '@/lib/format';
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
 * Keyset pagination on `published_at`. Offset pagination would drift as new
 * stories land at the top of the feed while the user is scrolling.
 */
export async function fetchFeed(options?: {
  cursor?: string | null;
  category?: StoryCategory | null;
  limit?: number;
}): Promise<FeedPage> {
  const limit = options?.limit ?? PAGE_SIZE;

  let query = supabase
    .from('stories')
    .select('*')
    .order('published_at', { ascending: false })
    .limit(limit);

  if (options?.cursor) {
    query = query.lt('published_at', options.cursor);
  }
  if (options?.category) {
    query = query.eq('category', options.category);
  }

  const { data, error } = await query;
  if (error) throw error;

  const stories = data ?? [];
  return {
    stories,
    nextCursor:
      stories.length === limit ? stories[stories.length - 1].published_at : null,
  };
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

export async function fetchCurrentStreak(): Promise<number> {
  const { data, error } = await supabase.rpc('current_streak');
  if (error) throw error;
  return data ?? 0;
}
