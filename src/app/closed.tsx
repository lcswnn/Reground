/**
 * Screen 9 — the dead end.
 *
 * The session used to loop: "Close" reset the state and dropped the user back
 * on the opening question, which is an invitation to start again. That is the
 * one thing this app should never do. It exists to be finished and left, so the
 * last screen has no button and nowhere to go.
 *
 * Small, muted and italic — as close to a stage direction as type gets. It is
 * not addressing the user so much as getting out of their way. `index.tsx` now
 * opens on the same treatment, so the session is bookended by two lines in the
 * same voice; the styling lives in `StageDirection` so they cannot drift.
 *
 * The session state was already cleared on the way in, so nothing entered is
 * still in memory behind this.
 *
 * ## Tully, asleep, above the line
 *
 * The one drawing on this screen and one of the few in the app — see
 * `SHOW_TULLY` in `breathing-guide.tsx` for the other, which is currently
 * switched off. It is here rather than anywhere else because this is the only
 * screen with nothing to do on it: a picture on a screen that is asking for
 * something competes with the asking, and a picture on a screen that has
 * finished asking is just the last thing you see.
 *
 * Asleep specifically, and that is the whole of why it earns its place. The
 * sentence under it tells the user to put the phone down; a character doing
 * exactly that says the same thing in the register the sentence cannot reach,
 * and nobody has to read it. It is the app going quiet rather than the app
 * waving goodbye.
 *
 * ## The one link
 *
 * There is a tip jar under the line, and it is the only thing in the app that
 * asks the user for anything. It is here rather than anywhere else precisely
 * because this screen is the dead end: the session is over, the state is
 * cleared, nothing is being measured, and there is no next screen for a
 * declined offer to sour. Asking earlier — on the closing screen with the
 * button, say, or anywhere with a rating on it — would make some part of the
 * session read as a lead-in to the ask, which would be true of the whole thing
 * from then on.
 *
 * It stays quiet on purpose: muted, at the caption tier, sized and coloured
 * like an aside rather than like a button. The rule this screen was written
 * under is that it should not want anything from the person reading it, and a
 * tip jar drawn as a call to action is a screen that wants something. This one
 * is a line they can ignore without deciding to.
 *
 * Tapping it leaves the app, which means the listener below sends them to the
 * door on the way back — a fresh session rather than this screen again. That is
 * the right outcome and the same one they would get from any other trip away.
 *
 * The one screen that keeps its wall now that every other screen has a back
 * button. Going back would mean re-entering a session that no longer exists —
 * and a dead end with a way out of it is not a dead end. See `previousRoute`.
 */

import { useEffect } from 'react';
import { AppState, Linking, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { PressableScale } from '@/components/ui/pressable-scale';
import { CLOSED } from '@/content/strings';
import { Spacing } from '@/constants/theme';
import { SessionScreen } from '@/session/ui/session-screen';
import { StageDirection } from '@/session/ui/stage-direction';

/**
 * The drawing, and how big it is allowed to be. See the note at the top of the
 * file for why it is on this screen and no other.
 */
const sleeping = require('../../assets/Sleeping-Tully.png');
const TULLY_SIZE = 140;

export default function ClosedScreen() {
  const router = useRouter();

  /**
   * The one way off this screen, and it is not a tap.
   *
   * A route with no exit is a dead end for the session, which is the point —
   * but it would also be a dead end for the *app*, because iOS keeps a
   * backgrounded app in memory with its route intact. Someone who opens
   * Reground again next week, on a process that never died, would land straight
   * back here and find a wall.
   *
   * So: leaving and coming back is what starts a new session. `change` only
   * fires on a transition, so arriving here does nothing — the app has to have
   * actually gone away first. Remove this and the screen is permanent until the
   * OS kills the process.
   */
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'active') router.replace('/');
    });
    return () => subscription.remove();
  }, [router]);

  return (
    <SessionScreen centered>
      <View style={styles.root}>
        {/* Above the line and in the flow, so the sign-off keeps its place on
            the screen and the drawing sits over it. `contain` rather than a
            fixed height: the asset is square with a lot of air in it, and
            letting it fit the box is what keeps Tully the size they look. */}
        <Image
          source={sleeping}
          style={styles.tully}
          contentFit="contain"
          // Nothing is announced. It is a picture of the thing the sentence
          // under it already says, and a screen reader that stops to describe
          // a sleeping character on the way to "you may now close the app" is
          // reading out the decoration and delaying the point.
          accessible={false}
        />

        <StageDirection>{CLOSED.line}</StageDirection>

        <View style={styles.tip}>
          {/* The caption tier, and the link under it is the same — the two are
              one sentence, and a lead-in set smaller than its own object reads
              as fine print, which is the wrong thing for the half that says the
              app is free. Both sit a step under the sign-off above them, which
              is the line this screen is actually here to deliver. Muted, and in
              the reading cut rather than the semibold one — that difference is
              what leaves the link the louder of the pair without this having to
              be quiet about it.

              Not part of the target. A person tapping the words "free forever"
              should get nothing rather than a browser. */}
          <ThemedText type="small" themeColor="textMuted" style={styles.centred}>
            {CLOSED.tipLead}
          </ThemedText>

          {/* `text` depth, like the other quiet controls in the app — the back
              button, the appearance switch, the disclosure. The rejection is
              swallowed: a device with no browser for this, or a user who
              dismissed the sheet, is not something to interrupt the last screen
              of the session with. */}
          <PressableScale
            accessibilityRole="link"
            accessibilityLabel={CLOSED.tipLabel}
            depth="text"
            hitSlop={Spacing.three}
            onPress={() => void Linking.openURL(CLOSED.tipUrl).catch(() => {})}
            style={({ pressed }) => pressed && styles.pressed}>
            {/* The one thing on this screen drawn to be noticed, and it takes
                three quiet steps to get there rather than one loud one: the
                semibold cut and full ink against the muted reading cut above
                it, plus the underline. Underlined because that is what says
                "tappable" to everybody without a second word of explanation,
                and this screen cannot spare one. It stops short of being a
                button on purpose; see the note at the top of the file.

                `smallBold` rather than the `linkPrimary` tier the calibration
                screen's source links use: that one is body size, and down here
                the offer should sit under the line it is offered beneath rather
                than match it. */}
            <ThemedText type="smallBold" style={styles.underline}>
              {CLOSED.tip}
            </ThemedText>
          </PressableScale>
        </View>
      </View>
    </SessionScreen>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
  },
  // Sized as a square and given a line's worth of air under it — the drawing
  // and the sentence are one object, so they sit at the gap the app puts
  // between the lines of a block rather than between two blocks.
  //
  // 140 points is small enough that the screen is still mostly empty, which is
  // the point of it. A larger Tully turns the last screen of the session into a
  // picture with a caption.
  tully: {
    width: TULLY_SIZE,
    height: TULLY_SIZE,
    marginBottom: Spacing.two,
  },
  // A block's worth of space below the sign-off rather than a line's worth: it
  // and the offer are two separate things, and the gap is what keeps the second
  // from reading as the end of the first sentence. Inside the offer the two
  // lines take the gap the app gives the lines of one block, because that is
  // what they are — one sentence with the link as its object.
  tip: {
    alignItems: 'center',
    marginTop: Spacing.four,
    gap: Spacing.two,
  },
  centred: {
    textAlign: 'center',
  },
  underline: {
    textDecorationLine: 'underline',
  },
  // The same shallow dim the other text controls take.
  pressed: {
    opacity: 0.75,
  },
});
