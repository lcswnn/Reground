/**
 * Hand-written mirror of the schema in `supabase/schema.sql`.
 *
 * The `Relationships` arrays are not decoration: postgrest-js requires them to
 * satisfy its `GenericTable` constraint, and it uses them to type embedded
 * selects like `.select('stories(*)')`. Omitting them silently collapses every
 * query result to `never`.
 *
 * Once the schema is applied you can regenerate this file instead:
 *   npx supabase gen types typescript --project-id <ref> > src/types/database.ts
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

/** Which direction a metric has to move for humanity to be winning. */
export type MetricDirection = 'up_is_good' | 'down_is_good';

export type Story = {
  id: string;
  title: string;
  summary: string;
  body: string | null;
  category: StoryCategory;
  image_url: string | null;
  source_name: string;
  source_url: string;
  /** When the underlying news was published. */
  published_at: string;
  /** Set on at most one story per day — that day's "daily proof". Null = feed only. */
  featured_date: string | null;
  /**
   * The tracked indicator this story counts toward, or null.
   *
   * Matches a metric id in the daily humanity artifact. Null on most stories by
   * design — plenty of good news isn't measured by any tracked indicator — so
   * anything reading it has to handle its absence as the normal case. Not a
   * foreign key: the metric set lives in the data layer's config, and the app
   * resolves the label from the artifact rather than from a table.
   */
  metric_id: string | null;
  created_at: string;
};

export type Metric = {
  id: string;
  slug: string;
  title: string;
  /** Short human framing, e.g. "people in extreme poverty". */
  description: string | null;
  unit: string;
  direction: MetricDirection;
  source_name: string;
  source_url: string;
  category: StoryCategory;
  created_at: string;
};

export type MetricPoint = {
  id: string;
  metric_id: string;
  /** Date of the observation; yearly series use Jan 1. */
  period: string;
  value: number;
};

export type Profile = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  /**
   * `YYYY-MM-DD`. Null for every account created before the birthday field
   * existed, so anything reading it has to handle its absence.
   */
  birth_date: string | null;
  /**
   * The reader's category weighting for the humanity score, e.g.
   * `{"health": 20, "basic_needs": 18}`.
   *
   * Null until they save one, and that null is meaningful: it distinguishes
   * "has not answered, so show no score at all" from "deliberately weighted
   * everything to zero". See `src/state/weighting.ts`.
   *
   * Added by `supabase/migrations/0002_category_weights.sql`. Everything that
   * touches it tolerates the column being absent, so the app runs against a
   * database where that migration has not been applied yet.
   */
  category_weights: Record<string, number> | null;
  /** When `category_weights` was last written, for last-write-wins across devices. */
  category_weights_updated_at: string | null;
  created_at: string;
  updated_at: string;
};

export type SavedStory = {
  user_id: string;
  story_id: string;
  created_at: string;
};

/** Mirrors the check constraint on `card_reactions.reaction`. */
export type ReactionKind = 'hope' | 'surprised';

/**
 * One reader's answer to one day's card.
 *
 * `card_date` is the reader's *local* date, not a server timestamp: the card is
 * chosen per-device by local calendar day, so filing a reaction by UTC would
 * attach it to a card that reader was never shown.
 */
export type CardReaction = {
  user_id: string;
  card_date: string;
  /** The indicator the card was about — the tally groups on this and the date. */
  metric_id: string;
  reaction: ReactionKind;
  created_at: string;
  updated_at: string;
};

export type StoryRead = {
  user_id: string;
  story_id: string;
  read_date: string;
  created_at: string;
};

type Insert<T, Optional extends keyof T> = Omit<T, Optional> & Partial<Pick<T, Optional>>;

export type Database = {
  public: {
    Tables: {
      stories: {
        Row: Story;
        Insert: Insert<
          Story,
          'id' | 'created_at' | 'body' | 'image_url' | 'featured_date' | 'metric_id'
        >;
        Update: Partial<Story>;
        Relationships: [];
      };
      metrics: {
        Row: Metric;
        Insert: Insert<Metric, 'id' | 'created_at' | 'description'>;
        Update: Partial<Metric>;
        Relationships: [];
      };
      metric_points: {
        Row: MetricPoint;
        Insert: Insert<MetricPoint, 'id'>;
        Update: Partial<MetricPoint>;
        Relationships: [
          {
            foreignKeyName: 'metric_points_metric_id_fkey';
            columns: ['metric_id'];
            isOneToOne: false;
            referencedRelation: 'metrics';
            referencedColumns: ['id'];
          },
        ];
      };
      profiles: {
        Row: Profile;
        Insert: Insert<
          Profile,
          | 'created_at'
          | 'updated_at'
          | 'display_name'
          | 'avatar_url'
          | 'birth_date'
          | 'category_weights'
          | 'category_weights_updated_at'
        >;
        Update: Partial<Profile>;
        Relationships: [];
      };
      saved_stories: {
        Row: SavedStory;
        Insert: Insert<SavedStory, 'created_at'>;
        Update: Partial<SavedStory>;
        Relationships: [
          {
            foreignKeyName: 'saved_stories_story_id_fkey';
            columns: ['story_id'];
            isOneToOne: false;
            referencedRelation: 'stories';
            referencedColumns: ['id'];
          },
        ];
      };
      story_reads: {
        Row: StoryRead;
        Insert: Insert<StoryRead, 'created_at' | 'read_date'>;
        Update: Partial<StoryRead>;
        Relationships: [
          {
            foreignKeyName: 'story_reads_story_id_fkey';
            columns: ['story_id'];
            isOneToOne: false;
            referencedRelation: 'stories';
            referencedColumns: ['id'];
          },
        ];
      };
      card_reactions: {
        Row: CardReaction;
        Insert: Insert<CardReaction, 'created_at' | 'updated_at'>;
        Update: Partial<CardReaction>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      current_streak: {
        Args: Record<string, never>;
        Returns: number;
      };
      /**
       * Counts only — `security definer`, so it can see past the row-level
       * policy that hides other readers' reactions, and shaped so that counts
       * are the only thing it can return.
       */
      card_reaction_tally: {
        Args: { p_date: string; p_metric_id: string };
        Returns: { reaction: ReactionKind; votes: number }[];
      };
    };
    Enums: {
      story_category: StoryCategory;
      metric_direction: MetricDirection;
    };
    CompositeTypes: Record<string, never>;
  };
};

/** A metric plus its series, as assembled by `@/api/metrics`. */
export type MetricWithSeries = Metric & {
  points: MetricPoint[];
};
