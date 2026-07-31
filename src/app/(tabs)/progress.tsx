import { useQuery } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  type FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
  type ViewToken,
} from "react-native";
import Animated, {
  useAnimatedScrollHandler,
  useSharedValue,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { fetchHumanityArtifact } from "@/api/humanity";
import { MetricChartCard } from "@/components/metric-chart-card";
import { ScrollHeaderFade } from "@/components/scroll-header-fade";
import { ThemedText } from "@/components/themed-text";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import { BottomTabInset, MaxContentWidth, Spacing } from "@/constants/theme";
import { usePullToRefresh } from "@/hooks/use-pull-to-refresh";
import { useTheme } from "@/hooks/use-theme";
import { useFreshData } from "@/lib/fresh-data";
import { queryKeys } from "@/lib/query";

/** How much of a card has to be on screen before its chart draws itself. */
const VIEWABILITY = { itemVisiblePercentThreshold: 40 };

/**
 * How long an arrived-at card stays marked.
 *
 * Long enough to answer "which one of these did I come for" after the scroll
 * settles, short enough that the screen goes back to being an ordinary list
 * rather than one with a permanently special row in it.
 */
const HIGHLIGHT_MS = 2600;

/**
 * Where the target card lands vertically, as a fraction of the viewport. A
 * little off the top rather than flush against it, so the row above stays
 * visible and the landing reads as a scroll rather than as a screen swap.
 */
const LANDING = 0.08;

export default function ProgressScreen() {
  const theme = useTheme();
  // The list renders well past the fold, so charts would otherwise play their
  // fill while still off screen. Tracking visibility means each one draws when
  // you actually reach it — the vertical equivalent of the pagers on Today.
  const [visibleIds, setVisibleIds] = useState<string[]>([]);
  // Stable identity: FlatList refuses a changed onViewableItemsChanged.
  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      setVisibleIds(viewableItems.map((token) => token.key));
    },
    [],
  );

  const { data, error, isPending, refetch } = useQuery({
    queryKey: queryKeys.humanity,
    queryFn: fetchHumanityArtifact,
  });

  const { isRefreshing, onRefresh } = usePullToRefresh(refetch);

  // Drives the scrim under the header, same as the feed. A scroll handler
  // rather than `useScrollViewOffset`, which only accepts an animated
  // ScrollView ref — this stays a FlatList for its viewability tracking.
  const scrollOffset = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((event) => {
    scrollOffset.value = event.contentOffset.y;
  });

  // Which cards carry a measurement this device hasn't seen. Not "changed since
  // yesterday" — every nowcast is, daily, by construction.
  const fresh = useFreshData(data);

  // Longest history first, so the charts that actually earn the name "the long
  // view" lead — CO₂ per person reaches back to 1750, internet access to 2005.
  //
  // Memoised because the scroll effect below depends on this array: rebuilt on
  // every render, it would retrigger the effect forever.
  const metrics = useMemo(
    () =>
      [...(data?.metrics ?? [])].sort((a, b) =>
        (a.series[0]?.t ?? "").localeCompare(b.series[0]?.t ?? ""),
      ),
    [data],
  );

  /**
   * Arriving from a story's trend card, which navigates here with the
   * indicator's id.
   *
   * The param *is* the state — it drives both the scroll and the mark, and
   * clearing it is what ends the highlight. Copying it into `useState` was the
   * obvious first shape and the wrong one: it duplicates a source of truth, and
   * the copy has to be written from inside an effect, which is the cascading
   * render `react-hooks/set-state-in-effect` exists to catch.
   *
   * Clearing it is not tidiness either. The tab bar navigates with
   * `route.params`, so a param left behind on this route gets replayed every
   * subsequent time the reader presses Progress — yanking them back to a chart
   * they came here to scroll past.
   */
  const { metric: focusId } = useLocalSearchParams<{ metric?: string }>();
  const listRef = useRef<FlatList<(typeof metrics)[number]> | null>(null);

  const focusIndex = useMemo(
    () => (focusId ? metrics.findIndex((metric) => metric.id === focusId) : -1),
    [focusId, metrics],
  );

  useEffect(() => {
    if (!focusId) return;

    // The param can arrive before the artifact has, and on a cold start it
    // does. Waiting rather than giving up: the effect reruns when the metrics
    // land, and the scroll happens then.
    if (metrics.length === 0) return;

    // A retired indicator, or a story tagged against a metric that has since
    // left the artifact. Nothing to scroll to — but the param still has to go,
    // or the tab bar will replay this miss forever.
    if (focusIndex < 0) {
      router.setParams({ metric: undefined });
      return;
    }

    listRef.current?.scrollToIndex({ index: focusIndex, animated: true, viewPosition: LANDING });

    const timer = setTimeout(() => router.setParams({ metric: undefined }), HIGHLIGHT_MS);
    return () => clearTimeout(timer);
  }, [focusId, focusIndex, metrics.length]);

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <SafeAreaView edges={["top"]} style={styles.flex}>
        <View style={styles.header}>
          <ThemedText type="title">Trends</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            The trends that don&rsquo;t make the news, because they happen
            slowly.
          </ThemedText>

          {/* The only permanent way in to the weighting screen. The home screen
              links there too, but only once a weighting exists — which it never
              will if there is nowhere to make one. */}
          <Pressable
            accessibilityRole="button"
            accessibilityHint="Set how much each category counts toward the humanity score"
            onPress={() => router.push("/weighting")}
            hitSlop={8}
            style={styles.weightingLink}
          >
            <ThemedText type="linkPrimary">Weight what matters to you</ThemedText>
          </Pressable>
        </View>

        {isPending ? (
          <LoadingState label="Loading the numbers…" />
        ) : error ? (
          <ErrorState error={error} onRetry={() => void refetch()} />
        ) : (
          // The wrapper is what the scrim positions against — absolute inside
          // the list itself would scroll away with the content.
          <View style={styles.flex}>
            <Animated.FlatList
              ref={listRef}
              data={metrics}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <MetricChartCard
                  metric={item}
                  active={visibleIds.includes(item.id)}
                  isNew={fresh.ids.has(item.id)}
                  previousValue={fresh.previousValues.get(item.id)}
                  highlighted={item.id === focusId}
                />
              )}
              /**
               * These cards have no fixed height — the label wraps to one line
               * or two and the basis text runs to three — so there is no honest
               * `getItemLayout` to give, and without one `scrollToIndex` fails
               * outright for any row the list has not rendered yet. Which is
               * most of them: thirteen charts is several screens.
               *
               * The recovery is the documented one. Jump to the estimate the
               * list offers, which renders the rows around it, then ask again
               * now that the target is measurable. The second call is what
               * lands the card in the right place; the first only gets it close
               * enough to exist.
               */
              onScrollToIndexFailed={({ index, averageItemLength }) => {
                listRef.current?.scrollToOffset({
                  offset: index * averageItemLength,
                  animated: true,
                });
                setTimeout(() => {
                  listRef.current?.scrollToIndex({
                    index,
                    animated: true,
                    viewPosition: LANDING,
                  });
                }, 120);
              }}
              onScroll={onScroll}
              // 16ms rather than the default 50: the scrim tracks the first
              // 24pt of travel, which at 50 lands in two visible steps.
              scrollEventThrottle={16}
              contentContainerStyle={styles.list}
              showsVerticalScrollIndicator={false}
              onViewableItemsChanged={onViewableItemsChanged}
              viewabilityConfig={VIEWABILITY}
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
                  title="No metrics yet"
                  message="The progress data hasn't been built yet. Run the data layer's backfill and publish steps."
                />
              }
            />

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
  weightingLink: {
    alignSelf: "flex-start",
    paddingTop: Spacing.two,
  },
  header: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.two,
    gap: Spacing.one,
    width: "100%",
    maxWidth: MaxContentWidth,
    alignSelf: "center",
  },
  list: {
    padding: Spacing.four,
    gap: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.five,
    width: "100%",
    maxWidth: MaxContentWidth,
    alignSelf: "center",
  },
  cardWrapper: {
    gap: Spacing.two,
  },
  sourceLink: {
    alignSelf: "flex-end",
    paddingRight: Spacing.one,
  },
});
