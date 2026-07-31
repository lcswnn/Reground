import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { StoryCard } from '@/components/story-card';
import { ThemedText } from '@/components/themed-text';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import { BottomTabInset, Fonts, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { usePullToRefresh } from '@/hooks/use-pull-to-refresh';
import { useTheme } from '@/hooks/use-theme';
import { fetchSavedStories } from '@/api/stories';
import { queryKeys } from '@/lib/query';
import { useSession } from '@/lib/session';
import { useDailyStreak } from '@/lib/streak';

export default function ProfileScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { session } = useSession();

  const savedQuery = useQuery({
    queryKey: queryKeys.savedStories,
    queryFn: fetchSavedStories,
  });

  const saved = savedQuery.data ?? [];

  /**
   * Days ever, from the device, replacing a server-side consecutive-day streak
   * over `story_reads`.
   *
   * Two things wrong with the old tile. It was a streak, which this app has
   * stopped keeping — see `DaysPill`. And it counted a different thing from the
   * pill on the home screen, so the same reader could be told "3" here and
   * something else there, which is how a number stops meaning anything.
   *
   * One source now, and it is the local one: it renders on the first frame, it
   * survives a dead connection, and it costs no request.
   */
  const { total } = useDailyStreak();

  const { isRefreshing, onRefresh } = usePullToRefresh(savedQuery.refetch);

  const displayName =
    (session?.user.user_metadata?.display_name as string | undefined) ?? 'Friend';
  const email = session?.user.email ?? '';

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <SafeAreaView edges={['top']} style={styles.flex}>
        <ScrollView
          contentContainerStyle={styles.scroll}
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
          <View style={styles.header}>
            <View style={[styles.avatar, { backgroundColor: theme.brandSoft }]}>
              <ThemedText style={styles.avatarText}>
                {displayName.charAt(0).toUpperCase()}
              </ThemedText>
            </View>
            <View style={styles.headerText}>
              <ThemedText type="title">{displayName}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {email}
              </ThemedText>
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Settings"
              onPress={() => router.push('/settings')}
              hitSlop={12}
              style={({ pressed }) => [styles.settings, pressed && styles.settingsPressed]}>
              <SymbolView
                name="gearshape"
                size={26}
                tintColor={theme.textSecondary}
                // No SF Symbols off iOS. A dot would be meaningless for an
                // entry point, so the fallback says what it opens.
                fallback={<ThemedText type="linkPrimary">Settings</ThemedText>}
              />
            </Pressable>
          </View>

          <View style={styles.stats}>
            <StatTile value={String(total)} label={total === 1 ? 'day here' : 'days here'} />
            <StatTile
              value={savedQuery.isPending ? '—' : String(saved.length)}
              label="saved"
            />
          </View>

          <View style={styles.section}>
            <ThemedText type="sectionTitle">Saved stories</ThemedText>

            {savedQuery.isPending ? (
              <LoadingState />
            ) : savedQuery.error ? (
              <ErrorState error={savedQuery.error} onRetry={onRefresh} />
            ) : saved.length > 0 ? (
              <View style={styles.savedList}>
                {saved.map((story) => (
                  <StoryCard key={story.id} story={story} />
                ))}
              </View>
            ) : (
              <EmptyState
                title="Nothing saved yet"
                message="Tap the bookmark on any story to keep it here."
              />
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function StatTile({ value, label }: { value: string; label: string }) {
  const theme = useTheme();
  return (
    <View style={[styles.tile, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <ThemedText type="title">{value}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  scroll: {
    padding: Spacing.four,
    gap: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.five,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: Fonts.display,
    fontSize: 28,
  },
  headerText: {
    flex: 1,
    gap: Spacing.half,
  },
  // Pinned to the top of the row rather than centered on the avatar, so it
  // reads as a corner control instead of a third item in the identity block.
  settings: {
    alignSelf: 'flex-start',
    paddingTop: Spacing.one,
  },
  settingsPressed: {
    opacity: 0.6,
  },
  stats: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  tile: {
    flex: 1,
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.three,
    gap: Spacing.half,
  },
  section: {
    gap: Spacing.three,
  },
  savedList: {
    gap: Spacing.three,
  },
});
