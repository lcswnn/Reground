/**
 * Screen 0 — the door.
 *
 * Numbered 0 because it was put in front of a flow that was already numbered,
 * and moving every comment down one would cost more than it explains. Screen 1
 * is still the question that starts the session; this one starts nothing.
 *
 * One line, and nothing to press. It used to be a line and a large circular
 * button whose label said what the user was doing ("I'm feeling a bit anxious
 * right now") — a tap that cost nothing and decided nothing, which is exactly
 * why it went: a decision-free tap is still a thing asked of someone who opened
 * this app wound up. The line now asks for the one thing that is worth doing
 * before the first question, and the screen waits while they do it.
 *
 * That makes it the only screen in the session that moves on its own without
 * the user having agreed to it first — the breath in `breathe.tsx` runs on a
 * clock too, but `breathe-intro.tsx` exists precisely so that someone taps
 * Start before it does. The difference is length: five seconds of one sentence
 * is a beat, and a beat does not need a front door of its own.
 *
 * ## The line is solid, and used to be typed
 *
 * It wrote itself out a character at a time, with every glyph its own `Text` and
 * its own slice of one shared clock. The argument for it was that a sentence
 * arriving at reading speed sets the pace of the breath it asks for. In practice
 * it was the only moving thing on a screen whose whole point is that nothing is
 * being asked of you yet, and a sentence still assembling itself is one you are
 * waiting on rather than reading. It is now simply there, in the same quiet
 * italic the last screen signs off with — see `StageDirection`, which the two
 * ends of the session share so they stay the same weight as each other.
 *
 * What is left of the animation is a fade up and a fade out, and neither is the
 * line being written: they are it being turned on and off. The time the typing
 * used to take went into `holdMs`, so the screen lasts about as long as it
 * always did.
 *
 * None of it starts until the splash begins to go. This screen is mounted behind
 * it — the root renders as soon as the fonts are ready, which is sooner — so the
 * fade is held back by whatever the splash has left to run. See
 * `splashHoldsForMs`, and note that the navigation timer carries the same delay:
 * the two are one schedule, and a screen that left before its own line had
 * finished would be worse than one that started late.
 *
 * No session state is touched here. Someone who opens the app and puts it down
 * has done nothing that needs clearing.
 *
 * One of the two screens with no back button, the other being `closed.tsx`.
 * Nothing has happened yet, so there is nothing behind this to return to — see
 * `previousRoute`, which is where that decision is written down, and note that
 * `/category` is now in the same position for a different reason: a back button
 * pointing here would land on a screen that immediately walks forward again.
 */

import { useRouter } from "expo-router";
import { useEffect } from "react";
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import { WELCOME_BREATH, WELCOME_BREATH_MS } from "@/config/session";
import { WELCOME } from "@/content/strings";
import { splashHoldsForMs } from "@/lib/splash";
import { SessionScreen } from "@/session/ui/session-screen";
import { StageDirection } from "@/session/ui/stage-direction";

export default function WelcomeScreen() {
  const router = useRouter();
  const reducedMotion = useReducedMotion();

  /**
   * Starts up under reduced motion: the line is simply there, and the screen is
   * a sentence and a wait. Nothing below writes to it in that case.
   */
  const opacity = useSharedValue(reducedMotion ? 1 : 0);

  useEffect(() => {
    /**
     * This screen mounts the moment the fonts are ready, which is before the
     * splash comes off — so without this the line would fade up underneath an
     * opaque splash and be revealed already at full strength.
     *
     * It waits for the splash to *start* going, not to have finished: the same
     * instant `_layout.tsx` calls `hideAsync`, so the line's fade and the
     * splash's overlap and the line rises through it. Waiting for the far side
     * of that fade, plus the settling beat that used to follow it, put 550ms of
     * empty screen in front of the first thing the app says.
     *
     * Measured here rather than passed in, because "now" at first mount is the
     * instant that hide timer is set. See `splashHoldsForMs`.
     */
    const leadMs = splashHoldsForMs();

    if (!reducedMotion) {
      // One sequence rather than two assignments: the second would land on the
      // same shared value in the same frame and simply replace the first.
      opacity.value = withDelay(
        leadMs,
        withSequence(
          withTiming(1, {
            duration: WELCOME_BREATH.fadeInMs,
            easing: Easing.out(Easing.quad),
          }),
          withDelay(
            WELCOME_BREATH.holdMs,
            withTiming(0, {
              duration: WELCOME_BREATH.fadeOutMs,
              easing: Easing.in(Easing.quad),
            }),
          ),
        ),
      );
    }

    /**
     * The move is a timer rather than the fade's completion callback, so that
     * the screen takes the same time either way — under reduced motion there is
     * nothing animating to finish, and a version of this screen that flashed
     * past in a frame would be worse than one that never existed.
     *
     * It carries the same lead as the animation. Leaving it out would spend the
     * splash's remaining time out of this screen's budget, and the line would be
     * cut off by a navigation that had started counting first.
     */
    const timer = setTimeout(
      () => router.replace("/category"),
      leadMs + WELCOME_BREATH_MS,
    );
    return () => clearTimeout(timer);
  }, [opacity, reducedMotion, router]);

  const lineStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <SessionScreen centered>
      <Animated.View style={lineStyle}>
        <StageDirection>{WELCOME.line}</StageDirection>
      </Animated.View>
    </SessionScreen>
  );
}
