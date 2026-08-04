/**
 * The one control that sits in the same place on every screen.
 *
 * Quiet on purpose — muted, small, and no chrome around it. It is a way out of
 * a mis-tap, not a step in the session, and it should never compete with the
 * thing the screen is actually asking. That is also why it carries a word as
 * well as the arrow: an arrow alone on a screen with a mood scale on it reads
 * as another control to work out.
 *
 * The glyph is a text arrow rather than an icon, for the same reason the
 * calibration screen's trend arrows are — there is no icon set in this app, and
 * one character in the app's own face beats a second font file.
 */

import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { BACK } from '@/content/strings';
import { Spacing } from '@/constants/theme';

export function BackButton({ onPress }: { onPress: () => void }) {
  return (
    <View style={styles.row}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={BACK.label}
        onPress={onPress}
        hitSlop={Spacing.three}
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
        <ThemedText type="small" themeColor="textMuted">
          {BACK.arrow} {BACK.label}
        </ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    // Left-aligned in the column rather than stretched across it, so the
    // pressable is the size of its label and not the width of the screen.
    alignSelf: 'flex-start',
    marginBottom: Spacing.three,
  },
  button: {
    // Pulled back by its own padding so the arrow sits on the same left edge as
    // the copy below it. Without this the button is optically indented and the
    // whole screen looks like it starts twice.
    marginLeft: -Spacing.two,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
  },
  pressed: {
    opacity: 0.6,
  },
});
