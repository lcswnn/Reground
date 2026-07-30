import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useEffect } from 'react';
import { Platform, Pressable, ScrollView, Share, StyleSheet, View } from 'react-native';

import { CategoryPill } from '@/components/category-pill';
import { MetricTag } from '@/components/metric-tag';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  fetchSavedStoryIds,
  fetchStory,
  markStoryRead,
  saveStory,
  unsaveStory,
} from '@/api/stories';
import { formatRelative } from '@/lib/format';
import { queryKeys } from '@/lib/query';
import { useSession } from '@/lib/session';

export default function StoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const { session } = useSession();
  const queryClient = useQueryClient();
  const userId = session?.user.id;

  const storyQuery = useQuery({
    queryKey: queryKeys.story(id),
    queryFn: () => fetchStory(id),
  });

  const savedIdsQuery = useQuery({
    queryKey: queryKeys.savedStoryIds,
    queryFn: fetchSavedStoryIds,
  });

  const story = storyQuery.data ?? null;
  const isSaved = savedIdsQuery.data?.has(id) ?? false;

  const toggleSave = useMutation({
    mutationFn: async (next: boolean) => {
      if (!userId) throw new Error('Not signed in');
      if (next) await saveStory(userId, id);
      else await unsaveStory(userId, id);
    },
    // Optimistic: flip the cached set immediately, roll back if the write fails.
    onMutate: async (next) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.savedStoryIds });
      const previous = queryClient.getQueryData<Set<string>>(queryKeys.savedStoryIds);

      queryClient.setQueryData<Set<string>>(queryKeys.savedStoryIds, (current) => {
        const updated = new Set(current ?? []);
        if (next) updated.add(id);
        else updated.delete(id);
        return updated;
      });

      return { previous };
    },
    onError: (_error, _next, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.savedStoryIds, context.previous);
      }
    },
    onSettled: () => {
      // The Profile tab renders full story rows, not just ids.
      void queryClient.invalidateQueries({ queryKey: queryKeys.savedStories });
    },
  });

  // Fire-and-forget: a failed read log should never block reading the story.
  useEffect(() => {
    if (!story || !userId) return;
    markStoryRead(userId, story.id)
      .then(() => queryClient.invalidateQueries({ queryKey: queryKeys.streak }))
      .catch(() => {});
  }, [story, userId, queryClient]);

  if (storyQuery.isPending) return <LoadingState />;
  if (storyQuery.error) {
    return <ErrorState error={storyQuery.error} onRetry={() => void storyQuery.refetch()} />;
  }
  if (!story) {
    return <EmptyState title="Story not found" message="It may have been removed." />;
  }

  return (
    <ScrollView
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}>
      {story.image_url ? (
        <Image
          source={{ uri: story.image_url }}
          style={styles.image}
          contentFit="cover"
          transition={250}
        />
      ) : null}

      <View style={styles.body}>
        <View style={styles.metaRow}>
          <CategoryPill category={story.category} />
          <ThemedText type="small" themeColor="textMuted">
            {formatRelative(story.published_at)}
          </ThemedText>
        </View>

        <ThemedText type="title">{story.title}</ThemedText>

        <ThemedText type="default" themeColor="textSecondary" style={styles.summary}>
          {story.summary}
        </ThemedText>

        {story.body ? <ThemedText type="default">{story.body}</ThemedText> : null}

        {/* Above the source card on purpose: "this counts toward child
            mortality" is the reason the story is in this app at all, and it
            belongs with the story rather than with its attribution. */}
        <MetricTag metricId={story.metric_id} variant="full" />

        <View style={[styles.sourceCard, { backgroundColor: theme.backgroundElement }]}>
          <ThemedText type="eyebrow" themeColor="textMuted">
            Source
          </ThemedText>
          <ThemedText type="defaultSemiBold">{story.source_name}</ThemedText>
          <Pressable
            accessibilityRole="link"
            onPress={() => void WebBrowser.openBrowserAsync(story.source_url)}
            hitSlop={6}>
            <ThemedText type="linkPrimary" numberOfLines={1}>
              {story.source_url}
            </ThemedText>
          </Pressable>
        </View>

        <View style={styles.actions}>
          <Button
            title="Read Article"
            onPress={() => void WebBrowser.openBrowserAsync(story.source_url)}
          />
          <View style={styles.actionRow}>
            <View style={styles.actionItem}>
              <Button
                title={isSaved ? 'Saved' : 'Save'}
                variant={isSaved ? 'positive' : 'secondary'}
                onPress={() => toggleSave.mutate(!isSaved)}
                disabled={toggleSave.isPending || savedIdsQuery.isPending}
              />
            </View>
            <View style={styles.actionItem}>
              <Button
                title="Share"
                variant="secondary"
                onPress={() => {
                  // Android ignores `url` entirely, so the link has to ride
                  // along in `message`; iOS treats a bare `url` as a real link
                  // (rich previews, "Copy Link", Safari/Reading List targets),
                  // which putting it in `message` would downgrade to plain text.
                  void Share.share(
                    Platform.OS === 'ios'
                      ? { url: story.source_url, title: story.title }
                      : { message: `${story.title} — ${story.source_url}` },
                  );
                }}
              />
            </View>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: Spacing.six,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  image: {
    width: '100%',
    height: 240,
  },
  body: {
    padding: Spacing.four,
    gap: Spacing.three,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  summary: {
    fontSize: 20,
    lineHeight: 29,
  },
  sourceCard: {
    borderRadius: Radius.md,
    padding: Spacing.three,
    gap: Spacing.one,
    marginTop: Spacing.two,
  },
  actions: {
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  actionRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  actionItem: {
    flex: 1,
  },
});
