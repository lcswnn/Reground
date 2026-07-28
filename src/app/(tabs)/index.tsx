import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, { useAnimatedRef, useScrollViewOffset } from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { HumanityProgress } from '@/components/humanity-progress';
import { MetricCard } from '@/components/metric-card';
import { ScrollTopFade } from '@/components/scroll-top-fade';
import { ThemedText } from '@/components/themed-text';
import { ErrorState, LoadingState } from '@/components/ui/states';
import { WorldMetricTile } from '@/components/world-metric-tile';
import { BottomTabInset, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { WORLD_METRICS, WORLD_METRICS_PER_PAGE } from '@/constants/world-metrics';
import { usePullToRefresh } from '@/hooks/use-pull-to-refresh';
import { useTheme } from '@/hooks/use-theme';
import { fetchMetrics } from '@/api/metrics';
import { useAppReady } from '@/lib/app-ready';
import { formatDay, todayISO } from '@/lib/format';
import { queryKeys } from '@/lib/query';
import { useSession } from '@/lib/session';

const WORLD_PAGES = chunk(WORLD_METRICS, WORLD_METRICS_PER_PAGE);

export default function TodayScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { session } = useSession();
  const { width } = useWindowDimensions();
  // This screen mounts under the splash now, so the bars would otherwise fill
  // while hidden and be sitting full by the time anyone sees them.
  const isRevealed = useAppReady();
  const [metricPage, setMetricPage] = useState(0);
  const [worldPage, setWorldPage] = useState(0);

  // Drives the status-bar scrim: this page scrolls its own header up past the
  // clock, so the text needs something to pass behind.
  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  const scrollOffset = useScrollViewOffset(scrollRef);

  const insets = useSafeAreaInsets();
  // Same blue as the progress bars — it used to be a hardcoded pair of hexes
  // here, which is exactly how a palette drifts.
  const tint = theme.info;

  // Each item is a full-width page with the gutter *inside* it, so the list's
  // own width is the page width and `pagingEnabled` lands exactly on each card.
  const pageWidth = Math.min(width, MaxContentWidth);

  // Shares the metrics cache with the Progress tab rather than refetching.
  const metricsQuery = useQuery({ queryKey: queryKeys.metrics, queryFn: fetchMetrics });

  const greeting = getGreeting();
  const firstName =
    (session?.user.user_metadata?.display_name as string | undefined)?.split(' ')[0] ?? 'friend';

  const { isRefreshing, onRefresh } = usePullToRefresh(metricsQuery.refetch);

  const metrics = metricsQuery.data ?? [];

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <Animated.ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            // Every other tab puts its scroller inside the SafeAreaView, so the
            // wheel lands below the clock on its own. This screen scrolls its
            // header up past the status bar, which means the scroll view starts
            // at y=0 and the wheel draws behind the notch — invisible. Push it
            // down by the inset it is missing.
            progressViewOffset={insets.top}
            // tintColor is the iOS wheel; colors/progressBackgroundColor are
            // the Android one. Setting only the first leaves Android with its
            // default blue on a warm background.
            tintColor={tint}
            colors={[tint]}
            progressBackgroundColor={theme.surface}
          />
        }>
        <SafeAreaView edges={['top']} style={styles.header}>
          <ThemedText type="eyebrow" themeColor="textSecondary">
            {formatDay(todayISO())}
          </ThemedText>
          <ThemedText
            type="title"
            style={styles.greeting}
            numberOfLines={1}
            // With the streak gone the line has the full width, but a long name
            // can still overrun — shrink rather than truncate someone's name.
            adjustsFontSizeToFit
            minimumFontScale={0.75}>
            {greeting}, {firstName}.
          </ThemedText>
        </SafeAreaView>

        <View style={styles.summarySection}>
          <HumanityProgress active={isRevealed} />
        </View>

        <View style={styles.worldSection}>
          <View style={styles.sectionHeaderPadded}>
            <ThemedText type="eyebrow" themeColor="textMuted">
              State of the world
            </ThemedText>
          </View>

          <FlatList
            data={WORLD_PAGES}
            keyExtractor={(page) => page[0].id}
            renderItem={({ item: page, index: pageIndex }) => (
              <View style={[styles.worldPage, { width: pageWidth }]}>
                {[page.slice(0, 2), page.slice(2, 4)].map((row, rowIndex) => (
                  <View key={rowIndex} style={styles.worldRow}>
                    {row.map((metric, columnIndex) => (
                      <WorldMetricTile
                        key={metric.id}
                        metric={metric}
                        active={pageIndex === worldPage && isRevealed}
                        index={rowIndex * 2 + columnIndex}
                      />
                    ))}
                    {/* Keeps a lone tile on a short final page half-width. */}
                    {row.length === 1 ? <View style={styles.tileSpacer} /> : null}
                  </View>
                ))}
              </View>
            )}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            getItemLayout={(_, index) => ({
              length: pageWidth,
              offset: pageWidth * index,
              index,
            })}
            onMomentumScrollEnd={(event) =>
              setWorldPage(Math.round(event.nativeEvent.contentOffset.x / pageWidth))
            }
          />

          {WORLD_PAGES.length > 1 ? (
            <View style={styles.dots}>
              {WORLD_PAGES.map((page, index) => (
                <View
                  key={page[0].id}
                  style={[
                    styles.dot,
                    {
                      backgroundColor:
                        index === worldPage ? theme.brandStrong : theme.backgroundSelected,
                    },
                  ]}
                />
              ))}
            </View>
          ) : null}
        </View>

        {metricsQuery.isPending ? (
          <LoadingState label="Gathering good news…" />
        ) : metricsQuery.error ? (
          <ErrorState error={metricsQuery.error} onRetry={onRefresh} />
        ) : metrics.length > 0 ? (
          <View style={styles.metricsSection}>
            <View style={[styles.sectionHeaderRow, styles.metricsHeader]}>
              <ThemedText type="eyebrow" themeColor="textMuted">
                The long view
              </ThemedText>
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push('/progress')}
                hitSlop={8}>
                <ThemedText type="linkPrimary">See all</ThemedText>
              </Pressable>
            </View>

            <FlatList
              data={metrics}
              keyExtractor={(metric) => metric.id}
              renderItem={({ item, index }) => (
                <View style={[styles.metricPage, { width: pageWidth }]}>
                  <MetricCard metric={item} active={index === metricPage && isRevealed} />
                </View>
              )}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              getItemLayout={(_, index) => ({
                length: pageWidth,
                offset: pageWidth * index,
                index,
              })}
              onMomentumScrollEnd={(event) =>
                setMetricPage(Math.round(event.nativeEvent.contentOffset.x / pageWidth))
              }
            />

            {metrics.length > 1 ? (
              <View style={styles.dots}>
                {metrics.map((metric, index) => (
                  <View
                    key={metric.id}
                    style={[
                      styles.dot,
                      {
                        backgroundColor:
                          index === metricPage ? theme.brandStrong : theme.backgroundSelected,
                      },
                    ]}
                  />
                ))}
              </View>
            ) : null}
          </View>
        ) : null}
      </Animated.ScrollView>

      <ScrollTopFade offset={scrollOffset} />
    </View>
  );
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function chunk<T>(items: T[], size: number): T[][] {
  const pages: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    pages.push(items.slice(index, index + size));
  }
  return pages;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: {
    paddingBottom: BottomTabInset + Spacing.five,
  },
  header: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    gap: Spacing.one,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  greeting: {
    fontSize: 28,
    lineHeight: 36,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionHeaderPadded: {
    paddingHorizontal: Spacing.four,
  },
  // Keeps the page gutter rather than going full-bleed like the carousels
  // under it — it's a single card, so it lines up with the header above.
  summarySection: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  // Same full-bleed treatment as the long view: header keeps the page gutter,
  // the pager runs edge to edge.
  worldSection: {
    paddingTop: Spacing.three,
    gap: Spacing.three,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  worldPage: {
    paddingHorizontal: Spacing.four,
    gap: Spacing.three,
  },
  worldRow: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  tileSpacer: {
    flex: 1,
  },
  // Sits outside the page gutter so the carousel can run to the screen edge;
  // the header keeps the gutter so it still lines up with the cards.
  metricsSection: {
    marginTop: Spacing.four,
    gap: Spacing.three,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  metricsHeader: {
    paddingHorizontal: Spacing.four,
  },
  metricPage: {
    paddingHorizontal: Spacing.four,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: Radius.pill,
  },
});
