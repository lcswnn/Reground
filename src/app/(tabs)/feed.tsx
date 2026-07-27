import { useInfiniteQuery } from '@tanstack/react-query';
import { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { StoryCard } from '@/components/story-card';
import { ThemedText } from '@/components/themed-text';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import { CATEGORIES, CATEGORY_KEYS } from '@/constants/categories';
import { BottomTabInset, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { fetchFeed } from '@/api/stories';
import { queryKeys } from '@/lib/query';
import type { StoryCategory } from '@/types/database';

export default function FeedScreen() {
  const theme = useTheme();
  const [category, setCategory] = useState<StoryCategory | null>(null);

  const {
    data,
    error,
    isPending,
    isRefetching,
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

  const stories = data?.pages.flatMap((page) => page.stories) ?? [];

  const filters = (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.filters}>
      <FilterChip label="All" active={category === null} onPress={() => setCategory(null)} />
      {CATEGORY_KEYS.map((key) => (
        <FilterChip
          key={key}
          label={CATEGORIES[key].label}
          emoji={CATEGORIES[key].emoji}
          active={category === key}
          onPress={() => setCategory(key)}
        />
      ))}
    </ScrollView>
  );

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <SafeAreaView edges={['top']} style={styles.flex}>
        <View style={styles.header}>
          <ThemedText type="title">Good news</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Progress from across the world, with sources.
          </ThemedText>
        </View>

        {filters}

        {isPending ? (
          <LoadingState />
        ) : error ? (
          <ErrorState error={error} onRetry={() => void refetch()} />
        ) : (
          <FlatList
            data={stories}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <StoryCard story={item} />}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            onEndReached={() => {
              if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
            }}
            onEndReachedThreshold={0.5}
            refreshControl={
              <RefreshControl
                refreshing={isRefetching && !isFetchingNextPage}
                onRefresh={() => void refetch()}
                tintColor={theme.brand}
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
                <ActivityIndicator style={styles.footerSpinner} color={theme.brand} />
              ) : null
            }
          />
        )}
      </SafeAreaView>
    </View>
  );
}

function FilterChip({
  label,
  emoji,
  active,
  onPress,
}: {
  label: string;
  emoji?: string;
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
          backgroundColor: active ? theme.brand : theme.backgroundElement,
        },
      ]}>
      <ThemedText
        type="smallBold"
        style={{ color: active ? theme.textOnBrand : theme.textSecondary }}>
        {emoji ? `${emoji} ` : ''}
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
    padding: Spacing.four,
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
});
