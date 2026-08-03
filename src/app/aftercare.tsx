/**
 * The one extra step, shown only when the second rating didn't move.
 *
 * Which of the two appears is decided by `aftercareKind` from the category
 * group. The user is not asked to choose between them — being handed a menu is
 * the last thing someone wants after telling us nothing has helped yet.
 */

import { useRouter } from 'expo-router';

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

  if (!active || !categoryGroup) return null;

  const close = () => router.replace('/close');

  return (
    <SessionScreen>
      {aftercareKind(categoryGroup) === 'grounding' ? (
        <GroundingSequence onDone={close} />
      ) : (
        <ParkWorry onDone={close} />
      )}
    </SessionScreen>
  );
}
