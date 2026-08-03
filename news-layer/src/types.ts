/**
 * Core types for the news ingest layer.
 *
 * Deliberately separate from `data-layer/`, which states as an invariant that
 * nothing in it touches news articles or LLMs — every number there has a
 * traceable lineage back to a structured source. This layer is the opposite
 * kind of thing: an editorial judgement made by a model over prose. Keeping
 * them apart is what stops the metrics pipeline from inheriting that.
 *
 * Nothing here imports React Native, and the app never imports from here. The
 * only thing that crosses the boundary is the `stories` table.
 */

/**
 * The `story_category` enum, as the database declares it.
 *
 * Previously imported from the app's generated Supabase types. Those went with
 * the pivot — the app no longer reads the `stories` table, so this layer is the
 * only remaining owner of the shape and the definition lives here now. It must
 * still match the enum in the database: adding a value here without a migration
 * gets the insert rejected at write time, not at build time.
 *
 * `categories.ts` holds the same set as a runtime array for the curator's JSON
 * schema, with a compile-time guard that the two cannot drift apart.
 */
export type StoryCategory =
  | 'health'
  | 'poverty'
  | 'climate'
  | 'energy'
  | 'education'
  | 'science'
  | 'rights'
  | 'conservation';

/** A feed we are willing to take stories from. */
export interface FeedConfig {
  /** Stable id, used in the run log. Never derived from the URL. */
  id: string;
  /** Shown to the user as the attribution line. */
  sourceName: string;
  url: string;
  /**
   * What this outlet mostly covers. A hint to the curator, not a constraint —
   * Mongabay runs the occasional health story and the model may override it.
   * Null for general-interest outlets that would only mislead it.
   */
  categoryHint: StoryCategory | null;
}

/** One entry from a feed, before anything has judged it. */
export interface FeedItem {
  feedId: string;
  sourceName: string;
  title: string;
  /** Canonicalised — see `canonicalizeUrl`. This is the dedupe key. */
  url: string;
  /** The feed's own summary/description, tags stripped. May be empty. */
  excerpt: string;
  publishedAt: string;
  categoryHint: StoryCategory | null;
}

/** The curator's verdict on one candidate. */
export interface CuratedStory {
  url: string;
  title: string;
  /** Ours, not the outlet's. One or two sentences. */
  summary: string;
  category: StoryCategory;
  /** 0–100. Drives both the cut and which story gets featured. */
  score: number;
  /**
   * The tracked indicator this story counts toward, or null.
   *
   * Null is the common case and not a failure: most good news is not measured
   * by any of the thirteen. An id here is always one from
   * `data-layer/src/config/metrics.ts`.
   */
  metricId: string | null;
}

/** A curated story with the feed metadata reattached, ready to write. */
export interface StoryRow extends CuratedStory {
  sourceName: string;
  publishedAt: string;
}
