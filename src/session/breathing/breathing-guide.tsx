/**
 * Screen 1's animation: cyclic sighing, guided by a shape rather than a clock.
 *
 * The pacing lives in `@/config/session`. The structure is two inhales stacked
 * onto each other, a beat at the top, then a long exhale — the second inhale
 * is short and sharp because it is a top-up rather than a breath of its own,
 * and the exhale runs about twice their combined length because that is the
 * part that actually moves you toward the parasympathetic side.
 *
 * The phase machine runs in JS rather than as a single Reanimated sequence,
 * because the haptics have to be scheduled per phase and a worklet sequence
 * gives no clean hook for that. Each moving phase starts a train of pulses that
 * builds through an inhale and falls away through an exhale — see
 * `breath-pulse.ts` — and the still ones start nothing. The circle itself is
 * still animated on the UI thread; only the four transitions per cycle cross
 * back.
 *
 * This screen used to have a second half: a drawn character, Tully, on the top
 * of it, breathing along with the circle off the same phase machine. They were
 * switched off behind a flag for a long while before being removed outright,
 * and the removal took the pose cycle, the artwork and the split layout with
 * it. What is left is the circle, alone and back at the size it had before any
 * of that arrived — which is why the sizing constants below are one pair rather
 * than the two the split needed.
 *
 * ## Three bands, and only one of them is in the flow
 *
 * The cue is pinned to the top of the screen, the circle sits in the middle,
 * and the way out sits at the bottom — that last one drawn by `breathe.tsx`
 * rather than here. Only the circle and its progress bar are laid out normally;
 * the cue is absolute, because a word above the circle in the flow moves the
 * circle down by the height of a word, and the circle is the thing the eye is
 * supposed to rest on for half a minute.
 *
 * ## The glow
 *
 * The circle sits inside a `BreathGlow` — rings of the accent at low alpha that
 * scale with it, so the breath gives off light as it fills rather than only
 * getting bigger. It is the same component the door's sphere wears, and the
 * pairing is deliberate: that sphere is this circle seen from outside, before
 * anybody has been asked to breathe with it, and the two should be recognisably
 * the same object.
 *
 * `GLOW_REACH` is much tighter here than there, and it has to be. This circle
 * is up to 300 points across and nearly fills the screen it is on, where the
 * door's is 132 with a page around it; the same multiplier would put the
 * outermost ring off both edges of the phone.
 */

import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
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
import { BREATHING, BREATH_CYCLES, BREATH_CYCLE_MS } from '@/config/session';
import { BREATHING_COPY } from '@/content/strings';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { withAlpha } from '@/lib/color';
import {
  breathGlowSize,
  BreathGlow,
  GlowStage,
} from '@/session/ui/breath-glow';
import { type BreathPhase } from '@/session/ui/breath-pulse';
import { pulseBreath } from '@/session/ui/haptics';

type Phase = 'inhale-1' | 'inhale-2' | 'hold' | 'exhale' | 'rest';

/**
 * Not zero, and not near it: an emptied circle reads as "finished" rather than
 * as the bottom of a breath.
 */
const MIN_SCALE = 0.44;
/** Where the first inhale stops, leaving the second one somewhere to go. */
const MID_SCALE = 0.82;

/**
 * How far the glow reaches past the circle, as a multiplier on its diameter.
 *
 * Small, because the circle is not. At the solo size on a narrow phone the
 * stage is already 60% of the shorter side, so every point of reach is spent
 * against a margin that is not there — 1.45 puts the outermost ring inside the
 * screen at every size the circle can take, and the glow's job here is to soften
 * the edge rather than to fill the room. The door's sphere runs 2.15 because it
 * has room to.
 */
const GLOW_REACH = 1.45;

/**
 * The circle owns the screen: one ratio against the shorter side, because there
 * is nothing above it to compete for height with.
 *
 * It briefly took only the bottom half — bounded on width *and* height, at 0.58
 * and a 260 cap — for as long as there was a drawn character sharing the screen
 * with it. That pairing is gone and these are the numbers from before it, which
 * is the right place to land: a circle somebody is asked to watch for half a
 * minute should be the largest thing in front of them.
 */
const DIAMETER_RATIO = 0.6;
const MAX_DIAMETER = 300;

interface Step {
  phase: Phase;
  ms: number;
  scale: number;
  easing: (value: number) => number;
  /**
   * Which way the phase is going, in the hand: a train of pulses that builds
   * through it or falls away through it. `null` for the two still phases, which
   * get nothing — nothing is being asked of anyone during them, and unlike a
   * breathwork hold they are not a step to be told the end of. See
   * `breath-pulse.ts`.
   */
  pulse: BreathPhase | null;
  cue: string | null;
}

const CYCLE: readonly Step[] = [
  {
    phase: 'inhale-1',
    ms: BREATHING.firstInhaleMs,
    scale: MID_SCALE,
    /**
     * Eases in, and then keeps going. It must not coast to a stop, because the
     * phase after it is the top-up and the handover is the whole shape of a sigh.
     *
     * This was `Easing.out(Easing.cubic)`, which had covered 99.2% of its travel
     * by 80% of the phase — the last half-second of the first inhale moved the
     * circle by under a point of scale, so it read as already finished and the
     * second inhale looked like it arrived after a pause. There was never a pause
     * in the machine; the phases are back to back. The stall was the curve.
     *
     * The bezier still starts gently — a breath doesn't jerk into motion — but
     * leaves about 12% of the travel in the final fifth and hands over with real
     * speed on the circle. The top-up now interrupts the first inhale, which is
     * what it is supposed to do.
     */
    // `bezierFn`, not `bezier`: the latter returns a factory, and every other
    // entry in this table is a plain easing function.
    easing: Easing.bezierFn(0.33, 0, 0.55, 0.85),
    pulse: 'inhale',
    cue: BREATHING_COPY.inhale,
  },
  {
    // `in`, not `out`: this one should accelerate into the top so it reads as
    // a snatched breath rather than a second slow one.
    phase: 'inhale-2',
    ms: BREATHING.secondInhaleMs,
    scale: 1,
    easing: Easing.in(Easing.quad),
    // Too short for a train — one firm tap at the top-up, which is what it is.
    pulse: 'inhale',
    cue: BREATHING_COPY.secondInhale,
  },
  {
    // Held at full, and given no word of its own. The circle is visibly still,
    // which says it — and a "hold" cue at the top of a full breath is one more
    // instruction to read at the moment there is least room for one.
    phase: 'hold',
    ms: BREATHING.holdMs,
    scale: 1,
    easing: Easing.linear,
    pulse: null,
    cue: null,
  },
  {
    phase: 'exhale',
    ms: BREATHING.exhaleMs,
    scale: MIN_SCALE,
    easing: Easing.inOut(Easing.quad),
    pulse: 'exhale',
    cue: BREATHING_COPY.exhale,
  },
  {
    phase: 'rest',
    ms: BREATHING.restMs,
    scale: MIN_SCALE,
    easing: Easing.linear,
    pulse: null,
    cue: null,
  },
];

/**
 * How long a cue takes to trade places with the next one, at most.
 *
 * At most, because 600ms is longer than the second inhale is allowed to be
 * interesting for. "In again" fades in over the same 600ms it used to take on
 * every other cue, inside a phase that only lasts `secondInhaleMs` — so the word
 * for the fastest movement in the breath was still arriving when the movement
 * was over, and the top-up read as late for the same reason the circle did.
 *
 * `cueFadeFor` caps it against the phase the cue belongs to. Long phases are
 * untouched; only the top-up is short enough for the cap to bite.
 */
const CUE_FADE_MS = 600;

/**
 * No cue may spend more than this share of its own phase arriving. A third
 * leaves the word fully up for the middle of the phase and still reads as a
 * fade rather than a cut.
 */
const CUE_FADE_SHARE = 0.34;

const cueFadeFor = (ms: number) => Math.min(CUE_FADE_MS, Math.round(ms * CUE_FADE_SHARE));

interface BreathingGuideProps {
  /** Called once, after the last full cycle. Never mid-exhale. */
  onDone: () => void;
}

export function BreathingGuide({ onDone }: BreathingGuideProps) {
  const theme = useTheme();
  const { width, height } = useWindowDimensions();
  const reducedMotion = useReducedMotion();

  const diameter = Math.min(Math.min(width, height) * DIAMETER_RATIO, MAX_DIAMETER);

  const scale = useSharedValue(MIN_SCALE);
  const progress = useSharedValue(0);
  /** `null` until the lead-in is over. Nothing is cued before the breath starts. */
  const [step, setStep] = useState<number | null>(null);

  // Held in a ref so the effect below can stay mounted for the whole minute
  // instead of tearing down and restarting the breath on every phase change.
  const onDoneRef = useRef(onDone);
  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

  useEffect(() => {
    // Cycles rather than a bare 60s cut-off: the breath finishes where it
    // started, at the bottom, instead of being interrupted somewhere in an
    // inhale. Derived in the config now, because the intro screen quotes this
    // number to the user before they start.
    const cycles = BREATH_CYCLES;
    let index = 0;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    let cancelled = false;
    /** The pulse train of the phase now running. Stopped before the next one. */
    let stopPulses: (() => void) | undefined;

    // Delayed by the same lead-in, so the line starts moving when the breath
    // does rather than while the circle is still.
    progress.value = withDelay(
      BREATHING.leadInMs,
      withTiming(1, { duration: cycles * BREATH_CYCLE_MS, easing: Easing.linear }),
    );

    // Reduce Motion: the circle opens once and stays open. Everything below
    // still runs, so the cues and the ticks keep pacing the breath.
    if (reducedMotion) scale.value = withTiming(1, { duration: 400 });

    const run = () => {
      if (cancelled) return;

      if (index >= cycles * CYCLE.length) {
        onDoneRef.current();
        return;
      }

      const current = CYCLE[index % CYCLE.length];
      setStep(index);

      // The old train first, in case a phase was cut short — its remaining taps
      // belong to an instruction that is no longer on screen.
      stopPulses?.();
      // `'sigh'`, which is what runs the inhales at about three taps a second
      // instead of one — this screen paces the shape of a breath rather than a
      // rate, and the shape is in the two inhales. See `breath-pulse.ts`.
      stopPulses = current.pulse
        ? pulseBreath(current.pulse, current.ms, 'sigh')
        : undefined;

      // Honouring Reduce Motion by holding the circle still, rather than by
      // animating it more gently: someone who asked the system to stop things
      // moving asked for exactly that.
      if (!reducedMotion) {
        scale.value = withTiming(current.scale, {
          duration: current.ms,
          easing: current.easing,
        });
      }

      index += 1;
      timeout = setTimeout(run, current.ms);
    };

    // The circle sits at `MIN_SCALE` and the cue slot stays empty until this
    // fires. See `BREATHING.leadInMs`.
    timeout = setTimeout(run, BREATHING.leadInMs);

    return () => {
      cancelled = true;
      if (timeout) clearTimeout(timeout);
      stopPulses?.();
    };
  }, [progress, reducedMotion, scale]);

  const coreStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const haloStyle = useAnimatedStyle(() => ({
    // Trails the core by a fraction of the distance it has left, so the gap
    // between them has closed by the top of the breath instead of leaving a
    // ring that reads as the circle failing to fill.
    transform: [{ scale: scale.value + (1 - scale.value) * 0.3 }],
    opacity: 0.14 + (scale.value - MIN_SCALE) * 0.18,
  }));
  const progressStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: progress.value }],
  }));

  const at = step === null ? null : step % CYCLE.length;
  const cue = at === null ? null : CYCLE[at].cue;

  /**
   * A cue arrives no slower than its own phase can afford, and leaves no slower
   * than the next one arrives.
   *
   * The second half is why `exiting` reads the *next* step rather than this one.
   * Each word's fade-out plays after its element has been removed, so it is a
   * statement about the handover, not about the phase it belongs to — and "In"
   * dissolving over 600ms across the whole of a 700ms top-up is the other half
   * of what made the second inhale feel late. The lookup is static: the cycle is
   * a fixed ring, so the phase after this one is always known.
   */
  const cueEnterMs = at === null ? CUE_FADE_MS : cueFadeFor(CYCLE[at].ms);
  const cueExitMs =
    at === null ? CUE_FADE_MS : cueFadeFor(CYCLE[(at + 1) % CYCLE.length].ms);

  return (
    <View style={styles.root}>
      <View style={styles.breathHalf}>
        <View style={styles.cueSlot}>
          {cue ? (
            <Animated.View
              // Keyed on the word: this is a swap of one element for another,
              // which is what gives each cue its own fade.
              key={`${step}-${cue}`}
              entering={FadeIn.duration(cueEnterMs)}
              exiting={FadeOut.duration(cueExitMs)}
              style={styles.cue}>
              <ThemedText type="subtitle" themeColor="textSecondary" style={styles.cueText}>
                {cue}
              </ThemedText>
            </Animated.View>
          ) : null}
        </View>

        {/* Sized to the glow rather than to the circle — see `breathGlowSize`.
            A stage cut to the circle alone clips the rings on Android. */}
        <GlowStage size={breathGlowSize(diameter, GLOW_REACH)}>
          <BreathGlow
            scale={scale}
            minScale={MIN_SCALE}
            diameter={diameter}
            reach={GLOW_REACH}
            color={theme.info}
          />

          <Animated.View
            style={[
              styles.circle,
              haloStyle,
              { width: diameter, height: diameter, borderRadius: diameter / 2 },
              { backgroundColor: theme.info },
            ]}
          />
          <Animated.View
            style={[
              styles.circle,
              coreStyle,
              { width: diameter, height: diameter, borderRadius: diameter / 2 },
              { backgroundColor: withAlpha(theme.info, 0.2), borderColor: theme.info },
            ]}
          />
        </GlowStage>

        {/* The only indication of time left, and it is meant to be seen now.
            It spent a long while as a hairline at a third opacity, on the
            argument that a countdown here would be something to watch instead
            of the breath. That is still true of a *countdown* — a number
            ticking down is a thing you check — and it turned out not to be true
            of a bar. Somebody half a minute into a screen with no numbers on it
            wants to know whether they are nearly done, and a mark they cannot
            find leaves them wondering rather than breathing.

            Where it landed: four points of it, in the accent rather than the
            strong step of it, at a shade under full. Each of those is a step
            back from the version that first fixed the problem — that one was
            legible from across the room, which is more than a bar tracking half
            a minute needs to be. Still one fact, still no numbers, and still
            the quietest thing on the screen after the circle. */}
        <View style={[styles.track, { backgroundColor: theme.barDivider }]}>
          <Animated.View
            style={[styles.fill, progressStyle, { backgroundColor: theme.accent }]}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  // The only flex child, so its `justifyContent: 'center'` centres the circle on
  // the screen. It is still called a half because it was one — this sat under a
  // matching band that held the drawn character, and the two split the screen
  // evenly so neither read as decoration hung off the other. With that band gone
  // the name is the last of it, and the layout needs nothing else to say so.
  breathHalf: {
    flex: 1,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.four,
    // Padding at the foot of the box the circle is centred in, which lifts it
    // by half of that — the same trick the door uses on its sphere. Two things
    // want it a little above the true centre: the progress bar sits under the
    // circle and is part of the same object, so the pair's centre is lower than
    // the circle's; and a shape somebody is looking at for half a minute reads
    // as sitting low when it is measured dead centre.
    paddingBottom: Spacing.five,
  },
  // Pinned to the top of the screen rather than stacked above the circle, and
  // that is what puts the circle in the middle: a cue in the flow pushes
  // everything under it down by its own height, so the thing the eye is meant
  // to sit on ends up off-centre by the width of a word.
  //
  // The slot keeps its height regardless, because the cue inside it is absolute
  // and swaps one word for another — see `cue`. Without a height to swap
  // inside, the two would have nothing to be laid out against.
  cueSlot: {
    position: 'absolute',
    // Down from the top edge by the app's long pause. At `0` the word sat
    // directly under the chrome row, which read as a fourth piece of chrome
    // rather than as the instruction for the thing in the middle of the screen.
    // This is far enough to belong to the circle and far enough from it that
    // the two are not one object.
    top: Spacing.six,
    left: 0,
    right: 0,
    height: 34,
    justifyContent: 'center',
  },
  // Absolute so an outgoing word sits on top of the incoming one instead of
  // being laid out beside it.
  cue: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  cueText: {
    letterSpacing: 2,
    textAlign: 'center',
  },
  circle: {
    position: 'absolute',
    borderWidth: StyleSheet.hairlineWidth * 3,
    borderColor: 'transparent',
  },
  // It went 120 points of hairline at 35% opacity → 200 of five at full →
  // this: 180 of four, at 80%.
  //
  // The middle step was the useful one, because it proved the problem was
  // findability rather than size — once the bar could be found at all, it could
  // afford to give some of that back. Four points still reads as a shape rather
  // than as a `Rule` that wandered down the screen, and the opacity is doing
  // what the old 35% was trying to do without taking the thing back below the
  // threshold of being seen.
  //
  // Opacity on the track rather than a lighter pair of colours, so the fill and
  // the groove it runs in fade together and the bar stays one object. The
  // accent underneath is the plain step now, not `accentStrong` — a bar this
  // size does not need the contrast a numeral does.
  //
  // `overflow` is what makes the fill a fill: it is a full-width bar scaled
  // from its left edge, so without this it would be drawn past the track's end
  // for the whole run.
  track: {
    width: 180,
    height: 4,
    borderRadius: Radius.pill,
    opacity: 0.8,
    overflow: 'hidden',
  },
  fill: {
    width: '100%',
    height: '100%',
    transformOrigin: 'left',
  },
});
