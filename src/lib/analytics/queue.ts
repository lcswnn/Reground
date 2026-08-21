/**
 * A short, durable list of session rows that have not made it to the server yet.
 *
 * Every recorded session goes through here rather than straight out, and there
 * is one reason for that: this app is opened on a phone by somebody having a bad
 * half-hour, which is not a state that correlates with good reception. A write
 * that fires once and loses the row on a timeout would drop exactly the sessions
 * a report most wants — the ones at 3am, on a train, in a stairwell.
 *
 * It is a queue and not a database. Four rules keep it that way:
 *
 *  1. **It is capped.** `MAX` rows, oldest dropped first. Somebody who uses the
 *     app offline for a fortnight loses the front of the fortnight rather than
 *     accumulating a file. Nothing in here is worth unbounded storage.
 *  2. **It is keyed by `startedAt`.** A session is written twice — once when the
 *     second rating lands, once when it closes and the last choice is known —
 *     and offline that has to leave one entry, not two. That rule is
 *     `mergeQueue`, and it lives in `row.ts` with a test on it.
 *  3. **It never blocks.** Enqueuing is a synchronous `localStorage` write;
 *     flushing is fire-and-forget and swallows everything.
 *  4. **It holds no id.** Rows are stamped with the install id at flush time,
 *     because a row can be queued before the anonymous sign-in has finished, or
 *     on a launch where it never finishes at all.
 *
 * It also asks no questions about consent, which is worth saying because the
 * obvious place for that check is right here. It is in the two callers instead —
 * `recordSession` and `startAnalytics` — so that `consent.tsx` can import
 * `clearQueue` without the two files importing each other.
 *
 * Stored under its own key rather than in the session's SQLite tables, for the
 * reason the preference files give: it is a blocking read of one small string,
 * and the alternative is a schema.
 */

import 'expo-sqlite/localStorage/install';

import { supabase } from '@/lib/supabase';
import { ensureInstall } from '@/lib/analytics/install';
import { mergeQueue, type SessionRow } from '@/lib/analytics/row';

const STORAGE_KEY = 'humanitas.share.queue';

/**
 * Twelve sessions is more than anybody does between two moments of signal, and
 * the payload is small enough that flushing all of them is one request.
 */
const MAX = 12;

function read(): SessionRow[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);

    // A hand-edited or half-written value is thrown away rather than reasoned
    // about. There is nothing in here worth recovering carefully.
    return Array.isArray(parsed) ? (parsed as SessionRow[]) : [];
  } catch {
    return [];
  }
}

function write(rows: readonly SessionRow[]): void {
  try {
    if (rows.length === 0) localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
  } catch {
    // Nothing to do and nowhere to say it. The rows are lost, which is the
    // outcome this whole file exists to make rare rather than impossible.
  }
}

/** Drops everything pending. What the opt-out switch calls before it erases. */
export function clearQueue(): void {
  write([]);
}

/**
 * Puts a row in the queue and tries to empty it.
 *
 * Synchronous up to the point the row is safely written down, then hands off.
 * Callers are session callbacks and must not be made to wait on a network.
 *
 * Assumes the caller has already asked whether the user consents to any of this.
 * `recordSession` is the only one, and it does.
 */
export function enqueue(row: SessionRow): void {
  write(mergeQueue(read(), row, MAX));

  void flush();
}

/**
 * One request for everything pending, or nothing at all.
 *
 * Called on launch as well as after each enqueue — a phone that was offline
 * yesterday sends yesterday's sessions on the next cold start, which is the
 * whole point of the queue.
 *
 * There is nothing to gate on here beyond the queue being empty, which is what
 * turning the switch off leaves behind: `setSharing(false)` calls `clearQueue`
 * before it deletes anything on the server, so a flush after an opt-out finds
 * nothing to send.
 */
export async function flush(): Promise<void> {
  const rows = read();
  if (rows.length === 0) return;

  const client = supabase();
  if (!client) return;

  const installId = await ensureInstall();
  if (!installId) return;

  const { error } = await client
    .from('app_sessions')
    .upsert(
      rows.map((row) => ({ ...row, install_id: installId })),
      // The primary key, and the reason it is a compound one — see the schema.
      // An update rather than an ignore: the second write for a session is the
      // one that knows how it ended.
      { onConflict: 'install_id,started_at' },
    );

  if (error) return;

  /**
   * Re-read before clearing, and remove only what was actually sent. A session
   * can end while this request is in flight — `enqueue` is synchronous and does
   * not know about it — and writing `[]` here would throw that row away.
   */
  const sent = new Set(rows.map((row) => row.started_at));
  write(read().filter((row) => !sent.has(row.started_at)));
}
