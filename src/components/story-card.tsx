import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { CategoryPill } from '@/components/category-pill';
import { MetricTag } from '@/components/metric-tag';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatRelative } from '@/lib/format';
import type { Story } from '@/types/database';

export function StoryCard({ story }: { story: Story }) {
  const theme = useTheme();

  return (
    <Link href={{ pathname: '/story/[id]', params: { id: story.id } }} asChild>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={story.title}
        style={({ pressed }) => [
          styles.card,
          { backgroundColor: theme.surface, borderColor: theme.border },
          pressed && styles.pressed,
        ]}>
        {story.image_url ? (
          <Image
            source={{ uri: story.image_url }}
            style={styles.image}
            contentFit="cover"
            transition={200}
          />
        ) : null}

        <View style={styles.body}>
          <View style={styles.tags}>
            <CategoryPill category={story.category} />
            <MetricTag metricId={story.metric_id} />
          </View>

          <View style={styles.text}>
            <ThemedText type="defaultSemiBold" style={styles.title} numberOfLines={3}>
              {story.title}
            </ThemedText>

            <ThemedText type="small" themeColor="textSecondary" numberOfLines={2}>
              {story.summary}
            </ThemedText>

            <View style={styles.meta}>
              <ThemedText
                type="small"
                themeColor="textMuted"
                numberOfLines={1}
                style={styles.source}>
                {story.source_name}
              </ThemedText>
              <ThemedText type="small" themeColor="textMuted">
                {formatRelative(story.published_at)}
              </ThemedText>
            </View>
          </View>
        </View>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.99 }],
  },
  image: {
    width: '100%',
    height: 160,
  },
  body: {
    padding: Spacing.three,
    gap: Spacing.two,
  },
  // Wraps rather than truncating: on a narrow screen a long category and a long
  // metric label together overflow the row, and dropping to a second line reads
  // better than an ellipsis on either.
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: Spacing.one,
  },
  // The category pill carries 8pt of its own padding, so its label sits 8pt in
  // from its box. Indenting the copy by the same 8 puts every line of text on
  // one left edge with that label, and lets the pill's rounded box sit slightly
  // proud of the column rather than looking like the text has slipped left.
  text: {
    paddingLeft: Spacing.two,
    gap: Spacing.two,
  },
  title: {
    fontSize: 20,
    lineHeight: 27,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  source: {
    flexShrink: 1,
  },
});
