import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Content changes at most daily, so serving cached data while revalidating
      // in the background keeps tab switches instant.
      staleTime: 5 * 60_000,
      gcTime: 30 * 60_000,
      retry: 1,
      // React Native has no window focus event; refetching on it is a no-op that
      // only adds noise.
      refetchOnWindowFocus: false,
    },
  },
});

/** Centralized so invalidation can't drift from the keys the screens use. */
export const queryKeys = {
  dailyProof: ['daily-proof'] as const,
  /** The day's bounded batch — what the Feed tab opens on. */
  todaysBatch: ['todays-batch'] as const,
  /** The paginated archive, behind the Feed tab's sign-off. */
  feed: (category: string | null) => ['feed', category] as const,
  /** When the ingest job last wrote, for the archive's "New" tags. */
  latestIngest: ['latest-ingest'] as const,
  /** The served humanity-progress artifact. */
  humanity: ['humanity'] as const,
  metrics: ['metrics'] as const,
  story: (id: string) => ['story', id] as const,
  profile: (userId: string) => ['profile', userId] as const,
  savedStoryIds: ['saved-story-ids'] as const,
  savedStories: ['saved-stories'] as const,
  /**
   * Keyed by date *and* metric, matching how the tally is grouped server-side:
   * the card is derived per device, so two readers on one day do not always get
   * the same indicator.
   */
  reactionTally: (date: string, metricId: string) => ['reaction-tally', date, metricId] as const,
};
