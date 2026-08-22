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
 * ## There is no drawing here any more
 *
 * There used to be one: Tully, asleep, over the line. It earned its place by
 * doing what the sentence does in a register the sentence cannot reach — the
 * line tells the user to put the phone down and the character was already
 * doing it — and this was the only screen in the app with nothing to do on it,
 * so a picture here competed with nothing.
 *
 * Tully has been taken out of the app entirely, so the argument no longer has
 * anything to attach to. It is recorded because the screen reads differently
 * without it and the difference is not an oversight: the sign-off now carries
 * the whole of the ending on its own, which is what the stage-direction voice
 * was written for in the first place. If a drawing ever comes back to this
 * screen, the case above is the case for it — it has to be doing something the
 * line cannot, not filling the space the line is sitting in.
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
 * Tapping it leaves the app and coming back returns to this screen, which is
 * the right outcome: someone who went to the tip jar was finishing, not
 * restarting, and booting them to the door for it would be a punishment for
 * having read the one line on the screen that asks for something.
 *
 * The one screen that keeps its wall now that every other screen has a back
 * button. Going back would mean re-entering a session that no longer exists —
 * and a dead end with a way out of it is not a dead end. See `previousRoute`.
 *
 * ## What starts the next session
 *
 * A cold launch, and only a cold launch.
 *
 * This screen used to listen on `AppState` and route to the door whenever the
 * app came back to the foreground, so that a backgrounded process returning
 * days later did not land on a wall. That traded one problem for a worse one:
 * every trip out of the app and back — a notification, a glance at the clock,
 * the tip jar — threw away the screen the user was on and replayed the launch
 * at them. Backgrounding is not finishing, and the app was treating it as if it
 * were.
 *
 * So the rule is now the plain one: leaving the app changes nothing, and the
 * session restarts when the process actually dies. That needs no code, which is
 * why there is none here — the session lives in React state, so a cold start
 * has an empty one and the router opens on `/` by itself.
 *
 * The cost is the wall this was written to avoid: a user who finishes, swipes
 * away without killing the app, and opens it a week later on a process iOS
 * never reclaimed sees "You may now close the app" and has to force-quit to get
 * a session. That is the accepted trade — see the note in git for the
 * time-based version if the wall ever turns out to matter more than the
 * interruption did.
 */

import { Linking, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { PressableScale } from '@/components/ui/pressable-scale';
import { CLOSED } from '@/content/strings';
import { Spacing } from '@/constants/theme';
import { SessionScreen } from '@/session/ui/session-screen';
import { StageDirection } from '@/session/ui/stage-direction';

/**
 * Half the chrome row, which is what `centered` has already cost this screen.
 *
 * `SessionScreen` centres its children in the space *under* the chrome, not on
 * the page — so a row of height H leaves the content sitting H/2 low. On every
 * other screen that is invisible, because there is a heading or a question
 * anchoring the top of the column. Here there is nothing but a line and the
 * offer under it, and 25 points of drift is the whole difference between
 * "centred" and "slightly sunk".
 *
 * The row on this screen is only the two round controls — no back button, and
 * `stageOf('/closed')` is null so there are no progress marks either. So its
 * height is the 34-point circle (`BUTTON` in `theme-toggle.tsx`) plus the gap
 * the frame puts under the row.
 */
const CHROME_HALF = (34 + Spacing.three) / 2;

/**
 * How far above true centre the block then sits, once it is actually centred.
 *
 * Zero, now that there is no drawing. This was `Spacing.four` and the reason was
 * entirely the picture: a 140-point drawing over three short lines is top-heavy,
 * so the block's bounding box centred it lower than it looked, and a step up put
 * the sentence nearer where the eye already was. With the drawing gone the block
 * is a line and a two-line offer under it — if anything bottom-heavy — and the
 * same step up would now lift a light block visibly above centre, which is the
 * opposite of the correction.
 *
 * Kept as a named zero rather than deleted, because the geometric correction
 * below it is real on every device and this is the knob for the optical one on
 * top. If the screen reads low again, this is the number to move.
 */
const LIFT = 0;

export default function ClosedScreen() {
  const insets = useSafeAreaInsets();

  /**
   * The frame's padding is not symmetrical — `paddingTop` is `insets.top` and
   * `paddingBottom` is `insets.bottom`, and on a notched phone the top inset is
   * the larger of the two by some 25 points. That tilts the centring box down
   * the page by half the difference on top of the chrome, and it is a different
   * amount on every device, so it is read at runtime rather than guessed at.
   *
   * A transform rather than margin or padding: the correction is optical and
   * should not change what the block's own layout is, and translating is exact
   * where a margin on a centred child would only move it half as far.
   */
  const lift = CHROME_HALF + (insets.top - insets.bottom) / 2 + LIFT;

  return (
    <SessionScreen centered>
      <View style={[styles.root, { transform: [{ translateY: -lift }] }]}>
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
  // A block's worth of space below the sign-off. The gap used to be justified
  // against the one above it — drawing and line as one thing, the offer as
  // another — and with the drawing gone it is doing the simpler job of keeping
  // the tip jar from reading as the end of the sentence above it. Inside the
  // offer the two lines take the gap the app gives the lines of one block,
  // because that is what they are — one sentence with the link as its object.
  tip: {
    alignItems: 'center',
    marginTop: Spacing.five,
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
