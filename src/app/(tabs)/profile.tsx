import { useQueries } from '@tanstack/react-query';
import { Alert, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { StoryCard } from '@/components/story-card';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import { BottomTabInset, Fonts, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { fetchCurrentStreak, fetchSavedStories } from '@/api/stories';
import { queryKeys } from '@/lib/query';
import { useSession } from '@/lib/session';

export default function ProfileScreen() {
  const theme = useTheme();
  const { session, signOut } = useSession();

  const [savedQuery, streakQuery] = useQueries({
    queries: [
      { queryKey: queryKeys.savedStories, queryFn: fetchSavedStories },
      { queryKey: queryKeys.streak, queryFn: fetchCurrentStreak },
    ],
  });

  const saved = savedQuery.data ?? [];
  const streak = streakQuery.data ?? 0;
  const isRefreshing = savedQuery.isRefetching || streakQuery.isRefetching;

  function refreshAll() {
    void savedQuery.refetch();
    void streakQuery.refetch();
  }

  const displayName =
    (session?.user.user_metadata?.display_name as string | undefined) ?? 'Friend';
  const email = session?.user.email ?? '';

  function confirmSignOut() {
    Alert.alert('Sign out?', 'Your streak and saved stories stay on your account.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: () => {
          void signOut();
        },
      },
    ]);
  }

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <SafeAreaView edges={['top']} style={styles.flex}>
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
          </View>

          <View style={styles.stats}>
            <StatTile
              value={streakQuery.isPending ? '—' : String(streak)}
              label={streak === 1 ? 'day streak' : 'day streak'}
            />
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
              <ErrorState error={savedQuery.error} onRetry={refreshAll} />
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

          <View style={styles.actions}>
            <Button title="Sign out" variant="secondary" onPress={confirmSignOut} />
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
  actions: {
    marginTop: Spacing.three,
  },
});
