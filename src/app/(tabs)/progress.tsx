import { useQuery } from '@tanstack/react-query';
import { FlatList, Linking, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MetricCard } from '@/components/metric-card';
import { ThemedText } from '@/components/themed-text';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { fetchMetrics } from '@/api/metrics';
import { queryKeys } from '@/lib/query';

export default function ProgressScreen() {
  const theme = useTheme();
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
                <MetricCard metric={item} />
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
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={() => void refetch()}
                tintColor={theme.brand}
              />
            }
            ListEmptyComponent={
              <EmptyState
                emoji="📈"
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
