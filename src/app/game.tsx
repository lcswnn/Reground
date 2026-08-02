import { SymbolView } from 'expo-symbols';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BounceGame } from '@/components/bounce-game';
import { ThemedText } from '@/components/themed-text';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * The game, on its own screen.
 *
 * A stack route rather than the Play tab itself, which is what gets the tab bar
 * out of the way: a board that ends a few points above three glyphs invites a
 * missed paddle to become a mis-tap into another tab. Leaving is the back
 * button and nothing else, and the screen is only ever entered deliberately.
 *
 * Nothing is persisted on the way out. Unmounting is the reset — see
 * `@/components/bounce-game` for why there is no score to carry anyway.
 */

/**
 * How much of the screen the board takes, vertically.
 *
 * Short of full on purpose. A board running the whole height puts the paddle in
 * the same band of glass as the home indicator and leaves the page with no
 * edges, so the game reads as the screen rather than as a thing on it. The
 * leftover space is split evenly above and below, so the board sits centred
 * with the back button floating clear of it.
 */
const BOARD_HEIGHT = '76%';

export default function GameScreen() {
  const theme = useTheme();

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <SafeAreaView edges={['top', 'bottom']} style={styles.flex}>
        <View style={styles.bar}>
          {/* Absolutely centred rather than laid out between the back button
              and nothing, which would park it off to the right of centre. */}
          <View pointerEvents="none" style={styles.titleSlot}>
            <ThemedText type="sectionTitle">Bounce</ThemedText>
          </View>

          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Back to Play"
            hitSlop={12}
            style={({ pressed }) => [styles.back, pressed && styles.pressed]}
          >
            <SymbolView
              name="chevron.left"
              size={13}
              tintColor={theme.textSecondary}
              fallback={<View />}
            />
            <ThemedText type="smallBold" themeColor="textSecondary">
              Back
            </ThemedText>
          </Pressable>
        </View>

        {/* The board is centred in what is left rather than pinned under the
            bar, so shortening it takes space off both ends at once. */}
        <View style={styles.stage}>
          <View style={styles.boardBox}>
            <BounceGame />
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  bar: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
  },
  titleSlot: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  back: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    alignSelf: 'flex-start',
    paddingVertical: Spacing.two,
  },
  pressed: { opacity: 0.6 },
  stage: {
    flex: 1,
    justifyContent: 'center',
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.four,
  },
  boardBox: { height: BOARD_HEIGHT },
});
