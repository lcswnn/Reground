/**
 * The appearance switch, top-right on every screen.
 *
 * The second of the two controls that sit outside the session — see
 * `back-button.tsx`, which sits opposite it and is drawn to match. Both are
 * small, muted and unchromed, because neither is a step in the session and
 * neither should ever compete with what the screen is actually asking.
 *
 * Two words rather than one, and both always on screen: the current mode is the
 * one drawn in ink and the other is muted. A switch has to say what it will do
 * as well as what it has done, and it has to do that in the corner of a screen
 * someone is reading for the first time — a lone "Dark" would mean "you are in
 * dark" to half of them and "go dark" to the other half.
 *
 * Each word is its own target, so this is idempotent: tapping the mode you are
 * already in does nothing. That is deliberate — the alternative is one target
 * that flips, and a mis-tap on a flip control in an app about not being wound
 * up is a screen that suddenly changes colour under someone's thumb.
 *
 * Nothing here is animated. The palette changes on the next render and that is
 * the whole transition; a cross-fade between two full-screen colours is the
 * kind of flourish this app has one of, and it is spent on the door.
 */

import { Fragment } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { PressableScale } from '@/components/ui/pressable-scale';
import { APPEARANCE } from '@/content/strings';
import { Spacing } from '@/constants/theme';
import { useThemePreference, type ThemePreference } from '@/lib/theme-preference';
import { tickSelection } from '@/session/ui/haptics';

/** Light first, because that is the one the palette was drawn for. */
const MODES: readonly ThemePreference[] = ['light', 'dark'];

export function ThemeToggle() {
  const { preference, setPreference } = useThemePreference();

  return (
    <View style={styles.row}>
      {MODES.map((mode, index) => {
        const active = mode === preference;

        return (
          <Fragment key={mode}>
            {index > 0 ? (
              <ThemedText themeColor="textMuted">
                {APPEARANCE.separator}
              </ThemedText>
            ) : null}

            <PressableScale
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={APPEARANCE.label(mode)}
              depth="text"
              hitSlop={Spacing.two}
              onPress={() => {
                if (active) return;
                tickSelection();
                setPreference(mode);
              }}
              style={({ pressed }) => [styles.option, pressed && styles.pressed]}>
              {/* Ink for the mode in use, muted for the other. The only
                  difference between the two, and enough of one: they are a pair
                  of words a thumb's width apart, so the eye is comparing them
                  rather than reading either on its own. */}
              <ThemedText themeColor={active ? 'text' : 'textMuted'}>
                {APPEARANCE[mode]}
              </ThemedText>
            </PressableScale>
          </Fragment>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    // Pulled back by the last option's own padding, so "Dark" ends on the same
    // right edge as the content below it. The mirror of what the back button
    // does with its left edge, and for the same reason: without it the screen
    // looks like it stops twice.
    marginRight: -Spacing.one,
  },
  // Padded for the thumb rather than for the look. Small targets, so `hitSlop`
  // does the rest of the work above.
  option: {
    paddingHorizontal: Spacing.one,
    paddingVertical: Spacing.one,
  },
  // Shallower than the 0.6 it was, matching the back button opposite it — the
  // press moves now, and these two have to keep feeling like the same control.
  pressed: {
    opacity: 0.75,
  },
});
