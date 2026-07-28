import { fetchHumanityArtifact } from '@/api/humanity';
import { fetchProfile } from '@/api/profile';
import {
  fetchCurrentStreak,
  fetchFeed,
  fetchSavedStories,
  fetchSavedStoryIds,
  type FeedPage,
} from '@/api/stories';
import { queryClient, queryKeys } from '@/lib/query';

/**
 * Everything the signed-in app shows in its first few taps, warmed while the
 * splash screen is still up.
 *
 * The screens themselves are unchanged — they still declare their own queries.
 * These calls just seed the same cache keys first, so a mounted screen finds
 * its data already there and renders content on its first frame instead of a
 * spinner that swaps out a moment later.
 *
 * `prefetchQuery` swallows errors by design: a failed warm-up is not a reason
 * to hold the splash: the screen's own query will surface the error state
 * normally once the user gets there.
 */
export function prefetchAppData(userId: string): Promise<unknown> {
  return Promise.all([
    // Today and Progress share this one: the headline bar, the world grid, and
    // every chart on the Progress tab all come from this single file, so it is
    // the one warm-up that decides whether the first screen has content.
    queryClient.prefetchQuery({
      queryKey: queryKeys.humanity,
      queryFn: fetchHumanityArtifact,
    }),

    // The unfiltered feed is the only page the tab opens on; category filters
    // are a deliberate tap, so those can load on demand.
    queryClient.prefetchInfiniteQuery({
      queryKey: queryKeys.feed(null),
      queryFn: ({ pageParam }) => fetchFeed({ cursor: pageParam, category: null }),
      initialPageParam: null as string | null,
      getNextPageParam: (lastPage: FeedPage) => lastPage.nextCursor,
    }),

    queryClient.prefetchQuery({ queryKey: queryKeys.savedStories, queryFn: fetchSavedStories }),
    queryClient.prefetchQuery({ queryKey: queryKeys.streak, queryFn: fetchCurrentStreak }),

    // Not rendered anywhere on launch, but it decides whether a story shows a
    // filled bookmark — the one piece of state that visibly corrects itself
    // after the fact if it arrives late.
    queryClient.prefetchQuery({
      queryKey: queryKeys.savedStoryIds,
      queryFn: fetchSavedStoryIds,
    }),

    queryClient.prefetchQuery({
      queryKey: queryKeys.profile(userId),
      queryFn: () => fetchProfile(userId),
    }),
  ]);
}
