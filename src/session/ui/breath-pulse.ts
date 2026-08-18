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
 * The closest two pulses may ever land, and the rule that decides whether a
 * phase gets a train at all.
 *
 * The sigh's top-up is 600ms and is meant to be snatched. Two pulses inside it
 * would land a third of a second apart, which is not a rate anybody can breathe
 * to — it is a double tap, and a double tap means something else. The same is
 * true of any short phase, so the floor is expressed as the gap rather than as
 * a phase length: a phase that cannot hold two pulses this far apart gets one.
 */
const MIN_GAP_MS = 650;

/** Where in a rising phase the firmest tap starts. The top of the breath. */
const PEAK_FROM = 0.75;

/**
 * The pulses for one phase of a breath, in order, the first at zero.
 *
 * The last pulse lands one gap short of the phase's end rather than on it: the
 * next phase opens with its own pulse at zero, and two haptics in the same
 * frame are one haptic that feels wrong.
 */
export function planBreathPulses(phase: BreathPhase, ms: number): BreathPulse[] {
  if (ms <= 0) return [];

  const count = Math.min(
    MAX_PULSES,
    // What the phase has room for at the floor, which is what stops a short one
    // from being handed a rate nobody could breathe at.
    Math.floor(ms / MIN_GAP_MS),
    Math.max(MIN_PULSES, Math.round(ms / PULSE_TARGET_MS)),
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
