/**
 * Sends anyone who lands mid-flow without a session back to the start.
 *
 * Reachable in practice through a deep link, and through a fast refresh in
 * development — the provider's state is in memory, so a reload leaves the
 * route pointing at, say, the calibration screen with no category to render.
 */

import { useEffect } from 'react';
import { useRouter } from 'expo-router';

import { useSessionFlow } from '@/session/session-context';

interface GuardOptions {
  /**
   * Off for the screen that collects the rating in the first place — it only
   * needs a category to have been chosen.
   */
  requireMood?: boolean;
}

export function useSessionGuard({ requireMood = true }: GuardOptions = {}): boolean {
  const router = useRouter();
  const { category, moodBefore } = useSessionFlow();
  const active = category !== null && (!requireMood || moodBefore !== null);

  useEffect(() => {
    if (!active) router.replace('/');
  }, [active, router]);

  return active;
}
