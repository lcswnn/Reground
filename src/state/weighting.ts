import 'expo-sqlite/localStorage/install';

import { useCallback, useState, useSyncExternalStore } from 'react';

import { isDefaultWeighting, type CategoryWeights } from '@/lib/scoring';
import { getScopeUser, onScopeChange, readScoped, writeScoped } from '@/lib/user-scope';

/**
 * The reader's own category weighting.
 *
 * Device-local, and the local copy is authoritative. The weighting is a
 * statement about what one person cares about, it is tiny, and it must work on
 * a plane — none of which argues for a round trip. Mirrors `streak.ts` and
 * `fresh-data.ts`: a module-level store read synchronously through
 * `useSyncExternalStore`, backed by the SQLite `localStorage` shim, so the home
 * screen renders the right score on its first frame rather than flashing the
 * default and then correcting itself.
 *
 * ## Null is not the same as empty
 *
 * `null` means "untouched — use whatever the artifact says", and an explicit
 * `{}` would not mean the same thing. The distinction matters because the
 * defaults are not constants: they are derived from the artifact, which gains
 * and reweights metrics over time. Someone who never opened the weighting screen
 * should track those changes; someone who set their own weights should not have
 * them silently rewritten by a data-layer release.
 *
 * Once a reader saves, the *complete* set is written rather than only the
 * categories they touched — see `saveWeights` for why a partial record would
 * quietly drift out from under them. `resolveWeights` still fills gaps from the
 * artifact, which is what lets a category added by a later release arrive with a
 * sensible weight instead of a zero.
 */

const STORAGE_KEY = 'humanitas.category-weights';

export interface WeightingState {
  /** Null until the reader changes something. */
  weights: CategoryWeights | null;
  /** ISO timestamp of the last change, for the "customised" note. */
  updatedAt: string | null;
}

export const EMPTY_WEIGHTING: WeightingState = { weights: null, updatedAt: null };

/** Slider bounds. 0 means "this does not count toward my score". */
export const MIN_WEIGHT = 0;
export const MAX_WEIGHT = 100;

// --- Store -------------------------------------------------------------------

let state: WeightingState | null = null;
const listeners = new Set<() => void>();

/**
 * Drops the cached weighting when the account changes.
 *
 * Not merely a display concern. `useWeightingSync` reconciles on sign-in and
 * `resolveConflict` returns `'local'` whenever the server has nothing — so a
 * stale in-memory weighting from the previous reader would be pushed into the
 * new account's profile row and become theirs.
 */
onScopeChange(() => {
  state = null;
  for (const listener of listeners) listener();
});

function read(): WeightingState {
  if (state) return state;

  try {
    const raw = readScoped(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : null;

    if (parsed && typeof parsed === 'object') {
      const candidate = parsed as Partial<WeightingState>;
      // A payload from an older version, or a hand-edited one, must not be able
      // to put a NaN into the score. Anything non-finite is dropped rather than
      // trusted, and a weighting that loses every key falls back to defaults.
      const cleaned: CategoryWeights = {};
      if (candidate.weights && typeof candidate.weights === 'object') {
        for (const [key, value] of Object.entries(candidate.weights)) {
          if (typeof value === 'number' && Number.isFinite(value)) {
            cleaned[key] = Math.min(MAX_WEIGHT, Math.max(MIN_WEIGHT, value));
          }
        }
      }

      state = {
        weights: Object.keys(cleaned).length > 0 ? cleaned : null,
        updatedAt: typeof candidate.updatedAt === 'string' ? candidate.updatedAt : null,
      };
    } else {
      state = EMPTY_WEIGHTING;
    }
  } catch {
    // Corrupt JSON, or storage unavailable on web. Losing a weighting is bad;
    // failing a render is worse.
    state = EMPTY_WEIGHTING;
  }

  return state;
}

function write(next: WeightingState): void {
  state = next;

  try {
    writeScoped(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // The session's state is correct even though it will not survive relaunch.
  }

  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getWeightingState(): WeightingState {
  return read();
}

/**
 * Commits a complete weighting.
 *
 * One write for the whole set rather than one per category, because the storage
 * shim is synchronous SQLite: saving on every slider move meant a disk write per
 * touch event, which is what made dragging stutter. The weighting screen now
 * holds a draft in React state and calls this once, when the reader saves.
 *
 * The full set is always stored, never a partial one. Storing only the keys
 * someone touched would leave the rest resolving from defaults, so a later
 * data-layer reweight would silently move sliders they had already seen and
 * implicitly accepted. Capturing everything makes "what I chose" mean it.
 */
export function saveWeights(weights: CategoryWeights, defaults: CategoryWeights): void {
  const merged: CategoryWeights = { ...defaults, ...weights };
  const cleaned: CategoryWeights = {};

  for (const [key, value] of Object.entries(merged)) {
    if (typeof value === 'number' && Number.isFinite(value)) {
      cleaned[key] = Math.min(MAX_WEIGHT, Math.max(MIN_WEIGHT, value));
    }
  }

  const updatedAt = new Date().toISOString();
  write({ weights: cleaned, updatedAt });
  pusher?.(cleaned, updatedAt);
}

/** Drops the reader's weighting entirely, returning the sliders to where they open. */
export function resetWeighting(): void {
  write({ ...EMPTY_WEIGHTING });
  pusher?.(null, null);
}

// --- Remote sync -------------------------------------------------------------

/**
 * Pushes a committed weighting to the server. Registered by `useWeightingSync`.
 *
 * A module-level hook rather than a parameter threaded through every caller,
 * because the alternative is passing a user id down into the slider screen and
 * the home card purely so they can forward it back out again.
 *
 * Deliberately called from `saveWeights` and `resetWeighting` only, never from
 * `write`. `adoptRemoteWeighting` also writes, and if that pushed it would echo
 * the server's own value straight back at it on every launch.
 */
type WeightingPusher = (weights: CategoryWeights | null, updatedAt: string | null) => void;

let pusher: WeightingPusher | null = null;

export function registerWeightingSync(next: WeightingPusher | null): void {
  pusher = next;
}

/**
 * Adopts a weighting that came from the server, for the account it belongs to.
 *
 * Separate from `saveWeights` because it must not stamp a new `updatedAt` — the
 * timestamp is what decides which device wrote last, and overwriting it on
 * arrival would make every sync look like the newest edit and let a stale device
 * win the next comparison.
 *
 * ## Why this takes a user id
 *
 * This is the one write to the store that arrives *asynchronously*, long after
 * whatever asked for it. In between, the reader can sign out and sign in as
 * somebody else — and a write is not addressed to an account, it lands in
 * whichever namespace `writeScoped` is pointing at when it runs. So a response
 * fetched for A, arriving a moment after B signs in, would be stored as B's
 * weighting and shown on B's home screen.
 *
 * That is not hypothetical ordering paranoia. `setScopeUser` runs synchronously
 * inside the Supabase auth callback, while the effect that would cancel this
 * runs only after React re-renders — so the cancellation flag genuinely can
 * still be unset at the moment the scope has already moved.
 *
 * The caller passes the id it fetched for, and this refuses if the device is no
 * longer that account. Returns whether the write landed.
 */
export function adoptRemoteWeighting(
  userId: string,
  weights: CategoryWeights,
  updatedAt: string | null,
): boolean {
  if (getScopeUser() !== userId) return false;

  const cleaned: CategoryWeights = {};
  for (const [key, value] of Object.entries(weights)) {
    if (typeof value === 'number' && Number.isFinite(value)) {
      cleaned[key] = Math.min(MAX_WEIGHT, Math.max(MIN_WEIGHT, value));
    }
  }

  if (Object.keys(cleaned).length === 0) return false;

  write({ weights: cleaned, updatedAt });
  return true;
}

/**
 * Which of the two copies is newer.
 *
 * Exported for the tests, because "the wrong one wins" is a data-loss bug that
 * is invisible until someone notices their weighting reverted weeks later.
 *
 * The rules, in order:
 *   - Only one side has anything → that side, always. This is the case the
 *     feature exists for: a fresh install has no local weighting and must take
 *     the server's rather than showing defaults.
 *   - Both sides, and either lacks a timestamp → local. A missing timestamp
 *     means a copy written before the field existed, and the device is the one
 *     the reader touched most recently by definition.
 *   - Both sides with timestamps → whichever is newer.
 */
export function resolveConflict(
  local: WeightingState,
  remote: { weights: CategoryWeights; updatedAt: string | null } | null,
): 'local' | 'remote' | 'neither' {
  const hasLocal = local.weights !== null;
  const hasRemote = remote !== null;

  if (!hasLocal && !hasRemote) return 'neither';
  if (!hasLocal) return 'remote';
  if (!hasRemote) return 'local';

  if (!local.updatedAt || !remote.updatedAt) return 'local';

  return remote.updatedAt > local.updatedAt ? 'remote' : 'local';
}

/**
 * The weights to score with: the reader's where set, the artifact's elsewhere.
 *
 * Defaults fill gaps rather than being replaced wholesale, so a category added
 * by a later data-layer release gets a sensible weight instead of zero — which
 * would silently drop a whole category out of a customised reader's score.
 */
export function resolveWeights(
  state: WeightingState,
  defaults: CategoryWeights,
): CategoryWeights {
  if (!state.weights) return defaults;
  return { ...defaults, ...state.weights };
}

export function useWeighting(): WeightingState {
  return useSyncExternalStore(subscribe, getWeightingState, getWeightingState);
}

/**
 * The saved weighting, for anything that only reads it — the home screen's
 * "Your score" row, chiefly.
 *
 * The editing screen wants `useWeightingDraft` instead.
 */
export function useWeightingControls(defaults: CategoryWeights) {
  const state = useWeighting();

  const save = useCallback(
    (weights: CategoryWeights) => saveWeights(weights, defaults),
    [defaults],
  );

  return {
    state,
    weights: resolveWeights(state, defaults),
    isCustomised: state.weights !== null,
    save,
    reset: resetWeighting,
  };
}

/**
 * An editable draft of the weighting, committed explicitly.
 *
 * Two reasons this is a draft rather than writing straight through:
 *
 * **Performance.** `localStorage` here is synchronous SQLite. Persisting on
 * every slider move issued a disk write per touch event, and the drag stuttered
 * accordingly. The draft lives in React state, so a move costs a re-render and
 * nothing else; `commit` writes once.
 *
 * **Honesty.** A Save button that is always a no-op because everything already
 * saved is a lie about what the screen does. With a draft there is a real
 * difference between what is on screen and what is stored, so the button means
 * something and "Saved" is a fact rather than reassurance.
 */
export function useWeightingDraft(defaults: CategoryWeights) {
  const stored = useWeighting();
  const savedWeights = resolveWeights(stored, defaults);

  const [draft, setDraft] = useState<CategoryWeights>(savedWeights);

  // Re-seed when the saved weighting changes underneath us — a reset, or the
  // artifact arriving after first paint and bringing real defaults with it.
  //
  // Adjusted during render rather than in an effect. React endorses this shape
  // for "reset state when a prop changes": it re-renders before committing, so
  // the stale draft never reaches the screen, where an effect would paint it
  // first and correct it a frame later. Keyed on the serialised weights because
  // `resolveWeights` builds a new object every render and identity would always
  // differ.
  const savedKey = JSON.stringify(savedWeights);
  const [seededFrom, setSeededFrom] = useState(savedKey);

  if (seededFrom !== savedKey) {
    setSeededFrom(savedKey);
    setDraft(savedWeights);
  }

  const setWeight = useCallback((categoryId: string, weight: number) => {
    setDraft((current) => ({ ...current, [categoryId]: weight }));
  }, []);

  const commit = useCallback(() => {
    saveWeights(draft, defaults);
  }, [draft, defaults]);

  const reset = useCallback(() => {
    // Clears storage *and* the draft, so the sliders jump back immediately
    // rather than waiting for the store to notify.
    resetWeighting();
    setDraft({ ...defaults });
  }, [defaults]);

  /**
   * Takes the data layer's own weighting as a deliberate answer.
   *
   * The distinction this exists to preserve: the sliders opening at these
   * weights is not a choice, and is never scored as one — but *asking* for them
   * is. Someone who would rather be tracked against the published research than
   * decide for themselves has made a real decision, and this is how they record
   * it. It is opt-in and it is a button they have to find and press, which is
   * the whole difference from showing the number by default.
   *
   * Saves rather than merely moving the sliders, and saves `defaults` rather
   * than `draft` — pressing this after dragging things around means "no, use
   * theirs", not "keep what I was fiddling with".
   */
  const adoptDefaults = useCallback(() => {
    saveWeights(defaults, defaults);
    setDraft({ ...defaults });
  }, [defaults]);

  return {
    draft,
    setWeight,
    commit,
    reset,
    adoptDefaults,
    /** Draft differs from what is stored — the Save button's enabled state. */
    isDirty: !isDefaultWeighting(draft, savedWeights, 0.001),
    /**
     * Draft differs from the positions the sliders opened at.
     *
     * Drives whether there is a score to show at all. An untouched draft is not
     * an answer, so the weighting screen clears rather than saves it.
     */
    isCustomised: !isDefaultWeighting(draft, defaults),
    savedAt: stored.updatedAt,
    hasSaved: stored.weights !== null,
  };
}
