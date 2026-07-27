import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { CategoryPill } from '@/components/category-pill';
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
          <CategoryPill category={story.category} />

          <ThemedText type="defaultSemiBold" style={styles.title} numberOfLines={3}>
            {story.title}
          </ThemedText>

          <ThemedText type="small" themeColor="textSecondary" numberOfLines={2}>
            {story.summary}
          </ThemedText>

          <View style={styles.meta}>
            <ThemedText type="small" themeColor="textMuted" numberOfLines={1} style={styles.source}>
              {story.source_name}
            </ThemedText>
            <ThemedText type="small" themeColor="textMuted">
              {formatRelative(story.published_at)}
            </ThemedText>
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
  title: {
    fontSize: 18,
    lineHeight: 24,
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
