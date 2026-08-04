/**
 * Which Tully pose is on screen, and when.
 *
 * Kept apart from the component on purpose: this is the half that can be
 * checked. The poses have to tile the five breath phases exactly, and nothing
 * at runtime would complain if they stopped doing so — Tully would just drift a
 * little further from the circle every cycle. So the mapping is plain data in a
 * file with no React Native in it, and a test asserts the tiling.
 *
 * The nine drawings are seven inflations, because two of them come in pairs:
 * `brim`/`sip` are one size and `crest`/`peak` are another, each pair drawn
 * once with the eyes open and once shut. That is the whole trick of the second
 * inhale — Tully can close their eyes without changing size, and change size
 * without opening them, so the top-up reads as a decision rather than as more
 * of the same swelling.
 *
 * Only the way up was drawn. The exhale walks the same drawings back down, so
 * the pose names describe an inflation rather than a moment in the breath:
 * `risen` is one drawing whether the chest is filling or emptying, and it is
 * the cycle below that says which.
 *
 * The three drawings with the eyes open are `bottom`, `brim` and `peak` — the
 * floor, the top of the first inhale, and the top of the second. Tully looks at
 * you at each of those and has their eyes shut for the work in between, which
 * is why the descent skips `brim`: see `TULLY_CYCLE`.
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
  /** Top of the first inhale, eyes open. Same size as `sip`. */
  brim: 5,
  /** `brim` with the eyes shut — the second inhale starting. */
  sip: 6,
  /** Fullest, eyes shut. What the top-up reaches. */
  crest: 7,
  /** `crest` with the eyes open. The beat at the top. */
  peak: 8,
} as const;

/** How many poses exist, and so how many the cycle has to account for. */
export const POSE_COUNT = Object.keys(POSE).length;

/**
 * The drawings Tully was given open eyes in. They are the three still points of
 * the breath, and the exhale is defined against this set rather than against a
 * list of pose numbers — so a drawing added later is placed by what it depicts.
 */
export const EYES_OPEN: ReadonlySet<number> = new Set([POSE.bottom, POSE.brim, POSE.peak]);

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
 * The second inhale is the phase this was all drawn for. It is the shortest in
 * the cycle and it used to be a single pose, which made it the one moment
 * Tully was not visibly doing what the user was being asked to do. Now it runs
 * `sip → crest → peak`: eyes shut at the size the first inhale left them,
 * a real swell, then eyes open at the top. Three beats inside 700ms is fast,
 * and meant to be — it is a snatched breath, not a second slow one.
 *
 * The exhale skips `brim`, which is the rule Tully's face sets rather than an
 * omission. The descent is the working half of the breath and Tully keeps their
 * eyes shut through it, and `brim` is the eyes-open drawing of a size the
 * eyes-shut `sip` already covers — so dropping it costs the descent no step of
 * inflation at all. It only removes a blink that would read as Tully checking
 * on you halfway through their own exhale.
 */
export const TULLY_CYCLE = {
  'inhale-1': beats(
    [POSE.rising, POSE.risen, POSE.swelling, POSE.full, POSE.brim],
    TULLY.poseMs.firstInhale,
  ),
  'inhale-2': beats([POSE.sip, POSE.crest, POSE.peak], TULLY.poseMs.secondInhale),
  hold: beats([POSE.peak], TULLY.poseMs.hold),
  exhale: beats(
    [POSE.crest, POSE.sip, POSE.full, POSE.swelling, POSE.risen, POSE.rising, POSE.bottom],
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
