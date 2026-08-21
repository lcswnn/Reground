/**
 * The one thing this folder does at launch, and the two rules about when.
 *
 * Called once from `app/_layout.tsx`, after the fonts have settled, and it does
 * exactly two things — neither of them awaited, neither of them able to fail
 * loudly:
 *
 *  1. **Empties the queue.** A session recorded on a phone with no signal is
 *     still on that phone. This is what eventually sends it, and it is the whole
 *     reason `queue.ts` is durable rather than a variable.
 *  2. **Says hello.** Upserts the install row with a fresh `last_seen_at`,
 *     which is the only way to tell an install that stopped opening the app
 *     from one that never existed.
 *
 * ## Why the hello waits for acknowledgement
 *
 * `ensureInstall` is what creates the anonymous auth user, and creating one is
 * the first moment this install exists anywhere but on the phone. Doing that on
 * the very first launch — before the panel on the door has said a word — would
 * mean somebody who reads it and immediately turns the switch off had already
 * been counted. So the hello is skipped until `acknowledged`, and the first
 * launch registers nothing.
 *
 * Nothing is lost by waiting. The flush still runs, and it calls `ensureInstall`
 * itself when it has rows — a session cannot be recorded before the panel has
 * been answered anyway, because the panel is on the door and the session starts
 * after it.
 */

import { isSharing, hasAcknowledged } from '@/lib/analytics/consent';
import { ensureInstall } from '@/lib/analytics/install';
import { flush } from '@/lib/analytics/queue';

let started = false;

export function startAnalytics(): void {
  // Guarded because a fast-refresh in development re-runs the effect that calls
  // it, and two hellos in one launch is two requests for one fact.
  if (started) return;
  started = true;

  if (!isSharing()) return;

  void flush();

  if (!hasAcknowledged()) return;

  void ensureInstall();
}
