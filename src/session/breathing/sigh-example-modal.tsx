/**
 * "See example", opened: what a physiological sigh is, and the breath itself
 * running in miniature beside its three steps.
 *
 * ## Why a modal rather than something that opens in place
 *
 * This started as a `Disclosure` under the explanation on `breathe-intro.tsx`,
 * which is how every other optional block in the app is drawn. It is the wrong
 * shape for this one. A disclosure trades height for content — it pushes the
 * Start button down the page while a circle breathes above it — and the intro
 * screen's whole job is to be a still page with one action on it. A panel that
 * covers the screen, is dismissed, and leaves the page exactly as it was costs
 * the layout nothing and reads as what it is: a look at something, not a second
 * section of the screen.
 *
 * It also lets the example stand on its own. The screen's own copy is behind
 * the card while this is up, so the panel says what the technique is, not only
 * what it looks like — see the note on `SIGH_EXAMPLE` about why the steps are
 * written out again rather than deferred to the page underneath.
 *
 * ## A native modal, not a route
 *
 * Every screen in this app navigates with `router.replace` and there is no
 * stack to push onto — see the note in `app/_layout.tsx`. A modal route would
 * have to be added to `previousRoute` in `session/routing.ts` and would put a
 * step into a session flow that deliberately has none. React Native's `Modal`
 * keeps the whole thing local to the screen that offers it: a piece of state,
 * and nothing anywhere else knows it exists.
 *
 * `Modal` renders nothing at all while `visible` is false, which is what stops
 * the miniature's timer chain from running for a screen nobody has asked to
 * see. Mounting is the on switch.
 */

import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { SIGH_EXAMPLE } from '@/content/strings';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useThemePreference } from '@/lib/theme-preference';
import { SighExample } from '@/session/breathing/sigh-example';
import { Rule } from '@/session/ui/rule';
import { ScreenFilm } from '@/session/ui/screen-film';

/**
 * The one colour in the app that is neither the paper nor the ink, and it is
 * not a colour so much as an absence of light.
 *
 * The palette is two hues and everything is a blend along the line between
 * them — see `Colors`. A scrim cannot be: it has to be darker than the page it
 * dims, and in dark mode the page *is* the ink, so ink over ink would dim
 * nothing at all. Black at a low alpha is the same shadow in both schemes, a
 * little deeper on the dark side because there is less contrast there for the
 * card to win back.
 */
const SCRIM_LIGHT = 'rgba(0, 0, 0, 0.42)';
const SCRIM_DARK = 'rgba(0, 0, 0, 0.62)';

/** Wide enough for a step to read as one line or two, narrow enough that the
    card is plainly a card on a tablet rather than a second screen. */
const MAX_WIDTH = 420;

interface SighExampleModalProps {
  visible: boolean;
  onClose: () => void;
}

export function SighExampleModal({ visible, onClose }: SighExampleModalProps) {
  const theme = useTheme();
  const { isDark } = useThemePreference();
  const reducedMotion = useReducedMotion();

  return (
    <Modal
      visible={visible}
      transparent
      // The system setting decides whether the card arrives or appears. Every
      // other animation in the app hands this to Reanimated's
      // `ReduceMotion.System`; `Modal` takes a string, so it is read here.
      animationType={reducedMotion ? 'none' : 'fade'}
      // Android's back gesture and hardware button. Without it the panel is a
      // trap on the one platform whose users never reach for an on-screen
      // close.
      onRequestClose={onClose}
      statusBarTranslucent>
      <View style={styles.root}>
        {/* The dimmed page, and the largest way out of here. Its own element
            rather than a press on the backdrop view, so a tap that lands on the
            card never reaches it. */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={SIGH_EXAMPLE.dismiss}
          onPress={onClose}
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: isDark ? SCRIM_DARK : SCRIM_LIGHT },
          ]}
        />

        <View
          // Everything behind the card is hidden from a screen reader while it
          // is up, which is the difference between a panel and a page with
          // something drawn over it.
          accessibilityViewIsModal
          style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          {/* Scrolls only when it has to — `flexGrow` keeps a short card short.
              At the top of the Dynamic Type range this content is half again as
              tall as it is here, and `maxHeight` below is what stops it growing
              past the window rather than something to clip against. */}
          <ScrollView
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}>
            <View style={styles.heading}>
              <ThemedText type="subtitle">{SIGH_EXAMPLE.title}</ThemedText>
              {/* The same mark that separates the title from its explanation on
                  the screen underneath. It is the app's heading frame, and the
                  card is the one place it would be strange not to appear. */}
              <Rule />
            </View>

            <ThemedText type="small" themeColor="textSecondary">
              {SIGH_EXAMPLE.what}
            </ThemedText>

            <SighExample />
          </ScrollView>

          {/* Outside the scroll, so the way out is on screen from the moment
              the card is, whatever the type size has done to the content.

              `primary`, which is the filled one: ink with paper lettering in
              light mode and the reverse in dark, since `brand` and
              `textOnBrand` swap ends of the ramp with the scheme. It was
              `secondary` — a wash a few points off the card it sits on — on the
              argument that dismissing a panel is not an action worth shouting
              about. On a card floating over a dimmed page it is: this is the
              only control in the modal, everything else is reading, and the
              filled button is what makes the way out findable at a glance
              instead of a shape you have to look for. It stays `regular` size,
              so it is still plainly smaller than Start on the screen behind. */}
          <Button title={SIGH_EXAMPLE.close} onPress={onClose} />
        </View>

        {/* The matte film again, because a native modal is its own window and
            the one drawn in `app/_layout.tsx` does not reach into it. Without
            this the card is the only surface in the app with no grain on it,
            which reads as a different material — the same thing `LaunchVeil`
            exists to avoid at the other end of the session. */}
        <ScreenFilm />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
  },
  card: {
    width: '100%',
    maxWidth: MAX_WIDTH,
    // Room for the scrim to still be visible above and below on a small phone:
    // a card that reaches the edges is a screen, and this is meant to read as
    // something lying on top of the one behind it.
    maxHeight: '86%',
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth * 2,
    padding: Spacing.four,
    gap: Spacing.four,
  },
  content: {
    gap: Spacing.four,
  },
  heading: {
    gap: Spacing.three,
  },
});
