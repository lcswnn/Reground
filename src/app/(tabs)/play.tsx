import { router, type Href } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * Play — the list of things to do with your hands.
 *
 * A menu with one item in it, which is more structure than one game needs and
 * exactly the structure the second one will. Each entry says what it is and
 * opens a screen of its own; nothing here plays inline, so arriving on this tab
 * never starts anything moving.
 */

interface Game {
  title: string;
  blurb: string;
  /** Typed against the generated route map, so a renamed screen fails to build. */
  href: Href;
}

const GAMES: Game[] = [
  {
    title: 'Bounce',
    blurb: 'One ball, one paddle. Keep it in the air for as long as you like.',
    href: '/game',
  },
];

export default function PlayScreen() {
  const theme = useTheme();

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <SafeAreaView edges={['top']} style={styles.flex}>
        <View style={styles.content}>
          <View style={styles.header}>
            <ThemedText type="title">Play</ThemedText>
            <ThemedText type="small" themeColor="textMuted">
              Nothing to win. That is the point.
            </ThemedText>
          </View>

          <View style={styles.list}>
            {GAMES.map((game) => (
              <View
                key={game.title}
                style={[
                  styles.card,
                  { backgroundColor: theme.surface, borderColor: theme.border },
                ]}
              >
                <View style={styles.cardText}>
                  <ThemedText type="smallBold">{game.title}</ThemedText>
                  <ThemedText type="small" themeColor="textMuted">
                    {game.blurb}
                  </ThemedText>
                </View>

                <Pressable
                  onPress={() => router.push(game.href)}
                  accessibilityRole="button"
                  accessibilityLabel={`Play ${game.title}`}
                  style={({ pressed }) => [
                    styles.play,
                    { backgroundColor: theme.brand },
                    pressed && styles.playPressed,
                  ]}
                >
                  <ThemedText type="smallBold" style={{ color: theme.textOnBrand }}>
                    Play
                  </ThemedText>
                </Pressable>
              </View>
            ))}
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  content: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.four,
  },
  header: {
    gap: Spacing.one,
    paddingTop: Spacing.four,
    paddingBottom: Spacing.four,
  },
  list: { gap: Spacing.three },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.four,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  // Takes the slack so the button keeps its own width rather than being
  // squeezed by a long blurb.
  cardText: { flex: 1, gap: Spacing.half },
  play: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.four,
    borderRadius: Radius.lg,
  },
  playPressed: { opacity: 0.75 },
});
