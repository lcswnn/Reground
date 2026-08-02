import 'expo-sqlite/localStorage/install';

import { readScoped, writeScoped } from '@/lib/user-scope';

/**
 * How you felt when you opened the app.
 *
 * Recorded before anything else happens — the point of asking on the way in
 * rather than on the way out is that the answer is about the state you arrived
 * in, which is the thing this app exists to respond to. Nothing reads the
 * history yet; it is stored so that "did this help?" is answerable later
 * without having to have started collecting months from now.
 *
 * Scoped per user and kept on the device, matching `lib/streak`. A mood log is
 * about as personal as this app gets, and there is no product reason for it to
 * leave the phone until something actually needs it server-side.
 */

const STORAGE_KEY = 'mellova.check-ins';

/** 1 is bad, 5 is good. Deliberately odd-numbered, so "neither" is sayable. */
export type Mood = 1 | 2 | 3 | 4 | 5;

export interface CheckIn {
  /** ISO timestamp of the moment the user tapped. */
  at: string;
  mood: Mood;
}

/**
 * The scale, in order.
 *
 * Worded rather than numbered in the UI. "2 out of 5" invites you to compute an
 * answer; "Low" you either recognise or you don't, which is the whole ask.
 */
export const MOODS: { value: Mood; label: string }[] = [
  { value: 1, label: 'Rough' },
  { value: 2, label: 'Low' },
  { value: 3, label: 'Okay' },
  { value: 4, label: 'Good' },
  { value: 5, label: 'Great' },
];

/**
 * How many entries to keep.
 *
 * Bounded because this writes on every cold launch and `localStorage` here is a
 * SQLite row read synchronously at startup — an unbounded log would grow into
 * that read forever. A few months of history is more than anything planned
 * needs, and the oldest entries are the least interesting.
 */
export const MAX_CHECK_INS = 90;

/**
 * The append rule, separated from storage so it can be tested.
 *
 * Oldest-first ordering, newest at the end, trimmed from the front. Callers
 * that want "most recent" take the last element.
 */
export function appendCheckIn(
  history: CheckIn[],
  entry: CheckIn,
  limit = MAX_CHECK_INS,
): CheckIn[] {
  const next = [...history, entry];
  return next.length > limit ? next.slice(next.length - limit) : next;
}

/**
 * Whatever is on disk, or an empty log.
 *
 * Tolerant of garbage on purpose: a malformed or half-written value is not a
 * reason to fail the launch of an app somebody opened because they felt bad.
 * Anything unparseable is treated as no history, and the next write replaces it.
 */
export function readCheckIns(): CheckIn[] {
  try {
    const raw = readScoped(STORAGE_KEY);
    if (!raw) return [];

    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed.filter(isCheckIn);
  } catch {
    return [];
  }
}

/** Appends one entry and persists. Returns the log as written. */
export function recordCheckIn(mood: Mood, at = new Date().toISOString()): CheckIn[] {
  const next = appendCheckIn(readCheckIns(), { at, mood });
  try {
    writeScoped(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Storage full or unavailable. The check-in still happened as far as this
    // session is concerned; losing the log is not worth interrupting the flow.
  }
  return next;
}

function isCheckIn(value: unknown): value is CheckIn {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.at === 'string' &&
    typeof candidate.mood === 'number' &&
    Number.isInteger(candidate.mood) &&
    candidate.mood >= 1 &&
    candidate.mood <= 5
  );
}
