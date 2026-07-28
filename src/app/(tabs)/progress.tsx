import { useQuery } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import {
  FlatList,
  Linking,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
  type ViewToken,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MetricCard } from '@/components/metric-card';
import { ThemedText } from '@/components/themed-text';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { fetchMetrics } from '@/api/metrics';
import { queryKeys } from '@/lib/query';

/** How much of a card has to be on screen before its chart draws itself. */
const VIEWABILITY = { itemVisiblePercentThreshold: 40 };

export default function ProgressScreen() {
  const theme = useTheme();
  // The list renders well past the fold, so charts would otherwise play their
  // fill while still off screen. Tracking visibility means each one draws when
  // you actually reach it — the vertical equivalent of the pagers on Today.
  const [visibleIds, setVisibleIds] = useState<string[]>([]);
  // Stable identity: FlatList refuses a changed onViewableItemsChanged.
  const onViewableItemsChanged = useCallback(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    setVisibleIds(viewableItems.map((token) => token.key));
  }, []);

  const {
    data,
    error,
    isPending,
    isRefetching: isRefreshing,
    refetch,
  } = useQuery({ queryKey: queryKeys.metrics, queryFn: fetchMetrics });

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <SafeAreaView edges={['top']} style={styles.flex}>
        <View style={styles.header}>
          <ThemedText type="title">The long view</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            The trends that don&rsquo;t make the news, because they happen slowly.
          </ThemedText>
        </View>

        {isPending ? (
          <LoadingState label="Loading the numbers…" />
        ) : error ? (
          <ErrorState error={error} onRetry={() => void refetch()} />
        ) : (
          <FlatList
            data={data ?? []}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View style={styles.cardWrapper}>
                <MetricCard metric={item} active={visibleIds.includes(item.id)} />
                <Pressable
                  accessibilityRole="link"
                  accessibilityLabel={`Open source: ${item.source_name}`}
                  onPress={() => Linking.openURL(item.source_url)}
                  hitSlop={6}
                  style={styles.sourceLink}>
                  <ThemedText type="linkPrimary">View source →</ThemedText>
                </Pressable>
              </View>
            )}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            onViewableItemsChanged={onViewableItemsChanged}
            viewabilityConfig={VIEWABILITY}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={() => void refetch()}
                tintColor={theme.brand}
              />
            }
            ListEmptyComponent={
              <EmptyState
                title="No metrics yet"
                message="Seed the metrics and metric_points tables and the trends will appear here."
              />
            }
          />
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
    padding: Spacing.four,
    gap: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.five,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  cardWrapper: {
    gap: Spacing.two,
  },
  sourceLink: {
    alignSelf: 'flex-end',
    paddingRight: Spacing.one,
  },
});
