/**
 * One of the two controls that sit in the same place on every screen — this one
 * top-left, and the appearance switch in `theme-toggle.tsx` opposite it. They
 * share a row, drawn by `SessionScreen`, and are deliberately drawn alike.
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

import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { PressableScale } from '@/components/ui/pressable-scale';
import { BACK } from '@/content/strings';
import { Spacing } from '@/constants/theme';

export function BackButton({ onPress }: { onPress: () => void }) {
  return (
    <View style={styles.row}>
      {/* `text` depth — the deepest of the three. It is a few muted words, and
          the travel that reads as a press on a pill is invisible on these. */}
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={BACK.label}
        onPress={onPress}
        depth="text"
        hitSlop={Spacing.three}
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
        {/* The body tier, not the caption one. These are the only tappable
            words on most screens and they sit muted in a corner the eye is not
            looking at; set as a caption they read as a footnote to hunt for.
            Muted colour is what keeps them quiet — see `theme-toggle.tsx`,
            which is drawn to match this and reads off the same tier. */}
        <ThemedText themeColor="textMuted">
          {BACK.arrow} {BACK.label}
        </ThemedText>
      </PressableScale>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    // Sized to its label rather than stretched, so the pressable is the width of
    // the words and not of the screen. The space below the row, and the switch
    // at the other end of it, belong to `SessionScreen`.
    alignSelf: 'flex-start',
  },
  button: {
    // Pulled back by its own padding so the arrow sits on the same left edge as
    // the copy below it. Without this the button is optically indented and the
    // whole screen looks like it starts twice.
    marginLeft: -Spacing.two,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
  },
  // Shallower than the 0.6 it was: the press is a movement now, and muted text
  // at 60% on a paper background is close to gone.
  pressed: {
    opacity: 0.75,
  },
});
