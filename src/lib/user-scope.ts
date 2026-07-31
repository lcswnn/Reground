import 'expo-sqlite/localStorage/install';

/**
 * Which account the device's local stores belong to.
 *
 * The app keeps several things in `localStorage` — the weighting, the day count,
 * today's vote — because they must render on the first frame and work with no
 * network. That was right, and it was also silently device-wide: sign out, sign
 * in as somebody else, and you inherited the previous account's weighting, their
 * streak, and their answer to today's card.
 *
 * The weighting case was worse than a display bug. `useWeightingSync` reconciles
 * on sign-in, `resolveConflict` returns `'local'` whenever the server has
 * nothing, and a new account has nothing — so the previous reader's weighting
 * was not merely shown to the next one, it was uploaded into their profile row.
 *
 * So local keys are namespaced by user id. Not every key: see the note on what
 * stays device-wide at the bottom of this file.
 *
 * ## Ordering
 *
 * `setScopeUser` is called from the auth callbacks in `session.tsx`, in the same
 * tick the session lands and before React re-renders. Stores drop their cached
 * copy on change and re-read from the new namespace, so a screen that was
 * showing the previous account's number re-renders with the right one rather
 * than keeping a stale value until relaunch.
 */

let currentUserId: string | null = null;
const listeners = new Set<() => void>();

/**
 * The namespace used before anybody signs in.
 *
 * A real bucket rather than a bypass: a signed-out reader can still set a
 * weighting, and it should persist for them without landing in the next account
 * to sign in on this device.
 */
const SIGNED_OUT = 'anon';

export function getScopeUser(): string | null {
  return currentUserId;
}

/** Called from the auth state handler. A no-op when the user has not changed. */
export function setScopeUser(userId: string | null): void {
  if (userId === currentUserId) return;
  currentUserId = userId;
  for (const listener of listeners) listener();
}

/** Stores subscribe so they can drop cached state when the account changes. */
export function onScopeChange(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** `humanitas.daily-streak` → `humanitas.daily-streak::<user id>` */
export function scopedKey(base: string): string {
  return `${base}::${currentUserId ?? SIGNED_OUT}`;
}

/**
 * Reads a namespaced value, adopting a pre-namespacing one exactly once.
 *
 * Without the fallback, shipping this would look like data loss: every existing
 * install has its weighting and day count under the bare key, and a scoped read
 * would find nothing and quietly reset both.
 *
 * The adoption is deliberately one-shot and only while signed in. The legacy
 * value is removed as it is claimed, so the first account to sign in after the
 * upgrade inherits it and no second account can — which is the safe direction to
 * be wrong in. A signed-out reader can see it but does not consume it, so the
 * value is still there for whoever signs in.
 */
export function readScoped(base: string): string | null {
  const scoped = localStorage.getItem(scopedKey(base));
  if (scoped !== null) return scoped;

  const legacy = localStorage.getItem(base);
  if (legacy === null) return null;

  // Nobody to give it to yet. Readable, but left in place.
  if (!currentUserId) return legacy;

  localStorage.setItem(scopedKey(base), legacy);
  localStorage.removeItem(base);
  return legacy;
}

export function writeScoped(base: string, value: string): void {
  localStorage.setItem(scopedKey(base), value);
}

/**
 * ## What deliberately stays device-wide
 *
 * `humanitas.appearance` — light or dark is a property of the screen you are
 * looking at, not of who is logged into it.
 *
 * `humanitas.seen-observations.v2` — answers "has this device already shown you
 * this number", which is a fact about the device having displayed something.
 *
 * `humanitas.daily-reminder` — the notification permission it depends on is
 * granted to the app on the phone, not to an account, and there is exactly one
 * OS schedule to be in or out of. Scoping the preference behind a global side
 * effect would create more inconsistency than it removed: `resyncReminder` runs
 * at launch before the session resolves, and a per-user preference read at that
 * moment would cancel the reminder every cold start.
 */
