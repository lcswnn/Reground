/**
 * Screen 0 — the door.
 *
 * Numbered 0 because it was put in front of a flow that was already numbered,
 * and moving every comment down one would cost more than it explains. Screen 1
 * is the breath, which is what the session opens with; this one starts nothing.
 *
 * Three things on it: a sphere that breathes slowly, the line that says what
 * the app is for, and a Begin button. Then it waits.
 *
 * ## It used to leave on its own, and that was the problem
 *
 * The line faded up, held for about two seconds, faded out, and the screen
 * navigated — no button, nothing to press. The argument for it was that a tap
 * which costs nothing and decides nothing is still a thing asked of somebody
 * who opened this app wound up, and that argument was right about the *old*
 * button (a large circular one labelled "I'm feeling a bit anxious right now",
 * which asked the user to describe themselves on the doorstep) and wrong about
 * having any button at all.
 *
 * What a timed door actually does is take the one decision on the screen away
 * from the person it belongs to. Read faster than the hold and you are waiting
 * on an app that will not move; read slower, or look up, or be interrupted —
 * which is the state everybody arriving here is in — and the app has already
 * left without you. It was also the only screen in the session that moved
 * without being told to, which made it the one place the app's own manners did
 * not apply. Everything else waits for a tap. This does now too.
 *
 * ## The sphere
 *
 * A slow swell and settle above the line, wrapped in a glow that breathes with
 * it. Drawn like the breathing circle on Screen 1 — the same halo and core, the
 * same accent —
 * because it is the same object seen from outside: this is what the app is
 * about to ask you to do, moving gently enough that nobody could mistake it for
 * an instruction. It is deliberately slower than any breath the app paces. At
 * the rate of a real inhale it would be a cue nobody has been given yet, and
 * somebody would start breathing to it on the doorstep.
 *
 * The glow is three concentric circles at low alpha rather than a gradient —
 * see `GLOW_RINGS`. Nothing in the tree draws a radial gradient (there is no
 * SVG here, and `expo-linear-gradient` is linear only), and three steps of
 * falloff at these alphas is indistinguishable from a smooth one once the grain
 * is over it. They breathe with the core rather than sitting still behind it,
 * which is the whole point: a static halo is a shape with a shadow, and a halo
 * that swells is something giving off light.
 *
 * ## The line is a different one each time
 *
 * It is picked from a set chosen by the hour — see `WELCOME.lines` and
 * `pickWelcomeLine`, where the reasoning lives. What matters here is only that
 * it is picked once, into state, and never again while the screen is up: a
 * greeting that changed under somebody mid-read would be worse than no greeting
 * at all, and this screen re-renders on every rotation and every window change.
 *
 * ## The line is solid, and used to be typed
 *
 * It wrote itself out a character at a time, with every glyph its own `Text`
 * and its own slice of one shared clock. The argument for it was that a
 * sentence arriving at reading speed sets the pace of the breath it asks for.
 * In practice it was a sentence you were waiting on rather than reading. It is
 * now simply there at the title tier — see `StageDirection`, which the two ends
 * of the session share so they keep one voice.
 *
 * What is left of that animation is a single fade up, and it is not the line
 * being written: it is the screen being turned on. Nothing fades out any more,
 * because nothing leaves until Begin is pressed.
 *
 * None of it starts until the splash has gone. This screen is mounted behind it
 * — the root renders as soon as the fonts are ready, which is sooner — so the
 * fade is held back by whatever the splash has left to run *and* by the fade it
 * runs on the way out. See `splashClearsInMs`.
 *
 * No session state is touched here. Someone who opens the app and puts it down
 * has done nothing that needs clearing.
 *
 * No back button: there is nothing behind the first screen. See `previousRoute`.
 */

import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { StyleSheet, View, useWindowDimensions } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useDerivedValue,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

import { ThemedText } from "@/components/themed-text";
import { Button } from "@/components/ui/button";
import { WELCOME_BREATH } from "@/config/session";
import { pickWelcomeLine, WELCOME } from "@/content/strings";
import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { withAlpha } from "@/lib/color";
import { splashClearsInMs } from "@/lib/splash";
import {
  breathGlowSize,
  BreathGlow,
  GlowStage,
} from "@/session/ui/breath-glow";
import { SessionScreen } from "@/session/ui/session-screen";
import { StageDirection } from "@/session/ui/stage-direction";

/**
 * How far the sphere travels. A narrower band than the breathing circle's,
 * which runs from 0.44 to 1: that one is tracing a breath and has to be
 * unmistakably bigger at the top than at the bottom, while this one is only
 * alive. A sphere that visibly inflates on the doorstep is a demonstration, and
 * this screen is not demonstrating anything yet.
 */
const MIN_SCALE = 0.86;

/**
 * How far the glow reaches past the sphere, as a multiplier on its diameter —
 * see `BreathGlow`, which the breathing circle on screen 1 wears as well.
 *
 * Far, and it can be: this sphere is 132 points at most with a whole page
 * around it, where the circle on the breathing screen nearly fills its own and
 * runs a much tighter reach. Here the glow has room to be the largest thing on
 * the screen without touching anything.
 */
const GLOW_REACH = 2.15;

/**
 * Bounded on both axes, like every other circle in the app: on a short screen a
 * width-derived size would push the line and the button off the bottom. Smaller
 * than Screen 1's circle on purpose — that one is the exercise, this one is a
 * mark above a sentence.
 */
const DIAMETER_RATIO = 0.32;
const DIAMETER_HEIGHT_RATIO = 0.16;
const MAX_DIAMETER = 132;

export default function WelcomeScreen() {
  const router = useRouter();
  const theme = useTheme();
  const reducedMotion = useReducedMotion();
  const { width, height } = useWindowDimensions();
  /**
   * Lazy initial state: one greeting for the life of the screen. Calling the
   * picker in the body would hand the user a different sentence on every render
   * — and this screen re-renders whenever the window does. `close.tsx` holds
   * its parting idea the same way.
   */
  const [line] = useState(pickWelcomeLine);

  const diameter = Math.min(
    width * DIAMETER_RATIO,
    height * DIAMETER_HEIGHT_RATIO,
    MAX_DIAMETER,
  );

  /**
   * Starts up under reduced motion: the screen is simply there. Nothing below
   * writes to it in that case.
   */
  const opacity = useSharedValue(reducedMotion ? 1 : 0);
  /**
   * 0 at the bottom of the sphere's swell, 1 at the top. Parked at the top for
   * anybody who asked the system to stop things moving — a still sphere at full
   * size is a shape, where a still one at 0.86 is a shape that looks like it is
   * waiting to finish.
   */
  const swell = useSharedValue(reducedMotion ? 1 : 0);

  useEffect(() => {
    /**
     * This screen mounts the moment the fonts are ready, which is before the
     * splash comes off — so without this the screen would fade up underneath an
     * opaque splash and be revealed already at full strength.
     *
     * It waits for the splash to have *finished* going: the hold, plus the fade
     * `_layout.tsx` kicks off at the end of it. The two fades used to overlap,
     * so that the line rose through the splash as it cleared, and what that
     * actually looked like was the app talking over itself while still opening.
     *
     * Measured here rather than passed in, because "now" at first mount is the
     * instant that hide timer is set. See `splashClearsInMs`.
     */
    const leadMs = splashClearsInMs();

    if (reducedMotion) return;

    opacity.value = withDelay(
      leadMs,
      withTiming(1, {
        duration: WELCOME_BREATH.fadeInMs,
        easing: Easing.out(Easing.quad),
      }),
    );

    // Reversing rather than looping: a repeat that snaps back to the start
    // would be a breath in with no breath out. `-1` is forever, which is what
    // this screen is now — there is no timer left to outlive.
    swell.value = withDelay(
      leadMs,
      withRepeat(
        withTiming(1, {
          duration: WELCOME_BREATH.pulseMs,
          // Sinusoidal in and out, so there is no moment where it is visibly
          // travelling at a constant speed. Nothing in a body does.
          easing: Easing.inOut(Easing.sin),
        }),
        -1,
        true,
      ),
    );
  }, [opacity, reducedMotion, swell]);

  const screenStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  // The arithmetic is written out inside each worklet rather than shared
  // through a `scale(value)` helper above them. A plain function declared in
  // the component body is a *remote* function to the UI runtime — calling it
  // from a worklet throws "Tried to synchronously call a Remote Function" on
  // the first frame. Constants like `MIN_SCALE` are captured by value and are
  // fine; functions are not, unless they carry their own `'worklet'` directive,
  // and two lines of arithmetic are not worth a third worklet to hold them.
  /**
   * The scale the core is actually drawn at, as its own value.
   *
   * `swell` runs 0 to 1 because that is what a repeating animation is easiest
   * to write against; the circle is drawn from `MIN_SCALE` to 1. The glow needs
   * the second of those — it multiplies the core's scale — so the conversion
   * happens once here rather than being repeated inside every ring's worklet.
   */
  const coreScale = useDerivedValue(
    () => MIN_SCALE + (1 - MIN_SCALE) * swell.value,
  );

  const coreStyle = useAnimatedStyle(() => ({
    transform: [{ scale: coreScale.value }],
  }));
  // Trails the core by a fraction of the distance it has left, the same way the
  // breathing circle's does, so the two are one object rather than a ring
  // around a disc.
  const haloStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: coreScale.value + (1 - coreScale.value) * 0.4 },
    ],
    opacity: 0.1 + swell.value * 0.06,
  }));

  return (
    <SessionScreen>
      {/* No scroll container, on either this screen or the one after it. Both
          are laid out as plain flex columns with the same padding, which is the
          only arrangement that cannot be dragged: a scroll view whose content
          is a hair taller than its frame is genuinely scrollable by a hair, and
          `flexGrow: 1` produces exactly that whenever a float lands a fraction
          over. Measuring and disabling the gesture got most of the way there
          and still left the page able to jiggle.

          What this costs is the safety valve. At the top of the Dynamic Type
          range on a short phone there is no scroll to reach anything that does
          not fit — see the note on `stage`, which is the part that gives. */}

      {/* One fade for the whole door: the sphere, the line and the button come
          up together as the screen arriving, rather than as three things
          announcing themselves in turn. */}
      <Animated.View style={[styles.root, screenStyle]}>
        {/* Takes all the room above the button and centres what is in it, so
            the line still lands near the middle of the screen while the action
            sits at the bottom where the thumb is. */}
        <View style={styles.stage}>
          {/* Sized to the outermost ring rather than to the sphere: the
              glow is drawn at up to `GLOW_REACH` times the diameter and would
              be clipped by a box drawn for the circle alone. */}
          <GlowStage size={breathGlowSize(diameter, GLOW_REACH)}>
            <BreathGlow
              scale={coreScale}
              minScale={MIN_SCALE}
              diameter={diameter}
              reach={GLOW_REACH}
              color={theme.info}
            />

            <Animated.View
              style={[
                styles.circle,
                haloStyle,
                {
                  width: diameter,
                  height: diameter,
                  borderRadius: diameter / 2,
                  backgroundColor: theme.info,
                },
              ]}
            />
            <Animated.View
              style={[
                styles.circle,
                coreStyle,
                {
                  width: diameter,
                  height: diameter,
                  borderRadius: diameter / 2,
                  backgroundColor: withAlpha(theme.info, 0.2),
                  borderColor: theme.info,
                },
              ]}
            />
          </GlowStage>

          {/* The title tier, full ink, and nothing around it — the sphere
              above does the placing that a pair of rules used to. See the note
              in `StageDirection` on why the two ends of the session are drawn
              differently, and why this end lost its frame. */}
          <StageDirection opening>{line}</StageDirection>
        </View>

        {/* `large`, the same size Start takes on the breath's intro. Both are
            the single button on a screen whose only purpose is to start
            something — see `Size` in `button.tsx`. */}
        <View style={styles.action}>
          <Button
            title={WELCOME.begin}
            size="large"
            onPress={() => router.replace("/breathe-intro")}
          />
          {/* Set exactly as the hint under Start on the next screen — small,
              muted, centred — because the two are the same slot: the line under
              the one button on a screen whose only job is to start something.
              Matching them is what keeps the two buttons on the same height, so
              Begin and Start do not jump as the app moves between them.

              It was the eyebrow tier for a moment, which is caps and tracked
              and the nearest thing this app has to a wordmark. That is the same
              13 points and the same leading, so it cost nothing in height — but
              a name set as a label reads as a heading over the empty space
              below it, where this should read as the quiet end of the screen.
              The eyebrow is one word away if the wordmark is wanted back. */}
          <ThemedText type="small" themeColor="textMuted" style={styles.name}>
            {WELCOME.name}
          </ThemedText>
        </View>
      </Animated.View>
    </SessionScreen>
  );
}

const styles = StyleSheet.create({
  // Every number in this block is `breathe-intro.tsx`'s, and has to stay that
  // way: the two screens are the same layout with different things in it, and
  // Begin and Start have to land on the same height. The padding that used to
  // sit on a scroll container lives here now, which is the same distance in the
  // same place with nothing to drag.
  root: {
    flex: 1,
    paddingVertical: Spacing.four,
    // The long pause between the reading and the doing, which is also what
    // lifts the pair above the true centre: the box they are centred in is
    // shorter than the screen by this much, so its middle sits half of it
    // higher. That is the correction the screen wants anyway — a column whose
    // weight is all in its top half, a filled circle over two lines of type,
    // reads as lower than it measures — and it is now the same gap, in the same
    // place, as the one on the screen after this.
    gap: Spacing.six,
  },
  stage: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    // The pause between the thing to look at and the thing to read. The sphere
    // is not an illustration of the sentence and should not sit on top of it
    // like one.
    gap: Spacing.six,
  },
  circle: {
    position: "absolute",
    borderWidth: StyleSheet.hairlineWidth * 3,
    borderColor: "transparent",
  },
  // The bottom padding that used to sit here belongs to `scroll` now, which is
  // where the other screen keeps it. Same distance, one owner.
  action: {
    // The gap the app puts inside an actions block — the same one between Start
    // and the hint under it on the breath's intro.
    gap: Spacing.three,
  },
  name: {
    textAlign: "center",
  },
});
