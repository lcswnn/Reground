/**
 * The clock a somatic movement runs against.
 *
 * ## Why there is a clock at all
 *
 * `breathing-guide.tsx` argues the opposite case and is right about its own
 * screen: it keeps time as a hairline at a third opacity, because "a countdown
 * here would be something to watch instead of the breath". The breath can make
 * that call because the circle *is* the instruction — the screen is already
 * telling you what to do and when, so a number would only be competing with it.
 *
 * Nothing on this screen can do that job. The instruction is a movement of the
 * body, the body is not on screen, and the only question the app can still
 * answer is when to stop. Left to themselves people either give a movement
 * fifteen seconds or keep going well past the point of it, and both are the
 * failure the sources warn about — so the clock is stated plainly rather than
 * hidden. The compromise is where the emphasis sits: the number is large enough
 * to read at a glance from across a room, in the muted colour rather than the
 * ink one, with no ticking, no flashing and nothing that rewards watching it.
 *
 * ## The lead-in, and the 3-2-1
 *
 * Nothing counts for the first `SOMATIC_LEAD_IN_MS`. Two of these ask the user
 * to stand up and one asks them to cross their arms, and a clock that starts on
 * the tap spends its opening seconds being watched by somebody who is still
 * getting into position — which is both a shorter exercise than promised and
 * the wrong first thing to be doing. Same argument as `BREATHING.leadInMs`,
 * with a body in place of a screen transition.
 *
 * The hold is followed by a count, and the count is the half that the user can
 * actually act on. "Get yourself set." says there is a moment to get ready in
 * and says nothing about when it ends — so the movement used to begin at
 * whatever instant that line happened to vanish, which is a start signal you
 * can only recognise after you have missed it. Three digits fix that: the go is
 * the thing after "1", and everybody already knows how to read one.
 *
 * The digits cross-fade into each other and then the clock replaces the last
 * one *without* a fade. That is deliberate and it is the one hard cut in the
 * step: a softened handover at zero would blur the exact moment the whole count
 * exists to mark.
 *
 * ## The steps stay
 *
 * Underneath, quiet. The tutorial screen is where they are read; this is where
 * they are checked. Somebody two steps into "Unclench" who cannot remember
 * whether the shoulders came before the hands should be able to look down, not
 * back.
 *
 * ## Ending
 *
 * The clock reaching zero and the user tapping "That's enough" go to exactly the
 * same place, and that is deliberate — see `use-somatic-flow.ts`. The button is
 * always there and is never dressed as a skip: stopping early because something
 * stopped feeling okay is the fourth of the four rules, not a failure to
 * complete the exercise, and `stopHint` says so in the open at the one moment it
 * applies.
 */

import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { GROUNDING_FADE, SOMATIC, SOMATIC_LEAD_IN_MS } from '@/config/session';
import { formatRemaining, type SomaticMovement } from '@/content/somatic';
import { SOMATIC_COPY } from '@/content/strings';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { tickCountdown, tickSomaticEnd } from '@/session/ui/haptics';
import { SomaticSteps } from '@/session/somatic/somatic-steps';

/**
 * How long a digit takes to trade places with the next one.
 *
 * A third of the second it gets, which is the same share `breathing-guide.tsx`
 * caps its breath cues at and for the same reason: any longer and the digit is
 * still arriving when it is already due to leave, so a count meant to be crisp
 * reads as a smear.
 */
const COUNT_FADE_MS = Math.round(SOMATIC.countMs * 0.34);

interface SomaticTimerProps {
  movement: SomaticMovement;
  /** This run's length — the movement's own, or an extension. See `SOMATIC`. */
  runMs: number;
  /** The clock reached zero. */
  onComplete: () => void;
  /** The user decided it was enough. */
  onStop: () => void;
}

export function SomaticTimer({ movement, runMs, onComplete, onStop }: SomaticTimerProps) {
  const theme = useTheme();
  const reducedMotion = useReducedMotion();

  /** False for the lead-in, when there is nothing to count yet. */
  const [running, setRunning] = useState(false);
  const [remainingMs, setRemainingMs] = useState(runMs);
  /**
   * The 3-2-1, or null for the hold before it starts. Only meaningful while
   * `running` is false — the count is over by the time the clock exists.
   */
  const [count, setCount] = useState<number | null>(null);

  // Held in a ref so the countdown below can stay mounted for the whole run
  // instead of tearing down and restarting every time the parent re-renders.
  // Same reason `breathing-guide.tsx` holds its `onDone`.
  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    // One deadline, fixed at the start, rather than a running total decremented
    // on every tick. A timer that subtracts as it goes accumulates each
    // setTimeout's overshoot, and over two minutes that is a visible amount of
    // missing exercise. This way the display can be late by a frame but the run
    // itself cannot be short.
    const endAt = Date.now() + SOMATIC_LEAD_IN_MS + runMs;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const step = () => {
      const left = endAt - Date.now();

      if (left <= 0) {
        setRemainingMs(0);
        tickSomaticEnd();
        onCompleteRef.current();
        return;
      }

      setRemainingMs(left);

      // Sleep exactly until the displayed second changes rather than for a flat
      // interval. The clock reads `Math.ceil(left / 1000)`, so the next redraw
      // worth making is when `left` next crosses a whole second — scheduling on
      // a bare 1000ms drifts off that boundary and the number visibly stalls for
      // two beats and then skips one.
      timer = setTimeout(step, left % SOMATIC.tickMs || SOMATIC.tickMs);
    };

    /**
     * The count, scheduled off the mount rather than each digit chaining the
     * next one. Three timers instead of three nested ones, for the reason
     * `schedulePoses` gives in `breathing-guide.tsx`: a chain accumulates every
     * timer's overshoot, so "1" would land measurably later than a second after
     * "2" and the count would arrive at the movement behind its own clock. This
     * way each digit's error is its own and never carries.
     */
    const counters = Array.from({ length: SOMATIC.countFrom }, (_, index) => {
      const digit = SOMATIC.countFrom - index;
      return setTimeout(() => {
        setCount(digit);
        tickCountdown();
      }, SOMATIC.setMs + index * SOMATIC.countMs);
    });

    const leadIn = setTimeout(() => {
      setRunning(true);
      step();
    }, SOMATIC_LEAD_IN_MS);

    return () => {
      for (const id of counters) clearTimeout(id);
      clearTimeout(leadIn);
      if (timer) clearTimeout(timer);
    };
  }, [runMs]);

  /**
   * The track, which is the only thing on this screen that moves.
   *
   * It empties rather than filling — the opposite of the breath's, which is
   * measuring a minute that is being spent rather than one that is running out.
   * Delayed by the same lead-in as the clock, so the two agree.
   */
  const progress = useSharedValue(1);
  useEffect(() => {
    progress.value = 1;
    progress.value = withDelay(
      SOMATIC_LEAD_IN_MS,
      withTiming(0, { duration: runMs, easing: Easing.linear }),
    );
  }, [progress, runMs]);

  const progressStyle = useAnimatedStyle(() => ({ transform: [{ scaleX: progress.value }] }));

  return (
    <Animated.View entering={FadeIn.duration(GROUNDING_FADE.inMs)} style={styles.root}>
      <ThemedText type="eyebrow" themeColor="textMuted">
        {movement.title}
      </ThemedText>

      <View style={styles.clockArea}>
        {running ? (
          <>
            <ThemedText
              type="hero"
              themeColor="textMuted"
              style={styles.clock}
              // The digits change once a second and nobody should be told
              // about it. The label is what a screen reader gets instead, on
              // request rather than on every tick.
              accessibilityLiveRegion="none"
              accessibilityLabel={formatRemaining(remainingMs)}>
              {formatRemaining(remainingMs)}
            </ThemedText>

            {/* Skipped entirely under Reduce Motion rather than animated more
                gently: Reanimated resolves `withTiming` instantly under that
                setting, so the bar would sit empty for the whole run and read
                as a timer that had already finished. The clock says the same
                thing without moving. */}
            {reducedMotion ? null : (
              <View style={[styles.track, { backgroundColor: theme.border }]}>
                <Animated.View
                  style={[styles.fill, progressStyle, { backgroundColor: theme.textMuted }]}
                />
              </View>
            )}
          </>
        ) : (
          /* The lead-in: the hold, then the count. Both live in a fixed-height
             slot with their contents absolutely positioned, so an outgoing
             digit sits on top of the incoming one rather than being laid out
             beside it — the same arrangement, and the same reason, as the cue
             slot in `breathing-guide.tsx`. Without it the two would stack for
             the length of the fade and shunt the steps down the screen three
             times in three seconds. */
          <View style={styles.leadSlot}>
            {count === null ? (
              // Says which way this is going, so the wait reads as part of the
              // exercise rather than as the app hesitating.
              <Animated.View
                key="set"
                entering={FadeIn.duration(GROUNDING_FADE.inMs)}
                exiting={FadeOut.duration(COUNT_FADE_MS)}
                style={styles.leadItem}>
                <ThemedText type="subtitle" themeColor="textMuted" style={styles.centred}>
                  {SOMATIC_COPY.leadIn}
                </ThemedText>
              </Animated.View>
            ) : (
              <Animated.View
                // Keyed on the digit: this is a swap of one element for another,
                // which is what gives each number its own fade rather than one
                // element's text changing underneath a single animation.
                key={count}
                entering={FadeIn.duration(COUNT_FADE_MS)}
                exiting={FadeOut.duration(COUNT_FADE_MS)}
                style={styles.leadItem}>
                {/* Ink rather than the muted grey the clock wears. For these
                    three seconds the count is the thing to look at, and when it
                    hands over to the clock the emphasis drops away with it —
                    which is the right way round, because by then the user
                    should be looking at their own body. */}
                <ThemedText
                  type="hero"
                  style={styles.count}
                  accessibilityLabel={SOMATIC_COPY.countLabel(count)}>
                  {count}
                </ThemedText>
              </Animated.View>
            )}
          </View>
        )}
      </View>

      <SomaticSteps steps={movement.steps} quiet />

      <View style={styles.actions}>
        <Button title={SOMATIC_COPY.stop} variant="ghost" onPress={onStop} />
        <ThemedText type="small" themeColor="textMuted" style={styles.hint}>
          {SOMATIC_COPY.stopHint}
        </ThemedText>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    gap: Spacing.four,
  },
  clockArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.four,
    // A floor rather than a fixed height, so the lead-in line and the clock
    // that replaces it do not shunt the steps up and down between them.
    minHeight: 140,
  },
  clock: {
    textAlign: 'center',
    // Fredoka's digits are not fixed-width, and without this the clock visibly
    // breathes as the numbers change under it — which on a screen asking for
    // stillness is the one thing it cannot do.
    fontVariant: ['tabular-nums'],
  },
  // Tall enough for the `hero` digits, which are the tallest thing that lands
  // in here. A floor rather than a fixed height so the hold's line is not
  // clipped if it ever wraps on a narrow phone.
  leadSlot: {
    alignSelf: 'stretch',
    minHeight: 56,
    justifyContent: 'center',
  },
  // Absolute so an outgoing digit sits on top of the incoming one instead of
  // being laid out beside it.
  leadItem: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  centred: {
    textAlign: 'center',
  },
  count: {
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  track: {
    width: 180,
    height: StyleSheet.hairlineWidth * 2,
    opacity: 0.35,
    overflow: 'hidden',
  },
  fill: {
    width: '100%',
    height: '100%',
    transformOrigin: 'left',
  },
  actions: {
    gap: Spacing.two,
  },
  hint: {
    textAlign: 'center',
  },
});
