import { useQuery } from '@tanstack/react-query';
import { RefreshControl, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedRef, useScrollViewOffset } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FeedEndCard } from '@/components/feed-end-card';
import { ScrollHeaderFade } from '@/components/scroll-header-fade';
import { StoryCard } from '@/components/story-card';
import { ThemedText } from '@/components/themed-text';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { usePullToRefresh } from '@/hooks/use-pull-to-refresh';
import { useTheme } from '@/hooks/use-theme';
import { fetchTodaysBatch } from '@/api/stories';
import { queryKeys } from '@/lib/query';

/**
 * The day's news, and then the end of it.
 *
 * This tab used to be an infinite list: `useInfiniteQuery`, `onEndReached`, and
 * keyset pagination over every story ever ingested. That machinery still exists
 * and still works — it moved to `/archive`, one deliberate tap away — but it
 * cannot be what opens when you press "Feed", because a bottomless feed is the
 * exact thing this app is meant to be an alternative to.
 *
 * Nothing about the data changed. The news layer already caps itself at twelve
 * stories a day, so the feed was always finite at the source and only ever
 * infinite in its presentation. This screen stops overstating it.
 *
 * The category filters moved to the archive along with the pagination.
 * Filtering a batch of nine leaves one or two stories, and turns a set meant to
 * be read whole into a thing to be searched — which is seeking behaviour, and
 * the habit the boundary exists to interrupt.
 *
 * A plain scroll view rather than a FlatList: the batch is capped at 24 rows,
 * so windowing buys nothing, and the sign-off gets to be an ordinary child at
 * the bottom of the page instead of a footer slot.
 */
export default function FeedScreen() {
  const theme = useTheme();

  const { data, error, isPending, refetch } = useQuery({
    queryKey: queryKeys.todaysBatch,
    queryFn: fetchTodaysBatch,
  });

  const { isRefreshing, onRefresh } = usePullToRefresh(refetch);

  // Drives the scrim under the header. `useScrollViewOffset` works here where
  // it couldn't before — this list is no longer a FlatList.
  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  const scrollOffset = useScrollViewOffset(scrollRef);

  const stories = data?.stories ?? [];
  const count = stories.length;

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <SafeAreaView edges={['top']} style={styles.flex}>
        <View style={styles.header}>
          <ThemedText type="title">Good news</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {/* The count goes first, before a single story is read. Being told
                up front that there are nine is what makes reaching the ninth
                feel like finishing rather than like running out. */}
            {count === 0
              ? 'Progress from across the world, with sources.'
              : data?.isFresh
                ? `${count} today — and that's the whole feed.`
                : `${count} in the latest batch.`}
          </ThemedText>
        </View>

        {isPending ? (
          <LoadingState />
        ) : error ? (
          <ErrorState error={error} onRetry={() => void refetch()} />
        ) : (
          // The wrapper is what the scrim positions against — absolute inside
          // the scroll view itself would scroll away with the content.
          <View style={styles.flex}>
            <Animated.ScrollView
              ref={scrollRef}
              style={styles.flex}
              contentContainerStyle={styles.list}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl
                  refreshing={isRefreshing}
                  onRefresh={onRefresh}
                  tintColor={theme.info}
                  colors={[theme.info]}
                  progressBackgroundColor={theme.surface}
                />
              }>
              {count === 0 ? (
                <EmptyState
                  title="Nothing here yet"
                  message="The news job hasn't written anything. Run the news layer's refresh step."
                />
              ) : (
                <>
                  {stories.map((story) => (
                    // No "New" badge. Every story in this batch arrived in the
                    // same run, so a tag meaning "arrived in the latest run"
                    // would sit on all of them and distinguish nothing. It
                    // still earns its place in the archive, where it does.
                    <StoryCard key={story.id} story={story} />
                  ))}

                  <FeedEndCard
                    count={count}
                    isFresh={data?.isFresh ?? false}
                    ingestedAt={data?.ingestedAt ?? null}
                  />
                </>
              )}
            </Animated.ScrollView>

            <ScrollHeaderFade offset={scrollOffset} />
          </View>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  header: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.two,
    gap: Spacing.one,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  list: {
    // Deliberately not the page gutter: a card carries its own 16pt body
    // padding, so 8 here puts the title and the category pill at 24 — level
    // with the header text above.
    paddingHorizontal: Spacing.two,
    paddingTop: Spacing.two,
    gap: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.five,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
});
