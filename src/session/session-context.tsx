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
import type { GameId } from '@/session/games/catalog';

export interface SessionState {
  category: Category | null;
  /** Duplicated from `category` because it is the actual routing signal. */
  categoryGroup: CategoryGroup | null;
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
}

const EMPTY_SESSION: SessionState = {
  category: null,
  categoryGroup: null,
  moodBefore: null,
  moodAfter: null,
  reactivationSkipped: false,
  game: null,
};

interface SessionApi extends SessionState {
  /**
   * Clears anything left over and opens a new session. The rating arrives a
   * screen later, via `setMoodBefore`.
   */
  begin: (category: Category) => void;
  setMoodBefore: (mood: number) => void;
  setReactivationSkipped: (skipped: boolean) => void;
  chooseGame: (game: GameId) => void;
  setMoodAfter: (mood: number) => void;
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
    });
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

  const reset = useCallback(() => setState(EMPTY_SESSION), []);

  const value = useMemo<SessionApi>(
    () => ({
      ...state,
      begin,
      setMoodBefore,
      setReactivationSkipped,
      chooseGame,
      setMoodAfter,
      reset,
    }),
    [state, begin, setMoodBefore, setReactivationSkipped, chooseGame, setMoodAfter, reset],
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
