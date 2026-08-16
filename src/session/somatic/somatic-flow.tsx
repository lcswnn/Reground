/**
 * The somatic step, assembled: which of the four beats is on screen.
 *
 * Nothing but the switch. The state and the back button's opinion about it live
 * in `use-somatic-flow.ts`, which `/one-more` calls directly because the frame
 * up there is what draws the back button — see the note at the top of that file
 * for why the two are split.
 *
 * The timer is keyed on `flow.run` so that "a bit longer" gets a genuinely new
 * countdown rather than a running one being talked into a different deadline.
 *
 * `movement` is null only while picking, and the null branch below is the one
 * place that is enforced rather than assumed — an id with no movement behind it
 * folds back to the list, the same fallback `/one-more` uses for a stale
 * `oneMore`. Unreachable while the only writer is a card on that list, and the
 * right answer anyway: an option that no longer exists should put the user in
 * front of the ones that do.
 */

import { useEffect } from 'react';

import type { SomaticFlow } from '@/session/somatic/use-somatic-flow';
import { SomaticIntro } from '@/session/somatic/somatic-intro';
import { SomaticPicker } from '@/session/somatic/somatic-picker';
import { SomaticSettle } from '@/session/somatic/somatic-settle';
import { SomaticTimer } from '@/session/somatic/somatic-timer';

interface SomaticFlowViewProps {
  flow: SomaticFlow;
  /** Out of the session — the closing screen. */
  onDone: () => void;
}

export function SomaticFlowView({ flow, onDone }: SomaticFlowViewProps) {
  const { phase, movement, toList } = flow;

  // The fold-back described above. In an effect rather than during render
  // because it is a state change, and the render below already draws the list
  // for a null movement — so the user sees the right screen either way and this
  // only makes the state agree with it.
  useEffect(() => {
    if (phase !== 'picking' && movement === null) toList();
  }, [phase, movement, toList]);

  if (phase === 'picking' || movement === null) {
    return <SomaticPicker onPick={flow.pick} />;
  }

  if (phase === 'reading') {
    return (
      <SomaticIntro movement={movement} onBegin={flow.begin} onAnother={flow.toList} />
    );
  }

  if (phase === 'moving') {
    return (
      <SomaticTimer
        key={flow.run}
        movement={movement}
        runMs={flow.runMs}
        onComplete={flow.complete}
        onStop={flow.stop}
      />
    );
  }

  return (
    <SomaticSettle
      onDone={onDone}
      onLonger={flow.extend}
      onAnother={flow.toList}
    />
  );
}
