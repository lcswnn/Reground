/**
 * Recording a session: the two lines that turn session state into a queued row.
 *
 * Everything interesting is next door. `row.ts` decides what a row contains and
 * when there is one at all; `queue.ts` gets it to the server eventually. This
 * file exists to keep those two apart from the impure bits — the app's version
 * string, which needs Expo, and the consent check, which needs the storage shim.
 *
 * ## When it is called
 *
 * Twice, from `session-context.tsx`, and both are the same row:
 *
 *  1. The moment the second rating is given. That is the pair the whole thing
 *     exists for, and it is the last point a session is guaranteed to reach with
 *     anything to measure — plenty of people put the phone down there, which is
 *     what the app told them to do.
 *  2. When the session is cleared on the way to the dead end, which adds the one
 *     thing that happens after the rating: what they picked off the list.
 *
 * The compound primary key on `app_sessions` makes the second write an update of
 * the first rather than a second row.
 */

import { isSharing } from '@/lib/analytics/consent';
import { appVersion } from '@/lib/analytics/install';
import { enqueue } from '@/lib/analytics/queue';
import { sessionRow } from '@/lib/analytics/row';
import type { SessionState } from '@/session/session-context';

export type { SessionRow } from '@/lib/analytics/row';

/**
 * Records a session, if it is one and if the user has left sharing on.
 *
 * Returns nothing and cannot fail. Everything past this point is the queue's
 * problem — see `enqueue`, which writes the row down synchronously and then
 * tries the network without anybody waiting on it.
 */
export function recordSession(state: SessionState): void {
  // The consent gate, and this is the place it belongs: the queue is durable, so
  // a row that gets past here survives relaunches. Nothing a user has declined
  // should ever be written down, not even briefly.
  if (!isSharing()) return;

  const row = sessionRow(state, new Date(), appVersion());
  if (!row) return;

  enqueue(row);
}
