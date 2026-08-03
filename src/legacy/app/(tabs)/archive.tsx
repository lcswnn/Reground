import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import Animated, { useAnimatedScrollHandler, useSharedValue } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScrollHeaderFade } from '@/components/scroll-header-fade';
import { StoryCard } from '@/components/story-card';
import { ThemedText } from '@/components/themed-text';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import { CATEGORIES, CATEGORY_KEYS } from '@/constants/categories';
import { BottomTabInset, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { usePullToRefresh } from '@/hooks/use-pull-to-refresh';
import { useTheme } from '@/hooks/use-theme';
import { fetchFeed, fetchLatestIngestAt } from '@/api/stories';
import { isNewlyIngested } from '@/lib/ingest';
import { queryKeys } from '@/lib/query';
import type { StoryCategory } from '@/types/database';

/**
 * Everything, going back as far as it goes. What the Feed tab used to be.
 *
 * A route of its own rather than a mode on the Feed tab, and that is the whole
 * design. A toggle would mean the tab is unbounded whenever the reader last
 * left it that way, and "bounded unless you forgot" is not a property anybody
 * can rely on. Here the tab is always the day's batch, and reaching this screen
 * costs a tap from the sign-off at the bottom of it — you arrive having been
 * told you were already finished, which is the point at which more is a choice.
 *
 * It lives inside `(tabs)` with `href: null`: registered in the tab navigator,
 * so the bar stays on screen, but absent from the bar itself, so nothing is
 * selected while you are here. That empty bar is the design and not a
 * side-effect — it is the app quietly showing you that you have stepped outside
 * its four rooms, and the way back is any one of them.
 *
 * The screen itself is deliberately not softened. Infinite scroll, every
 * filter, no nudging: a reader who has walked past the boundary on purpose
 * should get the good version of what they came for rather than a sulky one.
 */
export default function ArchiveScreen() {
  const theme = useTheme();
  const router = useRouter();
  const [category, setCategory] = useState<StoryCategory | null>(null);

  const {
    data,
    error,
    isPending,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    // The category is part of the key, so switching filters swaps to a
    // separately-cached list instead of resetting pagination by hand.
    queryKey: queryKeys.feed(category),
    queryFn: ({ pageParam }) => fetchFeed({ cursor: pageParam, category }),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });

  // Outside the feed query so switching category filters doesn't refetch it,
  // and so the answer is the same one for every filter.
  const { data: latestIngestAt = null, refetch: refetchIngest } = useQuery({
    queryKey: queryKeys.latestIngest,
    queryFn: fetchLatestIngestAt,
  });

  // Both, or a pull that brings down a new batch would render it untagged: the
  // stories would be current and the timestamp they're compared against stale.
  const { isRefreshing, onRefresh } = usePullToRefresh(() =>
    Promise.all([refetch(), refetchIngest()]),
  );

  // Drives the scrim under the filter row. A scroll handler rather than
  // `useScrollViewOffset`, which only accepts an animated ScrollView ref — this
  // stays a FlatList for windowing over an unbounded feed.
  const scrollOffset = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((event) => {
    scrollOffset.value = event.contentOffset.y;
  });

  const stories = data?.pages.flatMap((page) => page.stories) ?? [];

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      {/* The same header block as every other tab — title, then one line under
          it. This screen has no navigator header of its own to borrow a title
          from: it is a tab, just one the bar doesn't list. */}
      <SafeAreaView edges={['top']} style={styles.flex}>
        <View style={styles.header}>
          {/* The way back, in the corner a back button belongs in.

              This screen is a tab, so it has no navigator header to inherit one
              from, and the tab bar below it has nothing lit — which is the
              intended signal that you are outside the four rooms, but it does
              leave the reader to work out for themselves that any tab is the
              exit. This says it.

              `navigate` to Feed rather than `router.back()`: switching tabs is
              not a stack push, so there is not reliably a frame to pop, and the
              sign-off at the bottom of Feed is the only way into this screen
              anyway. Naming the destination is both more predictable and more
              honest than a chevron that guesses. */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back to today's news"
            onPress={() => router.navigate('/feed')}
            hitSlop={12}
            style={({ pressed }) => [styles.back, pressed && styles.backPressed]}>
            <SymbolView
              name="chevron.left"
              size={16}
              tintColor={theme.brandStrong}
              // No SF Symbols off iOS, and the label beside this already names
              // the destination — so the fallback only has to carry direction.
              fallback={<ThemedText type="linkPrimary">←</ThemedText>}
            />
            <ThemedText type="linkPrimary">Today&rsquo;s news</ThemedText>
          </Pressable>

          <ThemedText type="title">Archive</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Everything we&rsquo;ve published, all the way back.
          </ThemedText>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterRow}
          contentContainerStyle={styles.filters}>
          <FilterChip label="All" active={category === null} onPress={() => setCategory(null)} />
          {CATEGORY_KEYS.map((key) => (
            <FilterChip
              key={key}
              label={CATEGORIES[key].label}
              active={category === key}
              onPress={() => setCategory(key)}
            />
          ))}
        </ScrollView>

        {isPending ? (
          <LoadingState />
        ) : error ? (
          <ErrorState error={error} onRetry={() => void refetch()} />
        ) : (
          // The wrapper is what the scrim positions against — absolute inside
          // the list itself would scroll away with the content.
          <View style={styles.flex}>
            <Animated.FlatList
              data={stories}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <StoryCard story={item} isNew={isNewlyIngested(item, latestIngestAt)} />
              )}
              onScroll={onScroll}
              // 16ms rather than the default 50: the scrim tracks the first
              // 24pt of travel, which at 50 lands in two visible steps.
              scrollEventThrottle={16}
              // flex-basis 0 rather than the ScrollView default, so the list
              // takes exactly what the header and filter row leave behind.
              style={styles.flex}
              contentContainerStyle={styles.list}
              showsVerticalScrollIndicator={false}
              onEndReached={() => {
                if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
              }}
              onEndReachedThreshold={0.5}
              refreshControl={
                <RefreshControl
                  refreshing={isRefreshing}
                  onRefresh={onRefresh}
                  tintColor={theme.info}
                  colors={[theme.info]}
                  progressBackgroundColor={theme.surface}
                />
              }
              ListEmptyComponent={
                <EmptyState
                  title="Nothing here yet"
                  message={
                    category
                      ? 'No stories in this category yet. Try another filter.'
                      : 'Add rows to the stories table and they will show up here.'
                  }
                />
              }
              ListFooterComponent={
                isFetchingNextPage ? (
                  <ActivityIndicator style={styles.footerSpinner} color={theme.brandStrong} />
                ) : !hasNextPage && stories.length > 0 ? (
                  // The archive does run out eventually, and saying so costs
                  // nothing. Plain and unceremonious — the sign-off on the Feed
                  // tab is the one that means something, and repeating it here
                  // would spend it.
                  <ThemedText type="small" themeColor="textMuted" style={styles.footerNote}>
                    That&rsquo;s everything we&rsquo;ve published.
                  </ThemedText>
                ) : null
              }
            />

            <ScrollHeaderFade offset={scrollOffset} />
          </View>
        )}
      </SafeAreaView>
    </View>
  );
}

function FilterChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={[
        styles.chip,
        {
          backgroundColor: active ? theme.info : theme.backgroundElement,
        },
      ]}>
      {/* `info` flips from a dark blue in light mode to a light one in dark
          mode, so the label rides on `background` — the one token that is
          always the opposite end of the scheme — rather than a fixed ink. */}
      <ThemedText
        type="smallBold"
        style={{ color: active ? theme.background : theme.textSecondary }}>
        {label}
      </ThemedText>
    </Pressable>
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
  /**
   * `flex-start` so the row is only as wide as its contents — stretched to the
   * header's full width it would be a strip of dead space to the right of the
   * label that still answered to a tap.
   *
   * The chevron is optically heavier on its right side than the gap between a
   * pair of words, so `half` rather than `one` is what sets the glyph and the
   * label the same distance apart as they look.
   */
  back: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: Spacing.half,
    paddingBottom: Spacing.one,
  },
  backPressed: {
    opacity: 0.6,
  },
  /**
   * A ScrollView carries `flexGrow: 1, flexShrink: 1` in its own base style, so
   * left alone this row fights the list below it for the column's height and
   * loses a chunk of itself — the chips get clipped from the middle down, and
   * the row re-measures every time the list's contents change. Pinning it to
   * its natural height keeps it out of that negotiation.
   */
  filterRow: {
    flexGrow: 0,
    flexShrink: 0,
  },
  filters: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    gap: Spacing.two,
  },
  chip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.pill,
  },
  list: {
    // Deliberately not the page gutter: a card carries its own 16pt body
    // padding, so 8 here puts the title and the category pill at 24 — level
    // with the left edge of the filter chips above.
    paddingHorizontal: Spacing.two,
    paddingTop: Spacing.two,
    gap: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.five,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  footerSpinner: {
    paddingVertical: Spacing.four,
  },
  footerNote: {
    textAlign: 'center',
    paddingVertical: Spacing.four,
  },
});
