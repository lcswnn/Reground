/**
 * The muscle relaxation step, assembled: which of the four beats is on screen.
 *
 * Nothing but the switch. The state and the back button's opinion about it live
 * in `use-pmr-flow.ts`, which `/one-more` calls directly because the frame up
 * there is what draws the back button — see the note at the top of that file.
 *
 * The runner is keyed on `flow.run` so that "run it again" gets a genuinely new
 * script rather than a finished one being talked into starting over.
 *
 * `routine` is null only while picking, and the null branch below is the one
 * place that is enforced rather than assumed — an id with no routine behind it
 * folds back to the list, the same fallback `/one-more` uses for a stale
 * `oneMore`. Unreachable while the only writer is a card on that list, and the
 * right answer anyway: an option that no longer exists should put the user in
 * front of the ones that do.
 */

import { useEffect } from 'react';

import { PmrIntro } from '@/session/pmr/pmr-intro';
import { PmrPicker } from '@/session/pmr/pmr-picker';
import { PmrRunner } from '@/session/pmr/pmr-runner';
import { PmrSettle } from '@/session/pmr/pmr-settle';
import type { PmrFlow } from '@/session/pmr/use-pmr-flow';

interface PmrFlowViewProps {
  flow: PmrFlow;
  /** Out of the session — the closing screen. */
  onDone: () => void;
}

export function PmrFlowView({ flow, onDone }: PmrFlowViewProps) {
  const { phase, routine, toList } = flow;

  // The fold-back described above. In an effect rather than during render
  // because it is a state change, and the render below already draws the list
  // for a null routine — so the user sees the right screen either way and this
  // only makes the state agree with it.
  useEffect(() => {
    if (phase !== 'picking' && routine === null) toList();
  }, [phase, routine, toList]);

  if (phase === 'picking' || routine === null) {
    return <PmrPicker onPick={flow.pick} />;
  }

  if (phase === 'reading') {
    return <PmrIntro routine={routine} onBegin={flow.begin} onAnother={flow.toList} />;
  }

  if (phase === 'running') {
    return (
      <PmrRunner
        key={flow.run}
        routine={routine}
        onDone={flow.complete}
        onStop={flow.stop}
      />
    );
  }

  return <PmrSettle onDone={onDone} onAgain={flow.again} onAnother={flow.toList} />;
}
