/**
 * The four beats of the somatic step, and the back button's opinion about them.
 *
 * A hook rather than a component wrapping the phases, for one reason: the back
 * button is drawn by `SessionScreen` at the top of `/one-more`, and it has to
 * know which beat is showing. A component that owned this state internally
 * would leave the button pointing at whatever the screen underneath it thought
 * — which in practice means every back tap dropping the user out of the whole
 * somatic step, past the movement list they were standing on two taps ago.
 * `/one-more` makes exactly this argument about its own list; see the note on
 * its `SessionScreen`.
 *
 * So the phase lives here, `back` is derived from it, and `one-more.tsx` hands
 * that straight to the frame.
 *
 * ## The beats
 *
 *   picking  → the six movements
 *   reading  → what one of them is and how to do it, and a Begin button
 *   moving   → the clock
 *   settling → the few seconds after, which is part of the exercise
 *
 * Every path from `moving` lands on `settling`, including the one where the
 * user stopped it early. Finishing on the calm rather than on whatever got
 * stirred up is one of the instructions, not a nicety — and someone who stopped
 * because it started to feel wrong is the person who most needs the beat.
 *
 * ## `run`
 *
 * A counter, and the key the timer is mounted under. "A bit longer" from the
 * settle screen goes back to `moving` with a fresh duration, and a timer that
 * merely had its props changed would have to unpick its own countdown mid-run.
 * Bumping the key throws the old one away and starts a new one, which is what
 * is actually being asked for.
 */

import { useCallback, useMemo, useState } from 'react';

import { SOMATIC } from '@/config/session';
import { findMovement, type SomaticId, type SomaticMovement } from '@/content/somatic';

export type SomaticPhase = 'picking' | 'reading' | 'moving' | 'settling';

export interface SomaticFlow {
  phase: SomaticPhase;
  /** Null exactly while `phase` is `picking`. */
  movement: SomaticMovement | null;
  /** How long the current run is for — the movement's own length, or an extension. */
  runMs: number;
  /** Remount key for the timer. See above. */
  run: number;
  pick: (id: SomaticId) => void;
  begin: () => void;
  /** The user tapped "That's enough" while it was running. */
  stop: () => void;
  /** The clock reached zero. Same destination as `stop`, on purpose. */
  complete: () => void;
  /** "A bit longer", from the settle screen. */
  extend: () => void;
  /** Back to the six, from anywhere. */
  toList: () => void;
  /** What the frame's back button does from the current phase. */
  back: () => void;
  /** Called when the user leaves the somatic option entirely. */
  reset: () => void;
}

interface State {
  phase: SomaticPhase;
  id: SomaticId | null;
  runMs: number;
  run: number;
}

const IDLE: State = { phase: 'picking', id: null, runMs: 0, run: 0 };

/**
 * @param onExit what back does from the movement list — which is the one beat
 * with nothing of ours behind it. `/one-more` passes its own "back to the five"
 * here, so backing out of the somatic step lands on the offer rather than on
 * the mood rating two screens up.
 */
export function useSomaticFlow(onExit: () => void): SomaticFlow {
  const [state, setState] = useState<State>(IDLE);

  const pick = useCallback((id: SomaticId) => {
    setState((current) => ({ ...current, phase: 'reading', id }));
  }, []);

  const begin = useCallback(() => {
    setState((current) => {
      const movement = current.id === null ? undefined : findMovement(current.id);
      // No movement means no duration to run for, so this stays where it is
      // rather than starting a zero-length timer. Unreachable while the only
      // writer of `id` is a card on the list.
      if (!movement) return current;

      return {
        ...current,
        phase: 'moving',
        runMs: movement.seconds * 1_000,
        run: current.run + 1,
      };
    });
  }, []);

  const settle = useCallback(() => {
    setState((current) => ({ ...current, phase: 'settling' }));
  }, []);

  const extend = useCallback(() => {
    setState((current) => ({
      ...current,
      phase: 'moving',
      runMs: SOMATIC.extendMs,
      run: current.run + 1,
    }));
  }, []);

  /**
   * Clears the choice as well as the phase, so coming back to the list is
   * coming back to a list rather than to a list with something still selected
   * underneath it. Same call `chooseOneMore(null)` makes one level up.
   */
  const toList = useCallback(() => setState(IDLE), []);

  const reset = useCallback(() => setState(IDLE), []);

  const back = useCallback(() => {
    // Reading, moving and settling all sit on top of the list, so all three go
    // there. Only the list itself has nothing of ours behind it.
    if (state.phase === 'picking') onExit();
    else setState(IDLE);
  }, [state.phase, onExit]);

  const movement = state.id === null ? null : (findMovement(state.id) ?? null);

  return useMemo(
    () => ({
      phase: state.phase,
      movement,
      runMs: state.runMs,
      run: state.run,
      pick,
      begin,
      stop: settle,
      complete: settle,
      extend,
      toList,
      back,
      reset,
    }),
    [
      state.phase,
      state.runMs,
      state.run,
      movement,
      pick,
      begin,
      settle,
      extend,
      toList,
      back,
      reset,
    ],
  );
}
