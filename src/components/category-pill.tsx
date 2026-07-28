import { StyleSheet, Text, View } from 'react-native';

import { CATEGORIES } from '@/constants/categories';
import { Fonts, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { StoryCategory } from '@/types/database';

export function CategoryPill({ category }: { category: StoryCategory }) {
  const theme = useTheme();
  const meta = CATEGORIES[category];

  // Unknown categories can arrive from the database if the enum grows before the
  // app updates — render the raw value rather than crashing on undefined.
  const label = meta?.label ?? category;
  const emoji = meta?.emoji ?? '✨';

  return (
    <View style={[styles.pill, { backgroundColor: theme.brandSoft }]}>
      <Text style={styles.emoji}>{emoji}</Text>
      <Text style={[styles.label, { color: theme.brandStrong }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    borderRadius: Radius.pill,
  },
  emoji: {
    fontSize: 11,
  },
  label: {
    fontFamily: Fonts.body,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
});
