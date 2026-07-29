import { SymbolView } from 'expo-symbols';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * Sized to sit with the count rather than to match the tab bar's 24pt glyphs —
 * this one is inline with text, not a target of its own.
 */
const FLAME_SIZE = 17;

/**
 * The streak counter, as a pill beside the day's card.
 *
 * Two states, and the difference between them is the whole point. With a streak
 * running it is a number in the brand colour; with none it is a quiet invitation
 * rather than a zero. "0 days" is a scoreboard telling somebody they have
 * nothing, which is not what gets them back tomorrow.
 */
export function StreakPill({ streak, longest }: { streak: number; longest: number }) {
  const theme = useTheme();

  if (streak === 0) {
    return (
      <View style={[styles.pill, { backgroundColor: theme.backgroundElement }]}>
        {/* The hollow flame, not the filled one — an unlit streak, which is the
            same distinction the tab bar draws between a selected tab and the
            rest. */}
        <Flame color={theme.textMuted} lit={false} />
        <ThemedText type="small" themeColor="textMuted" style={styles.label}>
          {/* A previous best is the one honest thing to say to somebody who has
              lapsed: it was real, and it is the number to beat. */}
          {longest > 1 ? `Best: ${longest} days` : 'Start a streak'}
        </ThemedText>
      </View>
    );
  }

  return (
    <View
      style={[styles.pill, { backgroundColor: theme.brandSoft }]}
      accessible
      accessibilityLabel={`${streak} day streak${longest > streak ? `, best ${longest}` : ''}`}>
      <Flame color={theme.brandStrong} lit />
      <ThemedText type="small" style={[styles.count, { color: theme.brandStrong }]}>
        {streak}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary" style={styles.label}>
        {streak === 1 ? 'day' : 'days'}
      </ThemedText>
    </View>
  );
}

/**
 * The flame, as a vector glyph rather than an emoji.
 *
 * An emoji would render as Apple's or Google's artwork — glossy, multicolour,
 * and unable to take the brand tint — which is exactly the mismatch the tab bar
 * avoids by using SF Symbols. This is the same mechanism: one flat path, tinted
 * from the palette, so it sits in the pill as a piece of the design rather than
 * as a picture pasted into it.
 */
function Flame({ color, lit }: { color: string; lit: boolean }) {
  return (
    <SymbolView
      name={lit ? 'flame.fill' : 'flame'}
      size={FLAME_SIZE}
      tintColor={color}
      // Android and web have no SF Symbols. The count beside it already says
      // what the pill means, so the fallback only has to hold the space without
      // looking like a broken image.
      fallback={<View style={[styles.flameFallback, { backgroundColor: color }]} />}
    />
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: Radius.pill,
  },
  count: {
    fontSize: 19,
  },
  // A teardrop-ish dot at the glyph's own size, so the pill keeps its shape on
  // platforms without SF Symbols.
  flameFallback: {
    width: FLAME_SIZE - 5,
    height: FLAME_SIZE - 2,
    borderRadius: Radius.pill,
    opacity: 0.7,
  },
  label: {
    fontSize: 15,
  },
});
