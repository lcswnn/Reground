/**
 * The back button's behaviour, in one place.
 *
 * A screen says which route it is and gets back either a handler or nothing —
 * nothing meaning "this screen has no way back", which is the door and the dead
 * end. See `previousRoute` for where each one goes and why.
 *
 * `replace`, not `push`, like every other move in the session: going back is
 * still a move to a route rather than a stack pop, and leaving a history behind
 * would let the OS gesture walk into screens this flow never wants re-entered.
 */

import { useCallback } from 'react';
import { useRouter } from 'expo-router';

import { previousRoute, type SessionRoute } from '@/session/routing';
import { useSessionFlow } from '@/session/session-context';

export function useSessionBack(route: SessionRoute): (() => void) | undefined {
  const router = useRouter();
  const { categoryGroup, gameKind, topic, moodBefore, oneMore } = useSessionFlow();

  const target = previousRoute(route, {
    group: categoryGroup,
    hasTopic: topic !== null,
    gameKind,
    moodBefore,
    oneMore,
  });

  const back = useCallback(() => {
    if (target) router.replace(target);
  }, [router, target]);

  return target ? back : undefined;
}
