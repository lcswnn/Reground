import { useQuery } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { RefreshControl, StyleSheet, View, type ViewToken } from "react-native";
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
import { useFreshMetrics } from "@/lib/fresh-data";
import { queryKeys } from "@/lib/query";

/** How much of a card has to be on screen before its chart draws itself. */
const VIEWABILITY = { itemVisiblePercentThreshold: 40 };

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
  const freshMetricIds = useFreshMetrics(data);

  // Longest history first, so the charts that actually earn the name "the long
  // view" lead — CO₂ per person reaches back to 1750, internet access to 2005.
  const metrics = [...(data?.metrics ?? [])].sort((a, b) =>
    (a.series[0]?.t ?? "").localeCompare(b.series[0]?.t ?? ""),
  );

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <SafeAreaView edges={["top"]} style={styles.flex}>
        <View style={styles.header}>
          <ThemedText type="title">Progress</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            The trends that don&rsquo;t make the news, because they happen
            slowly.
          </ThemedText>
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
              data={metrics}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <MetricChartCard
                  metric={item}
                  active={visibleIds.includes(item.id)}
                  isNew={freshMetricIds.has(item.id)}
                />
              )}
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
