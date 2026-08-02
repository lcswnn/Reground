import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BreathingCircle, BREATH_CYCLE_MS } from '@/components/breathing-circle';
import { ThemedText } from '@/components/themed-text';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { MOODS, recordCheckIn, type Mood } from '@/lib/check-in';

/**
 * How many breaths, for the people who get them.
 *
 * Two, which is around twenty-four seconds. One is not long enough to be
 * anything other than a transition with ideas; four is long enough that
 * somebody who answered honestly and now wants the app would start looking for
 * the way out. The skip covers the case where they are looking anyway.
 */
const BREATH_CYCLES = 2;

/**
 * The lowest mood that goes straight through to the app.
 *
 * Only the top of the scale. "Good" still gets the breath — somebody reporting
 * a 4 has not told us they need nothing, and half a minute is a cheap thing to
 * spend on them. "Great" has, and holding that person on a breathing screen
 * teaches them the app is a toll gate.
 */
const MOOD_SKIPS_BREATHING: Mood = 5;

/**
 * How long a stage takes to fade in, and therefore how long the circle waits
 * before it starts breathing.
 *
 * Left running, the first inhale is already a quarter gone by the time the
 * circle is opaque, and the breath you are asked to follow starts mid-way up.
 * One value for both so they cannot drift apart.
 */
const FADE_IN_MS = 600;

/**
 * The two things that happen before the app proper: a question, then — if the
 * answer warrants it — a breath.
 *
 * The order is the point. Asking first means the answer is about the state
 * somebody actually arrived in rather than the state a breathing exercise just
 * put them in, which is the only version of the question worth logging. It also
 * means the breath is a response to an answer instead of a toll: somebody who
 * says they are great is not made to sit through calming down.
 *
 * Rendered as an overlay over the mounted tab navigator rather than as its own
 * route, and that is the load-bearing decision here. The tabs mount, lay out
 * and run their queries underneath while this is happening, so the ritual is
 * also the warm-up — Read is populated by the time anyone reaches it. Routing
 * to a real screen would have serialised the two.
 *
 * Once per cold launch, not once per day and not once ever. The trigger for
 * opening this app is a feeling, so the arrival ritual belongs on arrival; the
 * state lives in the root navigator's `useState`, which is reset by a cold
 * launch and preserved across a backgrounding, which is exactly the line.
 */
export function EntryFlow({ onDone }: { onDone: () => void }) {
  const theme = useTheme();
  const [stage, setStage] = useState<'check-in' | 'breathing'>('check-in');

  /** Held at the bottom of the breath until the fade has finished uncovering it. */
  const [isBreathing, setIsBreathing] = useState(false);

  useEffect(() => {
    if (stage !== 'breathing') return;

    const timeout = setTimeout(() => setIsBreathing(true), FADE_IN_MS);
    return () => clearTimeout(timeout);
  }, [stage]);

  useEffect(() => {
    // Counted from the first inhale rather than from the stage change, so the
    // wait is two whole breaths as seen, not two breaths minus the fade.
    if (!isBreathing) return;

    const timeout = setTimeout(onDone, BREATH_CYCLE_MS * BREATH_CYCLES);
    return () => clearTimeout(timeout);
  }, [isBreathing, onDone]);

  const choose = useCallback(
    (mood: Mood) => {
      // Recorded before the branch, so the log is the same question answered
      // the same way regardless of which of the two things happens next.
      recordCheckIn(mood);
      if (mood >= MOOD_SKIPS_BREATHING) onDone();
      else setStage('breathing');
    },
    [onDone],
  );

  return (
    <Animated.View
      // Fades out as a whole, uncovering the Breathe tab already sitting
      // underneath — which is why there is no transition to build here.
      exiting={FadeOut.duration(420)}
      style={[StyleSheet.absoluteFill, styles.root, { backgroundColor: theme.background }]}
    >
      <SafeAreaView style={styles.flex}>
        {stage === 'breathing' ? (
          <>
            <Pressable
              // The whole screen stays a skip target as well as the button —
              // somebody impatient enough to tap anywhere has told us they
              // want to move on, and making them find the corner first is a
              // worse answer than letting the tap land.
              style={styles.flex}
              onPress={onDone}
              accessibilityRole="button"
              accessibilityLabel="Skip the breathing exercise"
            >
              <Animated.View entering={FadeIn.duration(FADE_IN_MS)} style={styles.center}>
                {/* The cue word lives inside the circle component now, above the
                    circle and driven by the same clock — the two can't drift
                    apart if only one thing is timing them. */}
                <BreathingCircle active={isBreathing} />
              </Animated.View>
            </Pressable>

            {/* Bottom right, muted, and fading in behind the breath rather than
                with it: the way out should be findable without being the first
                thing the eye lands on. */}
            <Animated.View
              entering={FadeIn.duration(600).delay(500)}
              style={styles.skipSlot}
              pointerEvents="box-none"
            >
              <Pressable
                onPress={onDone}
                accessibilityRole="button"
                accessibilityLabel="Skip the breathing exercise"
                hitSlop={Spacing.three}
                style={({ pressed }) => [
                  styles.skip,
                  { borderColor: theme.border },
                  pressed && styles.skipPressed,
                ]}
              >
                <ThemedText type="small" themeColor="textMuted">
                  Skip
                </ThemedText>
              </Pressable>
            </Animated.View>
          </>
        ) : (
          // The first thing seen on a cold launch now, mounting on the same
          // frame the splash starts its cross-fade — so this fade is what
          // carries the arrival, and it is the slower of the two.
          <Animated.View entering={FadeIn.duration(FADE_IN_MS)} style={styles.center}>
            <View style={styles.prompt}>
              <ThemedText type="title" style={styles.centered}>
                How are you right now?
              </ThemedText>
              <ThemedText type="small" themeColor="textMuted" style={styles.centered}>
                No wrong answer. Nobody sees this.
              </ThemedText>
            </View>

            <View style={styles.scale}>
              {MOODS.map((mood) => (
                <Pressable
                  key={mood.value}
                  onPress={() => choose(mood.value)}
                  accessibilityRole="button"
                  accessibilityLabel={`${mood.label}, ${mood.value} out of 5`}
                  style={({ pressed }) => [
                    styles.option,
                    {
                      backgroundColor: theme.backgroundElement,
                      borderColor: theme.border,
                    },
                    pressed && styles.optionPressed,
                  ]}
                >
                  {/* The dot carries the position on the scale so the words do
                      not have to be read in order to answer quickly. */}
                  <View
                    style={[
                      {
                        backgroundColor: theme.info,
                        // Bad to good, low to high. The size ramp is the scale;
                        // colour is deliberately constant, because tinting the
                        // low end red would tell somebody having a hard day
                        // that their answer is the alarming one.
                        width: 10 + mood.value * 3,
                        height: 10 + mood.value * 3,
                        borderRadius: (10 + mood.value * 3) / 2,
                      },
                    ]}
                  />
                  <ThemedText type="small" themeColor="textSecondary">
                    {mood.label}
                  </ThemedText>
                </Pressable>
              ))}
            </View>
          </Animated.View>
        )}
      </SafeAreaView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  // Above the tab bar, which draws at the bottom of the navigator underneath.
  root: { zIndex: 10 },
  flex: { flex: 1 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
    gap: Spacing.five,
  },
  // Overlays the breathing pressable so the circle stays optically centred in
  // the full screen rather than being pushed up by a row beneath it.
  skipSlot: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'flex-end',
    justifyContent: 'flex-end',
    paddingHorizontal: Spacing.four,
    // Lifted well clear of the bottom edge: down in the corner it sits where
    // the home indicator and the thumb already are, which is both hard to read
    // and easy to hit by accident on a screen nobody is meant to be tapping.
    paddingBottom: Spacing.six,
  },
  // Outlined rather than bare text. A word alone in a corner does not read as
  // pressable, and the hairline is enough to say "button" without giving it the
  // weight of a filled one — this is the way out, not the thing to do.
  skip: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.four,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  skipPressed: { opacity: 0.5 },
  centered: { textAlign: 'center' },
  prompt: {
    alignItems: 'center',
    gap: Spacing.two,
    maxWidth: MaxContentWidth,
  },
  scale: {
    width: '100%',
    maxWidth: 420,
    gap: Spacing.two,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.four,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  optionPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.99 }],
  },
});
