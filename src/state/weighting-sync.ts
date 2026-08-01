import { useEffect } from 'react';

import {
  clearRemoteWeighting,
  fetchRemoteWeighting,
  saveRemoteWeighting,
} from '@/api/weighting';
import { useSession } from '@/lib/session';
import { getScopeUser } from '@/lib/user-scope';
import {
  adoptRemoteWeighting,
  getWeightingState,
  registerWeightingSync,
  resolveConflict,
} from '@/state/weighting';

/**
 * Keeps the device's weighting and the server's copy in step.
 *
 * Mount once, high in the tree. It does two things:
 *
 *   - **On sign-in**, reconciles the two copies. A fresh install has no local
 *     weighting and adopts the server's, which is the entire point of this file:
 *     reinstalling the app, or signing in on a second phone, must not silently
 *     drop someone back to having no weighting at all.
 *   - **On save**, pushes the new weighting up, via the hook registered in
 *     `state/weighting.ts`.
 *
 * ## The device stays authoritative
 *
 * Local storage is still the write path and still works with no network. The
 * server is a backup that happens to be shared between devices, not a
 * dependency — nothing here can block a save, and every failure is a warning in
 * the console rather than an error the reader sees. Someone weighting their
 * score on a plane gets exactly the behaviour they had before this existed.
 *
 * ## Signed-out readers
 *
 * There is nowhere to sync to, so nothing happens. The weighting still persists
 * on the device; it just does not follow them anywhere. If they sign in later,
 * the reconcile below runs and — because the server has nothing — pushes their
 * existing local weighting up rather than overwriting it.
 */
export function useWeightingSync(): void {
  const { session } = useSession();
  const userId = session?.user.id ?? null;

  // Register the push hook for as long as someone is signed in.
  useEffect(() => {
    if (!userId) {
      registerWeightingSync(null);
      return;
    }

    registerWeightingSync((weights, updatedAt) => {
      // Fire and forget. The local write has already happened and is what the UI
      // is showing; this is the copy that outlives the install.
      void (weights && updatedAt
        ? saveRemoteWeighting(userId, weights, updatedAt)
        : clearRemoteWeighting(userId));
    });

    return () => registerWeightingSync(null);
  }, [userId]);

  // Reconcile once per signed-in user.
  useEffect(() => {
    if (!userId) return;

    let active = true;

    void (async () => {
      const remote = await fetchRemoteWeighting(userId);

      /**
       * Both halves of this matter, and `active` alone is not enough.
       *
       * The reader can sign out and into another account while the request
       * above is in flight. `setScopeUser` runs synchronously inside the
       * Supabase auth callback, but this continuation is a microtask and the
       * effect cleanup that clears `active` only runs after React re-renders —
       * so there is a real window where the device already belongs to B while
       * this closure still thinks it is reconciling A.
       *
       * Left unguarded, both branches below are wrong in that window, in
       * opposite directions: `remote` would store A's weighting into B's
       * namespace and put it on B's home screen, and `local` would upload
       * whatever the store now holds for B into A's profile row.
       */
      if (!active || getScopeUser() !== userId) return;

      // Read the store only once the account is confirmed, and at resolve time
      // rather than through a hook: this must see whatever is current when the
      // network call lands, not what was there when the effect was scheduled.
      const local = getWeightingState();

      switch (resolveConflict(local, remote)) {
        case 'remote':
          // Keeps the server's timestamp, so a later comparison on another
          // device still reads the true time of the edit. Re-checks the scope
          // itself — belt and braces on the write that caused the leak.
          adoptRemoteWeighting(userId, remote!.weights, remote!.updatedAt);
          break;

        case 'local':
          // Covers two cases at once: the server has nothing yet, or it has
          // something older. Re-saving pushes the winner up.
          if (local.weights && (!remote || remote.updatedAt !== local.updatedAt)) {
            void saveRemoteWeighting(
              userId,
              local.weights,
              local.updatedAt ?? new Date().toISOString(),
            );
          }
          break;

        case 'neither':
          // Nobody has ever set a weighting. Defaults it is.
          break;
      }
    })();

    return () => {
      active = false;
    };
    // Keyed on the user alone. It deliberately does not re-run when the
    // weighting changes — pushing on save is the other effect's job, and
    // reconciling on every edit would race the write it just triggered.
  }, [userId]);
}
