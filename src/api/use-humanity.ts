/**
 * One fetch of the artifact per app launch, shared by whoever asks.
 *
 * ## Why not react-query
 *
 * It is still in `package.json`, but the provider left with the tabs app in the
 * pivot and there is exactly one query in the whole session. A `QueryClient`, a
 * provider around the root and a cache policy would all be doing the job of the
 * module-level promise below, which is: start it once, hand the same promise to
 * every caller, and don't start it again.
 *
 * ## Why the prefetch matters
 *
 * `/calibration` sits after the breath and the game — five minutes or so past
 * `/topic`, which is the first screen that knows the session will reach it at
 * all. Starting the fetch there means the answer is almost always sitting in
 * memory by the time the screen mounts, and a spinner on the one screen that is
 * supposed to be calm is a spinner nobody should see.
 *
 * The promise deliberately outlives the session: it is a public file with no
 * user data in it, and a second run of the app in the same launch should not
 * refetch a file the first run already has. `reset` on the session context does
 * not clear it, and shouldn't.
 */

import { useEffect, useState } from 'react';

import { fetchHumanityArtifact, type HumanityArtifact } from '@/api/humanity';

/**
 * The in-flight or settled fetch. Null means nobody has asked yet.
 *
 * A rejected promise is cleared rather than kept, so a screen mounting after a
 * failed prefetch tries again instead of inheriting the failure — the user has
 * spent five minutes in the app since, and the network may well have come back.
 */
let pending: Promise<HumanityArtifact> | null = null;

/**
 * Starts the fetch if it hasn't been started, and returns nothing.
 *
 * Fire-and-forget by design: the caller is a screen that does not render this
 * data and must not wait on it. The rejection is swallowed here and re-raised
 * for whoever actually awaits the promise later.
 */
export function prefetchHumanity(): void {
  void loadHumanity().catch(() => {});
}

function loadHumanity(): Promise<HumanityArtifact> {
  if (pending) return pending;

  const request = fetchHumanityArtifact();

  pending = request;
  request.catch(() => {
    // Only clear it if nothing has replaced it in the meantime.
    if (pending === request) pending = null;
  });

  return request;
}

/** Everything a screen needs to render one of three states, and nothing else. */
export interface HumanityState {
  artifact: HumanityArtifact | null;
  /** True until the first attempt settles. Never true once `artifact` is set. */
  loading: boolean;
  /** Set when the attempt failed. The caller renders without charts. */
  failed: boolean;
}

export function useHumanity(): HumanityState {
  const [state, setState] = useState<HumanityState>({
    artifact: null,
    loading: true,
    failed: false,
  });

  useEffect(() => {
    let active = true;

    loadHumanity().then(
      (artifact) => {
        if (active) setState({ artifact, loading: false, failed: false });
      },
      () => {
        if (active) setState({ artifact: null, loading: false, failed: true });
      },
    );

    return () => {
      active = false;
    };
  }, []);

  return state;
}
