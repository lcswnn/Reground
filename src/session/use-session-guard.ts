/**
 * Sends anyone who lands mid-flow without a session back to the start.
 *
 * Reachable in practice through a deep link, and through a fast refresh in
 * development — the provider's state is in memory, so a reload leaves the
 * route pointing at, say, the calibration screen with no category to render.
 */

import { useEffect } from 'react';
import { useRouter } from 'expo-router';

import { measuresMood } from '@/session/routing';
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
  /**
   * A rating is only missing if the session was ever going to take one.
   *
   * "No anxiety" sessions never visit the rating screens — see `measuresMood` —
   * so every screen after the first question would otherwise fail this guard
   * and bounce the user to the door on arrival. The category is still required:
   * that is the thing a reload actually loses, and it is what every screen
   * downstream is drawn from.
   */
  const rated = !requireMood || !measuresMood(category?.group ?? 'relax') || moodBefore !== null;
  const active = category !== null && rated;

  useEffect(() => {
    if (!active) router.replace('/');
  }, [active, router]);

  return active;
}
