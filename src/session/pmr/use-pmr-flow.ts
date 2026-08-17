/**
 * The four beats of the muscle relaxation step, and the back button's opinion
 * about them.
 *
 * A hook rather than a component wrapping the phases, for the reason
 * `use-somatic-flow.ts` gives at length: the back button is drawn by
 * `SessionScreen` at the top of `/one-more` and has to know which beat is
 * showing, or every back tap drops the user out of the whole step and past the
 * list they were standing on two taps ago.
 *
 * ## The beats
 *
 *   picking  → the four routines
 *   reading  → what one of them is, what is known about it, and a Begin button
 *   running  → the routine, one instruction at a time
 *   settling → the moment after, which is the point of the exercise
 *
 * Every path from `running` lands on `settling`, including the one where the
 * user stopped early. That is load-bearing here rather than tidy: the thing
 * this technique is actually teaching is the *difference* between a held muscle
 * and a loose one, and the only moment that difference is available to be
 * noticed is the one right after. A routine that ended by returning to a menu
 * would be a routine with its last step cut off.
 *
 * ## `run`
 *
 * A counter, and the key the runner is mounted under. "Run it again" goes back
 * to `running` with the same routine, and a runner that merely had its props
 * re-set would have to unpick a finished step machine. Bumping the key throws
 * the old one away. Same device, same reason, as the somatic and breath flows.
 */

import { useCallback, useMemo, useState } from 'react';

import { findRoutine, type PmrRoutine, type PmrRoutineId } from '@/content/pmr';

export type PmrPhase = 'picking' | 'reading' | 'running' | 'settling';

export interface PmrFlow {
  phase: PmrPhase;
  /** Null exactly while `phase` is `picking`. */
  routine: PmrRoutine | null;
  /** Remount key for the runner. See above. */
  run: number;
  pick: (id: PmrRoutineId) => void;
  begin: () => void;
  /** The user tapped "That's enough" part way through. */
  stop: () => void;
  /** The last step finished. Same destination as `stop`, on purpose. */
  complete: () => void;
  /** "Run it again", from the settle screen. */
  again: () => void;
  /** Back to the four, from anywhere. */
  toList: () => void;
  /** What the frame's back button does from the current phase. */
  back: () => void;
}

interface State {
  phase: PmrPhase;
  id: PmrRoutineId | null;
  run: number;
}

const IDLE: State = { phase: 'picking', id: null, run: 0 };

/**
 * @param onExit what back does from the routine list — the one beat with
 * nothing of ours behind it. `/one-more` passes its own "back to the five", so
 * backing out lands on the offer rather than on the mood rating two screens up.
 */
export function usePmrFlow(onExit: () => void): PmrFlow {
  const [state, setState] = useState<State>(IDLE);

  const pick = useCallback((id: PmrRoutineId) => {
    setState((current) => ({ ...current, phase: 'reading', id }));
  }, []);

  const start = useCallback(() => {
    setState((current) => {
      // No routine means no steps to walk, so this stays where it is rather
      // than mounting a runner with an empty script. Unreachable while the only
      // writer of `id` is a card on the list.
      if (current.id === null || !findRoutine(current.id)) return current;
      return { ...current, phase: 'running', run: current.run + 1 };
    });
  }, []);

  const settle = useCallback(() => {
    setState((current) => ({ ...current, phase: 'settling' }));
  }, []);

  /**
   * Clears the choice as well as the phase, so coming back to the list is
   * coming back to a list rather than to a list with something still selected
   * underneath it. Same call `chooseOneMore(null)` makes one level up.
   */
  const toList = useCallback(() => setState(IDLE), []);

  const back = useCallback(() => {
    // Reading, running and settling all sit on top of the list, so all three go
    // there. Only the list itself has nothing of ours behind it.
    if (state.phase === 'picking') onExit();
    else setState(IDLE);
  }, [state.phase, onExit]);

  const routine = state.id === null ? null : (findRoutine(state.id) ?? null);

  return useMemo(
    () => ({
      phase: state.phase,
      routine,
      run: state.run,
      pick,
      begin: start,
      stop: settle,
      complete: settle,
      again: start,
      toList,
      back,
    }),
    [state.phase, state.run, routine, pick, start, settle, toList, back],
  );
}
