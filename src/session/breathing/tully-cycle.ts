/**
 * Which Tully pose is on screen, and when.
 *
 * Kept apart from the component on purpose: this is the half that can be
 * checked. The poses have to tile the five breath phases exactly, and nothing
 * at runtime would complain if they stopped doing so — Tully would just drift a
 * little further from the circle every cycle. So the mapping is plain data in a
 * file with no React Native in it, and a test asserts the tiling.
 *
 * All six drawings are distinct inflations, in a clean ramp from emptiest to
 * fullest, and only the inhale was drawn. So the breath climbs the ramp and
 * then walks back down it, and four of the six are used twice — once on the
 * way up, once on the way down. That is why the pose names below describe an
 * inflation rather than a moment in the breath: `risen` is one drawing whether
 * the chest is filling or emptying, and it is the cycle that says which.
 *
 * The two drawings with the eyes open are the two ends of the ramp, and they
 * land on the two phases where nothing is being asked — `bottom` on the rest
 * and `peak` on the hold. Tully looks back at you at the floor and at the top,
 * and has their eyes shut through the work in between.
 */

import { BREATHING, TULLY } from '@/config/session';

/**
 * Indices into `TULLY_FRAMES`, named. The numbers are the array positions, and
 * they line up with the filenames — `bottom` is `pose-1-*.png`.
 */
export const POSE = {
  /** Emptiest, eyes open. The floor of the breath. */
  bottom: 0,
  rising: 1,
  risen: 2,
  swelling: 3,
  full: 4,
  /** Fullest, eyes open. The beat at the top. */
  peak: 5,
} as const;

/** How many poses exist, and so how many the cycle has to account for. */
export const POSE_COUNT = Object.keys(POSE).length;

export interface PoseBeat {
  /** An index into `TULLY_FRAMES`. */
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
 * The hold is one beat, not two: `peak` has the whole of it, so the top of the
 * breath is one unbroken beat on the last drawing rather than a glimpse of it
 * followed by Tully starting to sag while the user is still holding. Nothing
 * moves until the exhale actually begins.
 *
 * Which is why `full` heads the exhale. It is a smaller drawing than `peak`, so
 * that first beat is a visible letting-go on the boundary itself — the release
 * lands with the cue rather than ahead of it.
 */
export const TULLY_CYCLE = {
  'inhale-1': beats([POSE.rising, POSE.risen, POSE.swelling], TULLY.poseMs.firstInhale),
  'inhale-2': beats([POSE.full], TULLY.poseMs.secondInhale),
  hold: beats([POSE.peak], TULLY.poseMs.hold),
  exhale: beats(
    [POSE.full, POSE.swelling, POSE.risen, POSE.rising, POSE.bottom],
    TULLY.poseMs.exhale,
  ),
  rest: beats([POSE.bottom], TULLY.poseMs.rest),
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
 * Where Tully waits during the lead-in, and where Reduce Motion parks them.
 *
 * Two different answers, because the two moments are different. Before the
 * breath starts the circle is at its smallest, so Tully is at `bottom` and they
 * agree. Under Reduce Motion the circle opens once and stays open, so Tully
 * stays at `peak` to match — and `peak` is eyes-open, which is the right face
 * for a Tully that is not going to move.
 */
export const LEAD_IN_POSE = POSE.bottom;
export const STILL_POSE = POSE.peak;
