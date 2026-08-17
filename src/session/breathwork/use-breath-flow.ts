/**
 * The four beats of the paced-breathing step, and the back button's opinion
 * about them.
 *
 * A hook rather than a component wrapping the phases, for exactly the reason
 * `use-somatic-flow.ts` gives at length: the back button is drawn by
 * `SessionScreen` at the top of `/one-more` and has to know which beat is
 * showing, or every back tap drops the user out of the whole step and past the
 * list of patterns they were standing on two taps ago.
 *
 * ## The beats
 *
 *   picking   → the four patterns
 *   reading   → what one of them is, what is known about it, and a Begin button
 *   breathing → the circle
 *   settling  → the few seconds after, which is part of the exercise
 *
 * Every path from `breathing` lands on `settling`, including the one where the
 * user stopped early. That is not symmetry for its own sake: the instruction
 * after a paced breath is to stop counting and let the breath go back to
 * whatever it wants, and somebody who stopped because the hold started to feel
 * wrong is the person who most needs to be told that rather than dumped back
 * onto a menu.
 *
 * ## `run`
 *
 * A counter, and the key the pacer is mounted under. "Another round of that"
 * from the settle screen goes back to `breathing` with the same pattern, and a
 * pacer that merely had its props re-set would have to unpick a finished phase
 * machine and restart it. Bumping the key throws the old one away, which is
 * what is actually being asked for. Same device, same reason, as somatic's.
 */

import { useCallback, useMemo, useState } from 'react';

import { findPattern, type BreathPattern, type BreathPatternId } from '@/content/breathwork';

export type BreathPhaseName = 'picking' | 'reading' | 'breathing' | 'settling';

export interface BreathFlow {
  phase: BreathPhaseName;
  /** Null exactly while `phase` is `picking`. */
  pattern: BreathPattern | null;
  /** Remount key for the pacer. See above. */
  run: number;
  pick: (id: BreathPatternId) => void;
  begin: () => void;
  /** The user tapped "That's enough" mid-pattern. */
  stop: () => void;
  /** The last round finished. Same destination as `stop`, on purpose. */
  complete: () => void;
  /** "Another round of that", from the settle screen. */
  again: () => void;
  /** Back to the four, from anywhere. */
  toList: () => void;
  /** What the frame's back button does from the current phase. */
  back: () => void;
}

interface State {
  phase: BreathPhaseName;
  id: BreathPatternId | null;
  run: number;
}

const IDLE: State = { phase: 'picking', id: null, run: 0 };

/**
 * @param onExit what back does from the pattern list — the one beat with
 * nothing of ours behind it. `/one-more` passes its own "back to the five", so
 * backing out lands on the offer rather than on the mood rating two screens up.
 */
export function useBreathFlow(onExit: () => void): BreathFlow {
  const [state, setState] = useState<State>(IDLE);

  const pick = useCallback((id: BreathPatternId) => {
    setState((current) => ({ ...current, phase: 'reading', id }));
  }, []);

  const start = useCallback(() => {
    setState((current) => {
      // No pattern means nothing to pace, so this stays where it is rather than
      // mounting a pacer with an empty cycle. Unreachable while the only writer
      // of `id` is a card on the list.
      if (current.id === null || !findPattern(current.id)) return current;
      return { ...current, phase: 'breathing', run: current.run + 1 };
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
    // Reading, breathing and settling all sit on top of the list, so all three
    // go there. Only the list itself has nothing of ours behind it.
    if (state.phase === 'picking') onExit();
    else setState(IDLE);
  }, [state.phase, onExit]);

  const pattern = state.id === null ? null : (findPattern(state.id) ?? null);

  return useMemo(
    () => ({
      phase: state.phase,
      pattern,
      run: state.run,
      pick,
      begin: start,
      stop: settle,
      complete: settle,
      again: start,
      toList,
      back,
    }),
    [state.phase, state.run, pattern, pick, start, settle, toList, back],
  );
}
