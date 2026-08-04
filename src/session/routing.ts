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
 * GROUP A is asked one more question before the session starts: which thing.
 *
 * Only they are. For GROUP B the trouble is a specific image the user already
 * has in mind, so there is nothing to narrow — and the screen that would use
 * the answer (`showsCalibration`) never renders for them anyway. The two
 * functions are driven by the same group for the same reason, and if one ever
 * stops matching the other, the picker is asking for something nothing reads.
 */
export function needsTopic(group: CategoryGroup): boolean {
  return group === 'world';
}

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

/**
 * Every route in the session, in flow order.
 *
 * Written out as a union rather than inferred from the file tree so that
 * `previousRoute` below is exhaustive: adding a screen without giving it a way
 * back is a type error, not a screen that quietly has no button.
 */
export type SessionRoute =
  | '/'
  | '/category'
  | '/topic'
  | '/mood'
  | '/breathe-intro'
  | '/breathe'
  | '/reactivate'
  | '/games'
  | '/game'
  | '/calibration'
  | '/mood-after'
  | '/aftercare'
  | '/check-in'
  | '/close'
  | '/closed';

/** The slice of session state the back button's target depends on. */
export interface BackContext {
  group: CategoryGroup | null;
  /** GROUP A answered the follow-up, so there is a second screen behind them. */
  hasTopic: boolean;
  moodBefore: number | null;
  moodAfter: number | null;
}

/**
 * Where the back button goes from a given screen, or `null` for the screens
 * that don't get one.
 *
 * Every screen navigates with `router.replace`, so there is no stack to pop —
 * back is a route like any other, and this is the one place that says which.
 * Two of the targets are deliberately not the screen the user literally came
 * from:
 *
 *  - `/reactivate` goes back to `/breathe-intro`, not `/breathe`. The breath is
 *    a minute on its own clock; sending someone back into the middle of it is a
 *    forward action wearing a back button. The intro is the step's front door
 *    and waits for a tap.
 *  - `/games` goes back to `/breathe-intro` rather than `/reactivate` when the
 *    cue was auto-skipped for high distress — `/reactivate` would bounce them
 *    straight forward again, which is a back button that does nothing.
 */
export function previousRoute(
  route: SessionRoute,
  context: BackContext,
): SessionRoute | null {
  switch (route) {
    // The door starts nothing, and the dead end has already cleared the
    // session. Neither has anything behind it worth returning to.
    case '/':
    case '/closed':
      return null;

    case '/category':
      return '/';
    case '/topic':
      return '/category';
    case '/mood':
      return context.hasTopic ? '/topic' : '/category';
    case '/breathe-intro':
      return '/mood';
    case '/breathe':
      return '/breathe-intro';
    case '/reactivate':
      return '/breathe-intro';
    case '/games':
      return context.moodBefore !== null && skipsReactivation(context.moodBefore)
        ? '/breathe-intro'
        : '/reactivate';
    case '/game':
      return '/games';
    case '/calibration':
      return '/game';
    case '/mood-after':
      // GROUP B never sees the calibration screen, so their last step was the
      // game itself.
      return context.group !== null && showsCalibration(context.group)
        ? '/calibration'
        : '/game';
    case '/aftercare':
      return '/mood-after';
    case '/check-in':
      return '/aftercare';
    case '/close':
      return routeIntoClose(context);
  }
}

/**
 * The closing screen has three ways in — straight from the second rating when
 * it improved, from the check-in after grounding, and from the worry-parking
 * screen — so its back target is the only one that has to be reconstructed
 * from state rather than read off the flow.
 */
function routeIntoClose(context: BackContext): SessionRoute {
  const { group, moodBefore, moodAfter } = context;

  // Nothing to reconstruct from: the rating screen is the safe answer, since
  // every path to here passes through it.
  if (group === null || moodBefore === null || moodAfter === null) return '/mood-after';

  if (moodOutcome(moodBefore, moodAfter).improved) return '/mood-after';

  return aftercareKind(group) === 'grounding' ? '/check-in' : '/aftercare';
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
