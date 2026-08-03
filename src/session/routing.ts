/**
 * Every branch in the session, as pure functions.
 *
 * Kept out of the screens so the rules can be read in one place and tested
 * without a renderer. Each one is driven by the category *group* or by a mood
 * number — never by a specific category, so adding a category can't silently
 * change the flow.
 */

import type { CategoryGroup } from '@/content/categories';
import {
  HIGH_DISTRESS_MOOD,
  MEANINGFUL_MOOD_DROP,
  PUZZLE,
} from '@/config/session';

/**
 * Someone at the top of the scale should not be asked to bring the image back.
 * The reactivation cue is there to make the puzzle land on the right memory;
 * it is not worth doing to a person who is already at 8.
 */
export function skipsReactivation(moodBefore: number): boolean {
  return moodBefore >= HIGH_DISTRESS_MOOD;
}

/** GROUP B gets a longer default — the puzzle is the point of their session. */
export function puzzleDurationMs(group: CategoryGroup): number {
  return group === 'witnessed' ? PUZZLE.witnessedMs : PUZZLE.standardMs;
}

/**
 * The calibration screen answers "is the world actually like that", which is
 * only the question GROUP A is asking. For GROUP B the trouble is an image,
 * and a chart about it would be beside the point at best.
 */
export function showsCalibration(group: CategoryGroup): boolean {
  return group === 'world';
}

export interface MoodOutcome {
  /** Dropped by at least `MEANINGFUL_MOOD_DROP`. */
  improved: boolean;
  /** Still at or above `HIGH_DISTRESS_MOOD`, improvement or not. */
  stillHighDistress: boolean;
}

export function moodOutcome(before: number, after: number): MoodOutcome {
  return {
    improved: before - after >= MEANINGFUL_MOOD_DROP,
    stillHighDistress: after >= HIGH_DISTRESS_MOOD,
  };
}

export type AftercareKind = 'grounding' | 'park-worry';

/**
 * The one extra thing offered when the rating didn't move. Exactly one, chosen
 * for them — a menu at this point is another decision handed to someone who
 * has already told us they feel no better.
 *
 * Which one is driven by the group, because the two do different jobs:
 * grounding pulls attention out of a replaying image (GROUP B), while
 * worry-postponement gives an unresolved future fear somewhere to sit until
 * later (GROUP A). Neither is a substitute for the other.
 */
export function aftercareKind(group: CategoryGroup): AftercareKind {
  return group === 'witnessed' ? 'grounding' : 'park-worry';
}
