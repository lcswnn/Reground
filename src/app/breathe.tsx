/**
 * Screen 1 — the breath. About half a minute of cyclic sighing, and now the
 * first thing the session does. See `breathe-intro.tsx` for why it runs before
 * a single question is asked.
 *
 * Arrived at from `breathe-intro.tsx`, so the animation only ever starts on a
 * tap the user has just made. Nothing here waits for a second confirmation.
 *
 * The skip has to exist, because being held on a screen you want to leave is
 * its own kind of stress. It spent a long time as the quietest thing here — a
 * hairline outline around muted text, at the very bottom of the page — on the
 * argument that it should not be what anyone is looking at.
 *
 * It is filled now, and it sits higher. The argument for whispering it assumed
 * the person reading it was comfortable; the person who actually needs it is
 * one cycle in, cannot settle, and has decided this is not working today.
 * Making them hunt the bottom edge of the screen for a faint outline is the app
 * being precious at the exact moment it should get out of the way.
 *
 * What keeps it from competing with the breath is everything else about it: it
 * is small, it is set in the caption tier, its label stays muted, and the fill
 * is a wash rather than a colour. A grey pill at that size reads as a way out
 * rather than as an action.
 */

import { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { PressableScale } from '@/components/ui/pressable-scale';
import { BREATHING_COPY } from '@/content/strings';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { BreathingGuide } from '@/session/breathing/breathing-guide';
import { SessionScreen } from '@/session/ui/session-screen';
import { useSessionBack } from '@/session/use-session-back';

export default function BreatheScreen() {
  const router = useRouter();
  /**
   * No session guard, for the reason given in `breathe-intro.tsx`: this step
   * runs before there is any session to be missing. The screens after it guard
   * for themselves, and the first of them is where a session actually begins.
   */
  const back = useSessionBack('/breathe');
  const theme = useTheme();

  // Out of the breath and into the questions — what the trouble is, and how bad
  // it is. Both are asked of somebody who has just breathed rather than of
  // somebody who has just opened the app.
  const advance = useCallback(() => router.replace('/category'), [router]);

  return (
    <SessionScreen centered onBack={back}>
      <View style={styles.root}>
        {/* The whole screen. The guide centres the circle in whatever it is
            handed, so handing it everything is what puts the circle on the
            middle of the page — and it pins its own cue to the top. */}
        <BreathingGuide onDone={advance} />

        <View style={styles.exit}>
          {/* `text` depth, not `button` — it is a small pill in a wash, and it
              takes the travel the other quiet controls take rather than the one
              the real buttons take. */}
          <PressableScale
            accessibilityRole="button"
            onPress={advance}
            depth="text"
            style={({ pressed }) => [
              styles.skip,
              { backgroundColor: theme.backgroundSelected },
              // A press steps one wash further rather than dimming the pill —
              // the same pair of tokens every inset control in the app moves
              // between, and it works in both schemes without a second thought.
              pressed && { backgroundColor: theme.brandSoft },
            ]}
            hitSlop={Spacing.three}>
            <ThemedText type="small" themeColor="textMuted">
              {BREATHING_COPY.skip}
            </ThemedText>
          </PressableScale>
        </View>
      </View>
    </SessionScreen>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignSelf: 'stretch',
  },
  // The bottom of the screen, out of the flow.
  //
  // Absolute rather than a third child of the column, and that is what keeps
  // the circle centred: anything with a height under the guide takes that
  // height off the guide's box, and the circle is centred in whatever the guide
  // is given. This way the breath owns the whole page and the way out is drawn
  // on top of it, at the bottom, where it is plainly on the screen rather than
  // hard against the edge of the glass.
  exit: {
    position: 'absolute',
    left: 0,
    right: 0,
    // Up off the bottom edge by the same step the cue is down from the top, so
    // the two sit an equal distance inside the page and the circle between them
    // stays the middle of a symmetrical screen. `SessionScreen`'s own padding
    // and the safe-area inset are underneath this again.
    bottom: Spacing.six,
    alignItems: 'center',
  },
  // Filled rather than outlined. `backgroundSelected` is ink at 9% over paper
  // in light mode and paper at 9% over ink in dark — a light grey either way,
  // one step up from the softest wash in the palette, which is what makes it
  // visible on a screen with a glowing circle on it.
  //
  // No border with it: an outline around a fill is two ways of saying the same
  // edge, and the fill is the one that survives being glanced at.
  skip: {
    alignSelf: 'center',
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.four,
    borderRadius: Radius.pill,
  },
});
