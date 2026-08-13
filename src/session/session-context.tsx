/**
 * The one piece of state the session has.
 *
 * In memory only, and that is on purpose for this slice: nothing here is
 * written to disk and the app forgets everything on close.
 *
 * LATER, IF EVER: `moodBefore`/`moodAfter` pairs would be the only honest
 * measure of whether the thing works, and category counts would say which
 * groups actually use it. Both would need to be local-only and opt-in — this
 * app's whole proposition is that it isn't keeping anything.
 */

import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

import type { Category, CategoryGroup } from '@/content/categories';
import type { OneMoreId } from '@/content/one-more';
import type { WorldTopic } from '@/content/topics';
import type { GameId, GameKind } from '@/session/games/catalog';

export interface SessionState {
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

  const setMoodAfter = useCallback((mood: number) => {
    setState((current) => ({ ...current, moodAfter: mood }));
  }, []);

  const chooseOneMore = useCallback((choice: OneMoreId | null) => {
    setState((current) => ({ ...current, oneMore: choice }));
  }, []);

  const reset = useCallback(() => setState(EMPTY_SESSION), []);

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
