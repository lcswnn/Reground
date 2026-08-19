/**
 * Every branch in the session, as pure functions.
 *
 * Kept out of the screens so the rules can be read in one place and tested
 * without a renderer. Each one is driven by the category *group*, by the game
 * shelf, or by a mood number — never by a specific category id, so adding a
 * category can't silently change the flow. A new category picks its branch by
 * declaring a group and a shelf, and both of those are choices with reasons
 * attached rather than a name to match on.
 */

import type { CategoryGroup } from '@/content/categories';
import type { OneMoreId } from '@/content/one-more';
import type { GameKind } from '@/session/games/catalog';
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

/**
 * The cue asks for an image, so it is only asked of the session that has one.
 *
 * "Something I saw" is the only answer that describes a picture. "Personal" is a
 * worry and "Doomscrolling" is a feed — telling either of them to bring the
 * thing back to mind is asking them to picture something they never said they
 * were picturing, and the screen that asks is the one moment in the session
 * that deliberately hurts. It has to be earning something to be worth it.
 *
 * What it earns is the game: the cue and the visuospatial shelf are one
 * mechanism, the reminder being what the puzzle competes with. So this keys on
 * the shelf and not on the group — the same reason `puzzleDurationMs` does, and
 * the same fact `categories.ts` writes `games` down per category for. Group is
 * no use here anyway: "Personal" and "Something I saw" share one.
 *
 * That makes `games: 'visuospatial'` the single place a category declares it is
 * about a picture. A category given that shelf gets the cue with it.
 */
export function showsReactivation(kind: GameKind): boolean {
  return kind === 'visuospatial';
}

/**
 * Whether a session stops at the cue at all: both rules above, and the two
 * places that ask are the cue screen itself and the back button behind it.
 *
 * They have to agree. If the screen forwards itself and the back button still
 * points at it, the user gets bounced off it — see `previousRoute`.
 *
 * Nulls are "no": a session with no category or no rating has not been through
 * the screens that set them, and the only way to arrive here in that state is a
 * reload, which the cue screen answers by sending the user back to the door.
 */
export function reachesReactivation(context: {
  gameKind: GameKind | null;
  moodBefore: number | null;
}): boolean {
  if (context.gameKind === null || context.moodBefore === null) return false;

  return (
    showsReactivation(context.gameKind) && !skipsReactivation(context.moodBefore)
  );
}

/**
 * The visuospatial shelf gets a longer default — that game is the point of the
 * session it appears in, and the dose is what the trials varied.
 *
 * Keyed to the games rather than to the group, which is what it used to key on.
 * The longer dose was only ever justified by the mechanism, and the calm shelf
 * has no mechanism to dose — seven minutes of it is just a longer wait.
 */
export function puzzleDurationMs(kind: GameKind): number {
  return kind === 'visuospatial' ? PUZZLE.visuospatialMs : PUZZLE.standardMs;
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
  | '/breathe-intro'
  | '/breathe'
  | '/category'
  | '/topic'
  | '/mood'
  | '/reactivate'
  | '/games'
  | '/game'
  | '/calibration'
  | '/mood-after'
  | '/one-more'
  | '/check-in'
  | '/close'
  | '/closed';

/**
 * The three parts of a session, in the order they happen — and what the dots at
 * the top of every screen are counting.
 *
 * The session is longer than three screens, so this is not a screen counter: it
 * is the answer to 'how much of this is left', which is a different and much
 * shorter list. The questions belong to the game they lead into and are the
 * thing that decides what it is, the cue and the calibration belong to it too,
 * and so does the second rating — none of them is a part of the session in the
 * sense a user would count. Nobody arrives at `/topic` thinking they are two
 * steps in.
 *
 * There is no fourth part for the end. Finishing is not a step somebody does —
 * the third dot fills when the last thing is reached and the row is simply
 * complete from there, which is what a finished thing looks like. A dot that
 * lit up on the closing screen was counting the session's own paperwork.
 */
export const SESSION_STAGES = ['breath', 'game', 'oneMore'] as const;

export type SessionStage = (typeof SESSION_STAGES)[number];

/**
 * Which part each screen belongs to, or `null` for the screens outside the
 * count: the door, which starts nothing, and the dead end, which is past the
 * end of it — a progress indicator on a screen whose whole point is that the
 * session is over and the state is already cleared would be one more thing to
 * read on the one screen with nothing to read.
 *
 * A `Record` rather than a `switch` so that it is exhaustive in both
 * directions: a route added to `SessionRoute` without a part here is a type
 * error, and the object is also the runtime lookup `stageOfPath` needs.
 */
const STAGE_BY_ROUTE: Record<SessionRoute, SessionStage | null> = {
  '/': null,
  '/breathe-intro': 'breath',
  '/breathe': 'breath',
  // The three questions are the run-up to the game rather than parts of their
  // own — see the note above. They are also what the game is *made of*: the
  // category picks the shelf, the topic picks the data, and the rating decides
  // whether the cue is asked at all.
  '/category': 'game',
  '/topic': 'game',
  '/mood': 'game',
  // The cue exists to make the game land on the right memory, and the two
  // screens after the game are still about it: what the numbers actually say,
  // and where the rating ended up.
  '/reactivate': 'game',
  '/games': 'game',
  '/game': 'game',
  '/calibration': 'game',
  '/mood-after': 'game',
  // The check-in belongs to whatever was picked off the list, which is the
  // only reason it is ever reached.
  '/one-more': 'oneMore',
  '/check-in': 'oneMore',
  // The end of the last part rather than a part of its own: the row is already
  // full by the time anyone gets here, and it stays that way.
  '/close': 'oneMore',
  '/closed': null,
};

/** Which part a screen is in. */
export function stageOf(route: SessionRoute): SessionStage | null {
  return STAGE_BY_ROUTE[route];
}

/**
 * The same answer for a path off the router, which is a string and may be a
 * route this flow has never heard of. Anything unrecognised counts as outside
 * the session and draws no dots.
 */
export function stageOfPath(path: string): SessionStage | null {
  return STAGE_BY_ROUTE[path as SessionRoute] ?? null;
}

/** How far along a part is: 0 for the first, 3 for the last. */
export function stageIndex(stage: SessionStage): number {
  return SESSION_STAGES.indexOf(stage);
}

/** The slice of session state the back button's target depends on. */
export interface BackContext {
  group: CategoryGroup | null;
  /** GROUP A answered the follow-up, so there is a second screen behind them. */
  hasTopic: boolean;
  /**
   * Which shelf the session is on, which is also whether it has an image — and
   * so whether the reactivation cue is behind `/games`. See `showsReactivation`.
   */
  gameKind: GameKind | null;
  moodBefore: number | null;
  /**
   * Which last thing was picked, or null for nobody-picked-anything. The only
   * thing that says which way the session left `/one-more` — see
   * `routeIntoClose`.
   */
  oneMore: OneMoreId | null;
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
 *  - `/games` goes back to `/breathe-intro` rather than `/reactivate` whenever
 *    the cue was skipped on the way here — either because the session has no
 *    image to bring back, or because the rating was too high to ask. Pointing
 *    at `/reactivate` in those cases would bounce the user straight forward
 *    again, which is a back button that does nothing. `reachesReactivation` is
 *    the one answer both this and the cue screen read.
 *
 *  - `/category` goes back to `/breathe-intro` for the same reason, and it is
 *    the third screen pointed there rather than at the breath. It had no target
 *    at all for a while, on the argument that everything behind the first
 *    question is either a timed line or a breath already taken, so a back button
 *    there costs half a minute to press. What that argument missed is that this
 *    is the first screen in the session that *asks* for something, and the first
 *    place someone can want out of an answer they have not given yet. A screen
 *    with a question on it and no way back is a screen that reads as a form. The
 *    intro is a still page with a Start button, so the cost of landing there is
 *    a tap, not a minute — and skipping the breath from there is already
 *    offered on the breath itself.
 *
 * The door is the one thing nothing points back at: it moves on a timer, so any
 * button aimed at it lands on a screen that walks forward again a few seconds
 * later — the `/games` case above, with the bounce slowed down.
 */
export function previousRoute(
  route: SessionRoute,
  context: BackContext,
): SessionRoute | null {
  switch (route) {
    // The door starts nothing, and the dead end has already cleared the
    // session. Neither has anything behind it worth returning to. The breath's
    // front door joins them: the only thing behind it is the timed line, which
    // would just walk forward again.
    case '/':
    case '/breathe-intro':
    case '/closed':
      return null;

    // Both back to the breath's front door rather than to the breath — see
    // above. It is the step's own still page, and it is a tap away from either
    // starting the breath again or leaving it alone.
    case '/breathe':
    case '/category':
      return '/breathe-intro';
    case '/topic':
      return '/category';
    case '/mood':
      return context.hasTopic ? '/topic' : '/category';
    case '/reactivate':
      return '/mood';
    case '/games':
      return reachesReactivation(context) ? '/reactivate' : '/mood';
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
    case '/one-more':
      return '/mood-after';
    case '/check-in':
      return '/one-more';
    case '/close':
      return routeIntoClose(context);
  }
}

/**
 * The closing screen has two ways in, and the rating is no longer one of them:
 * everybody passes through `/one-more` now, whatever their rating did. So the
 * question this answers is only ever "did the last thing they picked run to a
 * check-in", and `oneMore` is what says so.
 *
 * A null choice means they went straight past the offer, which lands on the
 * same place as an exercise that doesn't check in — the list they declined.
 * That is also the answer when a reload has emptied the provider, and it is a
 * safe one for the same reason the rating screen used to be: every path to the
 * closing screen goes through the list.
 */
function routeIntoClose(context: BackContext): SessionRoute {
  return context.oneMore === 'grounding' ? '/check-in' : '/one-more';
}
