/**
 * When a breath's haptics fire, and how hard. Pure — no timers, no native
 * module, no React.
 *
 * ## What the rest of the market does, and why this matches it
 *
 * A single tap at each phase boundary — which is what both breathing screens
 * here did — says *that* the breath turned over and nothing about what to do
 * for the next four seconds. Every paced-breathing app that has been through a
 * few versions has landed on the same shape instead, and it is worth writing
 * down because it is a convention rather than an invention:
 *
 *  1. **The phases feel different from each other.** An inhale and an exhale
 *     are opposite instructions, and a person with their eyes shut — which is
 *     what all of these ask for — cannot tell two identical taps apart. Apple's
 *     Breathe is the reference implementation: taps that build through the
 *     in-breath, and a different pattern for the out.
 *  2. **The rise is on the in-breath and the decay on the out.** The haptic
 *     traces the thing it is pacing. Filling gets firmer, letting go gets
 *     softer, and neither needs to be read.
 *  3. **Pulses, not a buzz.** Continuous vibration through a phase reads as an
 *     alarm and is the first thing people turn off. A tap about once a second
 *     is enough to hold a rate by.
 *  4. **Holds are silent apart from their boundaries.** Nothing is being asked
 *     during one; the only thing worth signalling is that it is over.
 *  5. **Nothing goes above the middle of the scale.** This is an app for
 *     someone who is already wound up, and a heavy haptic in the dark is a
 *     startle. `medium` is the ceiling here, and it lands at most once per
 *     inhale — at the top, where the breath is full.
 *
 * ## The sigh's inhales run faster than that
 *
 * `cadence` is the exception, and it exists because the two screens that pace a
 * breath are not pacing the same kind of thing. The breathwork patterns are a
 * *rate* — four seconds in, six out, held for a minute and a half — and a tap
 * about every second is the whole instruction: you are on time, stay on time.
 * The physiological sigh is a *shape*, and its inhales are the shape: a brisk
 * 1.4-second fill and then a 600ms snatch on top of it. At a pulse a second
 * that fill got two taps and the top-up got one, which is enough to mark the
 * phases and not enough to say what to do inside them.
 *
 * Under `'sigh'` the inhales run at roughly three taps a second instead. It
 * still builds, it still peaks at the top, and it still never goes above
 * `medium` — what changes is the density, which is the part that reads as
 * *keep going up* rather than *a phase started*. The exhale is untouched in
 * both cadences: it is the long half and the half that is meant to be doing
 * nothing, and a fast train through it would be the contradiction rule 3
 * warns about.
 *
 * ## Why this is its own file
 *
 * `haptics.ts` imports the native module, so anything in it is untestable off a
 * device. The schedule is the part with decisions in it, so it lives here and
 * is tested; `pulseBreath` is left holding nothing but timers and a switch.
 */

/** The two phases that are a movement. Holds are not paced, only bounded. */
export type BreathPhase = 'inhale' | 'exhale';

/**
 * Named rather than typed against `expo-haptics`, so this module stays free of
 * it. `haptics.ts` does the one-line mapping.
 */
export type PulseStrength = 'soft' | 'light' | 'medium';

export interface BreathPulse {
  /** Milliseconds after the phase starts. The first is always at zero. */
  readonly at: number;
  readonly strength: PulseStrength;
}

/**
 * Which of the two things this phase belongs to — a pace to hold, or the sigh's
 * stacked inhales. Only the inhale reads it; see the note above.
 */
export type BreathCadence = 'paced' | 'sigh';

/**
 * About one pulse a second, which is the rate the guides converge on. Faster
 * reads as a stutter; slower stops being something a breath can be held to.
 */
const PULSE_TARGET_MS = 1_000;

/**
 * Two is the fewest that can express a direction — one tap has no ramp — and
 * five is as many as a phase should ever carry: an eight-second exhale spread
 * over five is calm, over eight is a metronome.
 */
const MIN_PULSES = 2;
const MAX_PULSES = 5;

/**
 * The closest two pulses may ever land at this cadence, and the rule that
 * decides whether a phase gets a train at all.
 *
 * A phase that cannot hold two pulses this far apart gets one instead. The
 * floor is expressed as a gap rather than as a phase length because that is the
 * thing that actually goes wrong: two taps a third of a second apart are not a
 * rate anybody can breathe to, whatever phase they are inside.
 */
const MIN_GAP_MS = 650;

/**
 * The sigh's inhales, which run about three times as often.
 *
 * The floor is what decides the top-up. At 600ms it now holds two taps rather
 * than one — a light one as the second breath starts and a firm one as it
 * tops out, 300ms apart. That is a double tap, which the paced cadence
 * deliberately avoids because there it would mean something else; inside a
 * train already running at this rate it reads as the last two of the train.
 * Raise this above 300 and the top-up goes back to a single firm tap without
 * anything else moving.
 */
const SIGH_TARGET_MS = 320;
const SIGH_MIN_GAP_MS = 260;
/**
 * A ceiling that only the pacer's phases could reach — the sigh's own longest
 * inhale is 1.4s and comes out at four. It is here so that a future phase
 * lengthened past two seconds cannot quietly turn into a buzz.
 */
const SIGH_MAX_PULSES = 6;

/** Where in a rising phase the firmest tap starts. The top of the breath. */
const PEAK_FROM = 0.75;

/**
 * The pulses for one phase of a breath, in order, the first at zero.
 *
 * The last pulse lands one gap short of the phase's end rather than on it: the
 * next phase opens with its own pulse at zero, and two haptics in the same
 * frame are one haptic that feels wrong.
 */
export function planBreathPulses(
  phase: BreathPhase,
  ms: number,
  cadence: BreathCadence = 'paced',
): BreathPulse[] {
  if (ms <= 0) return [];

  // Only a rising phase runs quick. An exhale is the same long, unhurried thing
  // whichever screen is drawing it.
  const quick = cadence === 'sigh' && phase === 'inhale';
  const target = quick ? SIGH_TARGET_MS : PULSE_TARGET_MS;
  const gapFloor = quick ? SIGH_MIN_GAP_MS : MIN_GAP_MS;
  const ceiling = quick ? SIGH_MAX_PULSES : MAX_PULSES;

  const count = Math.min(
    ceiling,
    // What the phase has room for at the floor, which is what stops a short one
    // from being handed a rate nobody could breathe at.
    Math.floor(ms / gapFloor),
    Math.max(MIN_PULSES, Math.round(ms / target)),
  );

  // One tap, and it is the phase's own character rather than a neutral tick:
  // firm for an inhale that has nowhere to build, soft-edged for an exhale.
  if (count < MIN_PULSES) {
    return [{ at: 0, strength: phase === 'inhale' ? 'medium' : 'light' }];
  }

  const gap = ms / count;

  return Array.from({ length: count }, (_, index) => ({
    at: Math.round(gap * index),
    strength: strengthAt(phase, index / (count - 1)),
  }));
}

/** `position` runs 0 at the start of the phase to 1 at the last pulse. */
function strengthAt(phase: BreathPhase, position: number): PulseStrength {
  if (phase === 'inhale') {
    // Builds to the top and holds there for the last quarter, so the peak is a
    // couple of taps on a long inhale rather than a single one that can be
    // missed between breaths.
    return position >= PEAK_FROM ? 'medium' : 'light';
  }

  // One clear tap to start letting go, and then it gets out of the way. The
  // exhale is the long half of every pattern here and the half that is supposed
  // to be doing nothing — a ramp down that keeps announcing itself is a
  // contradiction.
  return position === 0 ? 'light' : 'soft';
}
