/**
 * The paced-breathing step, assembled: which of the four beats is on screen.
 *
 * Nothing but the switch. The state and the back button's opinion about it live
 * in `use-breath-flow.ts`, which `/one-more` calls directly because the frame up
 * there is what draws the back button — see the note at the top of that file.
 *
 * The pacer is keyed on `flow.run` so that "another round of that" gets a
 * genuinely new phase machine rather than a finished one being talked into
 * starting again.
 *
 * `pattern` is null only while picking, and the null branch below is the one
 * place that is enforced rather than assumed — an id with no pattern behind it
 * folds back to the list, the same fallback `/one-more` uses for a stale
 * `oneMore`. Unreachable while the only writer is a card on that list, and the
 * right answer anyway: an option that no longer exists should put the user in
 * front of the ones that do.
 */

import { useEffect } from 'react';

import { BreathIntro } from '@/session/breathwork/breath-intro';
import { BreathPacer } from '@/session/breathwork/breath-pacer';
import { BreathPicker } from '@/session/breathwork/breath-picker';
import { BreathSettle } from '@/session/breathwork/breath-settle';
import type { BreathFlow } from '@/session/breathwork/use-breath-flow';

interface BreathFlowViewProps {
  flow: BreathFlow;
  /** Out of the session — the closing screen. */
  onDone: () => void;
}

export function BreathFlowView({ flow, onDone }: BreathFlowViewProps) {
  const { phase, pattern, toList } = flow;

  // The fold-back described above. In an effect rather than during render
  // because it is a state change, and the render below already draws the list
  // for a null pattern — so the user sees the right screen either way and this
  // only makes the state agree with it.
  useEffect(() => {
    if (phase !== 'picking' && pattern === null) toList();
  }, [phase, pattern, toList]);

  if (phase === 'picking' || pattern === null) {
    return <BreathPicker onPick={flow.pick} />;
  }

  if (phase === 'reading') {
    return <BreathIntro pattern={pattern} onBegin={flow.begin} onAnother={flow.toList} />;
  }

  if (phase === 'breathing') {
    return (
      <BreathPacer
        key={flow.run}
        pattern={pattern}
        onDone={flow.complete}
        onStop={flow.stop}
      />
    );
  }

  return (
    <BreathSettle onDone={onDone} onAgain={flow.again} onAnother={flow.toList} />
  );
}
