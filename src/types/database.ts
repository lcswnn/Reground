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
  created_at: string;
  updated_at: string;
};

export type SavedStory = {
  user_id: string;
  story_id: string;
  created_at: string;
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
          'created_at' | 'updated_at' | 'display_name' | 'avatar_url' | 'birth_date'
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
    };
    Views: Record<string, never>;
    Functions: {
      current_streak: {
        Args: Record<string, never>;
        Returns: number;
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
