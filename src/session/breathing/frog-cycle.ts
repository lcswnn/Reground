/**
 * Which frog pose is on screen, and when.
 *
 * Kept apart from the component on purpose: this is the half that can be
 * checked. The eight poses have to tile the five breath phases exactly, and
 * nothing at runtime would complain if they stopped doing so — the frog would
 * just drift a little further from the circle every cycle. So the mapping is
 * plain data in a file with no React Native in it, and a test asserts the
 * tiling.
 *
 * The artwork is a ping-pong: only four distinct inflations were drawn, and
 * the way back down reuses two of them in reverse. `falling` is the same
 * drawing as `risen`, and `low` the same as `rising`. That is why the names
 * below describe where a pose sits in the breath rather than what it depicts —
 * the drawing is shared, the moment is not.
 */

import { BREATHING, FROG } from '@/config/session';

/**
 * Indices into `FROG_FRAMES`, named. The numbers are the array positions, and
 * they line up with the filenames — `bottom` is `pose-1-*.png`.
 *
 * `bottom` and `peak` are the two the artist drew with the eyes open.
 */
export const POSE = {
  /** Emptiest, eyes open. The floor of the breath. */
  bottom: 0,
  rising: 1,
  risen: 2,
  /** Fullest. Reached at the top of the second inhale. */
  full: 3,
  /** Fullest again, eyes open. The beat at the top. */
  peak: 4,
  /** Still full, eyes closing. The tail of the hold, not the start of the exhale. */
  settling: 5,
  falling: 6,
  low: 7,
} as const;

/** How many poses exist, and so how many the cycle has to account for. */
export const POSE_COUNT = Object.keys(POSE).length;

export interface PoseBeat {
  /** An index into `FROG_FRAMES`. */
  pose: number;
  ms: number;
}

/** Pairs a run of poses with the durations configured for the phase they fill. */
const beats = (poses: readonly number[], durations: readonly number[]): readonly PoseBeat[] =>
  poses.map((pose, i) => ({ pose, ms: durations[i] }));

/**
 * Keyed by phase, so the component can look up the poses for whichever step of
 * `CYCLE` it has just entered without the two lists having to be kept in the
 * same order by hand.
 *
 * Note that `settling` belongs to the hold rather than to the exhale, even
 * though it is the sixth drawing. It is still fully inflated, so putting it at
 * the head of the exhale would leave the frog visibly unchanged for the first
 * two and a half seconds of the longest phase in the cycle — the user breathing
 * out while the frog held its breath.
 */
export const FROG_CYCLE = {
  'inhale-1': beats([POSE.rising, POSE.risen], FROG.poseMs.firstInhale),
  'inhale-2': beats([POSE.full], FROG.poseMs.secondInhale),
  hold: beats([POSE.peak, POSE.settling], FROG.poseMs.hold),
  exhale: beats([POSE.falling, POSE.low, POSE.bottom], FROG.poseMs.exhale),
  rest: beats([POSE.bottom], FROG.poseMs.rest),
} as const;

/** What each phase's beats have to add up to. */
export const PHASE_MS = {
  'inhale-1': BREATHING.firstInhaleMs,
  'inhale-2': BREATHING.secondInhaleMs,
  hold: BREATHING.holdMs,
  exhale: BREATHING.exhaleMs,
  rest: BREATHING.restMs,
} as const;

/**
 * Where the frog waits during the lead-in, and where Reduce Motion parks it.
 *
 * Two different answers, because the two moments are different. Before the
 * breath starts the circle is at its smallest, so the frog is at `bottom` and
 * they agree. Under Reduce Motion the circle opens once and stays open, so the
 * frog stays at `peak` to match — and `peak` is eyes-open, which is the right
 * face for a still frog.
 */
export const LEAD_IN_POSE = POSE.bottom;
export const STILL_POSE = POSE.peak;
