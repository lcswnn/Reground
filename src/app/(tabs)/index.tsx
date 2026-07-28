import { useQueries } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CategoryPill } from '@/components/category-pill';
import { MetricCard } from '@/components/metric-card';
import { ThemedText } from '@/components/themed-text';
import { ErrorState, LoadingState } from '@/components/ui/states';
import { BottomTabInset, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { fetchCurrentStreak, fetchDailyProof } from '@/api/stories';
import { fetchMetrics } from '@/api/metrics';
import { formatDay, todayISO } from '@/lib/format';
import { queryKeys } from '@/lib/query';
import { useSession } from '@/lib/session';

export default function TodayScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { session } = useSession();

  // Separate queries so the metrics cache is shared with the Progress tab
  // rather than refetched per screen.
  const [proofQuery, metricsQuery, streakQuery] = useQueries({
    queries: [
      { queryKey: queryKeys.dailyProof, queryFn: () => fetchDailyProof() },
      { queryKey: queryKeys.metrics, queryFn: fetchMetrics },
      { queryKey: queryKeys.streak, queryFn: fetchCurrentStreak },
    ],
  });

  const greeting = getGreeting();
  const firstName =
    (session?.user.user_metadata?.display_name as string | undefined)?.split(' ')[0] ?? 'friend';

  const isPending = proofQuery.isPending || metricsQuery.isPending;
  const error = proofQuery.error ?? metricsQuery.error;

  function refreshAll() {
    void proofQuery.refetch();
    void metricsQuery.refetch();
    void streakQuery.refetch();
  }

  if (isPending) return <LoadingState label="Gathering good news…" />;
  if (error) return <ErrorState error={error} onRetry={refreshAll} />;

  const story = proofQuery.data ?? null;
  const streak = streakQuery.data ?? 0;
  const isRefreshing = proofQuery.isRefetching || metricsQuery.isRefetching;
  // Three metrics is enough to signal "there is more here" without turning the
  // home screen into the Progress tab.
  const highlightMetrics = (metricsQuery.data ?? []).slice(0, 3);

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={refreshAll}
            tintColor={theme.brand}
          />
        }>
        <SafeAreaView edges={['top']} style={styles.header}>
          <View style={styles.headerRow}>
            <View style={styles.headerText}>
              <ThemedText type="eyebrow" themeColor="textSecondary">
                {formatDay(todayISO())}
              </ThemedText>
              <ThemedText type="title">
                {greeting}, {firstName}.
              </ThemedText>
            </View>
            {streak > 0 ? (
              <View style={[styles.streak, { backgroundColor: theme.backgroundElement }]}>
                <ThemedText style={styles.streakEmoji}>🔥</ThemedText>
                <ThemedText type="smallBold">{streak}</ThemedText>
              </View>
            ) : null}
          </View>
        </SafeAreaView>

        <View style={styles.content}>
          <View style={styles.sectionHeader}>
            <ThemedText type="eyebrow" themeColor="textMuted">
              Today&rsquo;s proof
            </ThemedText>
          </View>

          {story ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={story.title}
              onPress={() => router.push({ pathname: '/story/[id]', params: { id: story.id } })}
              style={({ pressed }) => [
                styles.proofCard,
                { backgroundColor: theme.surface, borderColor: theme.border },
                pressed && styles.pressed,
              ]}>
              {story.image_url ? (
                <Image
                  source={{ uri: story.image_url }}
                  style={styles.proofImage}
                  contentFit="cover"
                  transition={250}
                />
              ) : null}
              <View style={styles.proofBody}>
                <CategoryPill category={story.category} />
                <ThemedText type="subtitle">{story.title}</ThemedText>
                <ThemedText type="default" themeColor="textSecondary">
                  {story.summary}
                </ThemedText>
                <View style={styles.proofFooter}>
                  <ThemedText type="small" themeColor="textMuted" numberOfLines={1}>
                    {story.source_name}
                  </ThemedText>
                  <ThemedText type="linkPrimary">Read the proof →</ThemedText>
                </View>
              </View>
            </Pressable>
          ) : (
            <View
              style={[
                styles.emptyProof,
                { backgroundColor: theme.brandSoft, borderColor: theme.border },
              ]}>
              <ThemedText style={styles.emptyEmoji}>🌤️</ThemedText>
              <ThemedText type="sectionTitle">No story featured yet</ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={styles.centered}>
                Add a story with today&rsquo;s date in `featured_date` and it will appear here.
              </ThemedText>
            </View>
          )}

          {highlightMetrics.length > 0 ? (
            <View style={styles.metricsSection}>
              <View style={styles.sectionHeaderRow}>
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

              {highlightMetrics.map((metric) => (
                <MetricCard key={metric.id} metric={metric} />
              ))}
            </View>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: {
    paddingBottom: BottomTabInset + Spacing.five,
  },
  header: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    gap: Spacing.two,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  headerText: {
    flex: 1,
    gap: Spacing.one,
  },
  streak: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    borderRadius: Radius.pill,
  },
  streakEmoji: {
    fontSize: 14,
  },
  content: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    gap: Spacing.three,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  sectionHeader: {
    marginTop: Spacing.two,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  proofCard: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    overflow: 'hidden',
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.995 }],
  },
  proofImage: {
    width: '100%',
    height: 200,
  },
  proofBody: {
    padding: Spacing.four,
    gap: Spacing.two,
  },
  proofFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  emptyProof: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    padding: Spacing.five,
    alignItems: 'center',
    gap: Spacing.two,
  },
  emptyEmoji: {
    fontSize: 40,
  },
  centered: {
    textAlign: 'center',
  },
  metricsSection: {
    marginTop: Spacing.four,
    gap: Spacing.three,
  },
});
