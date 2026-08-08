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
 * The line writes itself out rather than appearing whole, which is the only
 * moving thing on the screen and is doing a job: a sentence that arrives at
 * reading speed sets the pace of the breath it is asking for, where a sentence
 * that is simply there is read in half a second and then stared at. See
 * `CHARACTERS` below for how it is drawn, and `WELCOME_BREATH` for the timings.
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
import { StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";

import { ThemedText } from "@/components/themed-text";
import { WELCOME_BREATH, welcomeBreathMs } from "@/config/session";
import { WELCOME } from "@/content/strings";
import { SessionScreen } from "@/session/ui/session-screen";

/**
 * The line, split into words and then into characters.
 *
 * Every character is its own `Text` and every one of them is laid out from the
 * first frame — what animates is opacity, not the text. Revealing a growing
 * substring instead would be simpler to write and wrong to look at: the line
 * wraps differently at every length, so the words already on screen would shunt
 * around underneath the one being written.
 *
 * The split is by word rather than straight down the string because a wrapping
 * row of individual characters would break mid-word wherever the edge fell.
 * Each word is an unwrappable row, and the space that follows it rides along
 * inside it as a character of its own — so the gaps are the font's own metric
 * rather than a number picked here to look about right, and so the space takes
 * its turn to appear like everything else.
 *
 * That space is a non-breaking one. An ordinary space alone in a `Text` is
 * whitespace at the end of a line as far as a layout engine is concerned, and
 * the platforms disagree about whether such a thing has any width; U+00A0 is
 * the same glyph with none of that argument attached.
 */
const WORD_SPACE = "\u00A0";

const CHARACTERS = WELCOME.line.split(" ").map((word, index, words) => ({
  word,
  characters: [...word, ...(index < words.length - 1 ? [WORD_SPACE] : [])],
}));

/** Where each word starts in the line, so a character knows its own turn. */
const WORD_OFFSETS = CHARACTERS.reduce<number[]>((offsets, { characters }) => {
  const last = offsets[offsets.length - 1] ?? 0;
  return [...offsets, last + characters.length];
}, [0]);

/** From the first character starting to the last one finishing. */
const WRITING_MS =
  Math.max(0, WELCOME.line.length - 1) * WELCOME_BREATH.charMs + WELCOME_BREATH.charFadeMs;

const TOTAL_MS = welcomeBreathMs(WELCOME.line.length);

export default function WelcomeScreen() {
  const router = useRouter();
  const reducedMotion = useReducedMotion();

  /**
   * Milliseconds into the writing, driven linearly. Every character reads its
   * own opacity off this one value rather than owning a timer, so the whole
   * line is one animation and the stagger is arithmetic.
   *
   * Under reduced motion it starts at the end: the line is simply there, and
   * the screen is a sentence and a wait.
   */
  const written = useSharedValue(reducedMotion ? WRITING_MS : 0);
  const opacity = useSharedValue(1);

  useEffect(() => {
    if (!reducedMotion) {
      // Linear, and the one place in the app where that is the right curve —
      // an eased hand would write the middle of the sentence faster than the
      // ends of it.
      written.value = withTiming(WRITING_MS, {
        duration: WRITING_MS,
        easing: Easing.linear,
      });

      opacity.value = withDelay(
        WRITING_MS + WELCOME_BREATH.holdMs,
        withTiming(0, {
          duration: WELCOME_BREATH.fadeOutMs,
          easing: Easing.in(Easing.quad),
        }),
      );
    }

    /**
     * The move is a timer rather than the fade's completion callback, so that
     * the screen takes the same time either way — under reduced motion there is
     * nothing animating to finish, and a version of this screen that flashed
     * past in a frame would be worse than one that never existed.
     */
    const timer = setTimeout(() => router.replace("/category"), TOTAL_MS);
    return () => clearTimeout(timer);
  }, [opacity, reducedMotion, router, written]);

  const screenStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <SessionScreen centered>
      <Animated.View style={[styles.line, screenStyle]}>
        {CHARACTERS.map(({ word, characters }, wordIndex) => (
          <View key={`${word}-${wordIndex}`} style={styles.word}>
            {characters.map((character, index) => (
              <Character
                key={index}
                character={character}
                position={WORD_OFFSETS[wordIndex] + index}
                written={written}
              />
            ))}
          </View>
        ))}
      </Animated.View>
    </SessionScreen>
  );
}

interface CharacterProps {
  character: string;
  /** Its place in the line, which is the only thing setting its turn. */
  position: number;
  written: SharedValue<number>;
}

/**
 * One character, fading in when the writing reaches it.
 *
 * The opacity is on a wrapping view rather than on the text itself: animating a
 * `Text` directly would mean `createAnimatedComponent` around `ThemedText`,
 * which does not forward a ref, and nesting one `Text` inside another to get
 * around that changes how the glyph is laid out on iOS. A view is neither.
 */
function Character({ character, position, written }: CharacterProps) {
  const style = useAnimatedStyle(() => {
    const start = position * WELCOME_BREATH.charMs;

    return {
      opacity: interpolate(
        written.value,
        [start, start + WELCOME_BREATH.charFadeMs],
        [0, 1],
        Extrapolation.CLAMP,
      ),
    };
  });

  return (
    <Animated.View style={style}>
      {/* `subtitle`, two steps down from where this screen started. Small
          enough that the sentence sits on one line on a phone, which is worth
          more here than the size is: a line that wraps is a line whose second
          half is written into empty space below the first, and the eye has to
          go looking for where it went. */}
      <ThemedText type="subtitle">{character}</ThemedText>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  // The words, wrapping as a paragraph would. Centred on both axes so the
  // block sits where a single centred line used to.
  line: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    alignItems: "center",
  },
  // One word, which never breaks.
  word: {
    flexDirection: "row",
  },
});
