/**
 * The one extra step, shown only when the second rating didn't move.
 *
 * Which of the two appears is decided by `aftercareKind` from the category
 * group. The user is not asked to choose between them — being handed a menu is
 * the last thing someone wants after telling us nothing has helped yet.
 *
 * The grounding branch runs in two phases on this one route: what the method is
 * and a Start button, then the count-down itself. Both ends differ too —
 * grounding goes on to a check-in, worry-postponement closes.
 */

import { useState } from 'react';
import { useRouter } from 'expo-router';

import { GroundingIntro } from '@/session/aftercare/grounding-intro';
import { GroundingSequence } from '@/session/aftercare/grounding-sequence';
import { ParkWorry } from '@/session/aftercare/park-worry';
import { SessionScreen } from '@/session/ui/session-screen';
import { aftercareKind } from '@/session/routing';
import { useSessionFlow } from '@/session/session-context';
import { useSessionGuard } from '@/session/use-session-guard';

export default function AftercareScreen() {
  const router = useRouter();
  const active = useSessionGuard();
  const { categoryGroup } = useSessionFlow();

  /**
   * Which half of the grounding branch is on screen. Local and not a route, so
   * there is no way to land on the prompts without having read what they are —
   * and nothing for the session state to remember afterwards.
   */
  const [started, setStarted] = useState(false);

  if (!active || !categoryGroup) return null;

  const close = () => router.replace('/close');

  return (
    <SessionScreen>
      {aftercareKind(categoryGroup) === 'grounding' ? (
        started ? (
          // The count-down ends on a question rather than on the door: see
          // `check-in.tsx`. `park-worry` closes directly — it ends on an
          // agreement about later, and there is nothing to have helped yet.
          <GroundingSequence onDone={() => router.replace('/check-in')} />
        ) : (
          <GroundingIntro onStart={() => setStarted(true)} />
        )
      ) : (
        <ParkWorry onDone={close} />
      )}
    </SessionScreen>
  );
}
