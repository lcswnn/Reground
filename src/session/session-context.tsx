/**
 * The one piece of state the session has.
 *
 * In memory only: nothing here is written to this phone's disk and the app
 * forgets all of it on close. That has not changed and is not going to.
 *
 * ## The "later, if ever" happened
 *
 * This file used to end its opening note with one: `moodBefore`/`moodAfter`
 * pairs would be the only honest measure of whether the thing works, category
 * counts would say who actually uses it, and both would have to be opt-in.
 *
 * They now are. On the way past two points in the flow the session is handed to
 * `recordSession`, which — if the user has left the switch on — sends the two
 * numbers and the four choices to a row keyed by a random id that is not a
 * person. See `src/lib/analytics/sessions.ts` for what is in that row and
 * `consent.tsx` for the switch.
 *
 * The old note said local-only as well as opt-in, and that half was traded
 * knowingly: kept local, the pairing can tell one user about their own sessions
 * and can never answer "does this work", which is a question about many people
 * and is the one worth asking. What is preserved instead is the property the
 * local-only rule was standing in for — that nothing identifying leaves, and
 * that turning it off takes back what already did.
 *
 * `startedAt` below is the only new field, and it is not read by any screen.
 */

import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

import { recordSession } from '@/lib/analytics/sessions';

import type { Category, CategoryGroup } from '@/content/categories';
import type { OneMoreId } from '@/content/one-more';
import type { WorldTopic } from '@/content/topics';
import type { GameId, GameKind } from '@/session/games/catalog';

export interface SessionState {
  /**
   * When the session began, as an ISO string, or null before it has.
   *
   * Nothing on screen uses it. It exists because it is half of the key a
   * recorded session is written under — see `app_sessions` — which makes the
   * two writes for one session land on one row. Set by `begin` and cleared with
   * everything else.
   */
  startedAt: string | null;
  category: Category | null;
  /** Duplicated from `category` because it is the actual routing signal. */
  categoryGroup: CategoryGroup | null;
  /**
   * Which shelf of games this session gets, and how the game step is framed
   * and timed. Duplicated from `category` for the same reason the group is:
   * every screen that needs it needs only this, and reading it off the category
   * would spread the knowledge that it lives there.
   */
  gameKind: GameKind | null;
  /**
   * Which thing, for GROUP A. Null for GROUP B, which is never asked — and
   * null for GROUP A too until the picker, so a screen reading this before
   * then gets nothing rather than a stale answer from the last session.
   *
   * This is what decides which data the calibration screen pulls. It is
   * deliberately not a routing signal: every branch in the session still keys
   * off the *group*, so adding a topic cannot change the shape of the flow.
   */
  topic: WorldTopic | null;
  moodBefore: number | null;
  moodAfter: number | null;
  /** True if the user skipped the reactivation cue, or it was skipped for them. */
  reactivationSkipped: boolean;
  /**
   * Which game they picked for the visuospatial step. Null until the picker,
   * and cleared with everything else at the start of the next session — the
   * choice is not a preference to be remembered, it is one tap in one session.
   */
  game: GameId | null;
  /**
   * Which last thing they picked on `/one-more`, and null both before the
   * choice and after backing out of one — that screen draws the list again
   * when this is null, so clearing it is how "pick something else" is done.
   *
   * Session state rather than the screen's own, unlike the two-phase local
   * state inside it, because the closing screen's back button has to know
   * which way the session left the list — see `routeIntoClose`.
   */
  oneMore: OneMoreId | null;
}

const EMPTY_SESSION: SessionState = {
  startedAt: null,
  category: null,
  categoryGroup: null,
  gameKind: null,
  topic: null,
  moodBefore: null,
  moodAfter: null,
  reactivationSkipped: false,
  game: null,
  oneMore: null,
};

interface SessionApi extends SessionState {
  /**
   * Clears anything left over and opens a new session. The rating arrives a
   * screen later, via `setMoodBefore`.
   */
  begin: (category: Category) => void;
  /** GROUP A's follow-up answer. Never called for GROUP B. */
  chooseTopic: (topic: WorldTopic) => void;
  setMoodBefore: (mood: number) => void;
  setReactivationSkipped: (skipped: boolean) => void;
  chooseGame: (game: GameId) => void;
  setMoodAfter: (mood: number) => void;
  /** Null puts the user back on the list. See `oneMore` above. */
  chooseOneMore: (choice: OneMoreId | null) => void;
  reset: () => void;
}

const SessionContext = createContext<SessionApi | null>(null);

export function SessionFlowProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SessionState>(EMPTY_SESSION);

  const begin = useCallback((category: Category) => {
    setState({
      ...EMPTY_SESSION,
      startedAt: new Date().toISOString(),
      category,
      categoryGroup: category.group,
      gameKind: category.games,
    });
  }, []);

  const chooseTopic = useCallback((topic: WorldTopic) => {
    setState((current) => ({ ...current, topic }));
  }, []);

  const setMoodBefore = useCallback((mood: number) => {
    setState((current) => ({ ...current, moodBefore: mood }));
  }, []);

  const setReactivationSkipped = useCallback((skipped: boolean) => {
    setState((current) => ({ ...current, reactivationSkipped: skipped }));
  }, []);

  const chooseGame = useCallback((game: GameId) => {
    setState((current) => ({ ...current, game }));
  }, []);

  /**
   * The second rating, and the first of the two moments a session is recorded.
   *
   * Recorded here rather than from `mood-after.tsx` because this is where the
   * complete state exists: the screen has a number and the provider has
   * everything it happened to.
   *
   * The two recording callbacks are the only ones in this file that close over
   * `state` rather than taking it from a functional update, and that is not an
   * oversight. An updater must be pure, and sending a row is the least pure
   * thing in the app. Both of these are one-shot actions on a screen that
   * navigates away immediately, so there is no second call to go stale against —
   * and `value` already re-memoises on every state change, so the extra
   * dependency costs nothing.
   *
   * It is done at this point and not only at the end because this is the last
   * place a measured session is sure to reach. The app spends its final screens
   * telling people to put the phone down, and a good many of them do.
   */
  const setMoodAfter = useCallback(
    (mood: number) => {
      const next = { ...state, moodAfter: mood };

      setState(next);
      recordSession(next);
    },
    [state],
  );

  const chooseOneMore = useCallback((choice: OneMoreId | null) => {
    setState((current) => ({ ...current, oneMore: choice }));
  }, []);

  /**
   * Clears the session, and is the second moment it is recorded — which is the
   * only reason the recording is not a one-liner at the rating.
   *
   * What this write adds is everything that happens *after* the second rating:
   * which last thing they picked off the list, or that they declined it. The
   * row is keyed by `startedAt`, so this updates the one already sent rather
   * than adding a second.
   *
   * Called from exactly one place — the button on `/close`, on the way to the
   * dead end. A session abandoned before then keeps whatever the rating wrote.
   */
  const reset = useCallback(() => {
    recordSession(state);
    setState(EMPTY_SESSION);
  }, [state]);

  const value = useMemo<SessionApi>(
    () => ({
      ...state,
      begin,
      chooseTopic,
      setMoodBefore,
      setReactivationSkipped,
      chooseGame,
      setMoodAfter,
      chooseOneMore,
      reset,
    }),
    [
      state,
      begin,
      chooseTopic,
      setMoodBefore,
      setReactivationSkipped,
      chooseGame,
      setMoodAfter,
      chooseOneMore,
      reset,
    ],
  );

  return <SessionContext value={value}>{children}</SessionContext>;
}

export function useSessionFlow(): SessionApi {
  const value = useContext(SessionContext);
  if (!value) {
    throw new Error('useSessionFlow must be used inside SessionFlowProvider');
  }
  return value;
}
