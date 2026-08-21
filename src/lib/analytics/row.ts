/**
 * What one session looks like on its way to the server, and the two rules that
 * decide what it contains.
 *
 * Deliberately the only file in this folder that imports nothing — no React
 * Native, no Expo, no Supabase client, not even the storage shim. That is what
 * makes it the file with a test beside it: the decision about *what leaves the
 * phone* is the one decision here worth pinning down, and it should be readable
 * and checkable without a simulator. Everything impure — signing in, queueing,
 * sending — is in the files around it.
 *
 * The shape mirrors `public.app_sessions` in
 * `supabase/migrations/0001_app_analytics.sql`. Snake_case keys, because these
 * objects are handed to PostgREST unchanged, and hand-written rather than
 * generated for the reason `api/humanity.ts` gives about the artifact: the
 * database is outside this bundle, so if you change one, change both.
 */

import type { SessionState } from '@/session/session-context';

export interface SessionRow {
  /** Clock on the phone when the first question was answered. Half the key. */
  started_at: string;
  ended_at: string;
  category_id: string | null;
  category_group: string | null;
  game_kind: string | null;
  topic_id: string | null;
  game_id: string | null;
  one_more_id: string | null;
  /** Null for a session that measures nothing — see `measuresMood`. */
  mood_before: number | null;
  mood_after: number | null;
  reactivation_skipped: boolean;
  app_version: string | null;
}

/**
 * The row for a session, or `null` when there is nothing to say about it.
 *
 * ## What goes in
 *
 * The two ratings, and the four choices that say what the session actually was.
 * Ids only — `game_id`, `topic_id`, `one_more_id`, `category_id` — and never the
 * labels beside them, which are copy and get rewritten between releases; a
 * report grouped on a sentence is a report that splits in two the next time
 * somebody improves the sentence.
 *
 * Nothing the user typed, because there is nothing the user can type: this app
 * has no text field in it anywhere. Nothing about where they are, because the
 * country question promised otherwise — see the note at the top of the
 * migration.
 *
 * ## What makes it `null`
 *
 * Two ways, and they are the same idea twice: a session with no `startedAt`
 * never began, and one with no category never got past the door. A row for
 * either would say only that somebody opened the app, which is not what any of
 * this is for.
 */
export function sessionRow(
  state: SessionState,
  endedAt: Date,
  version: string | null,
): SessionRow | null {
  if (!state.startedAt || !state.category) return null;

  return {
    started_at: state.startedAt,
    ended_at: endedAt.toISOString(),
    category_id: state.category.id,
    category_group: state.categoryGroup,
    game_kind: state.gameKind,
    topic_id: state.topic?.id ?? null,
    game_id: state.game,
    one_more_id: state.oneMore,
    mood_before: state.moodBefore,
    mood_after: state.moodAfter,
    reactivation_skipped: state.reactivationSkipped,
    app_version: version,
  };
}

/**
 * Adds a row to the pending list, replacing any entry for the same session, and
 * trims to `max` by dropping the oldest.
 *
 * Lives here rather than in `queue.ts` so it can be tested without the storage
 * shim, and because the two rules it encodes are exactly the sort of thing that
 * is obviously right until somebody reorders two lines:
 *
 *  - **One entry per `startedAt`.** A session is written twice — once when the
 *    second rating lands, once when it closes and the last choice is known — and
 *    offline that has to leave one entry, not two.
 *  - **The later row wins wholesale**, rather than being merged field by field
 *    into the earlier one. It is the same session further along, so every field
 *    the first had is either unchanged or was null.
 */
export function mergeQueue(
  existing: readonly SessionRow[],
  row: SessionRow,
  max: number,
): SessionRow[] {
  const without = existing.filter((queued) => queued.started_at !== row.started_at);

  return [...without, row].slice(-max);
}
