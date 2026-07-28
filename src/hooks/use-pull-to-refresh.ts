import { useCallback, useEffect, useRef, useState } from 'react';

/** Floor on how long the refresh wheel stays up, so a pull always registers. */
const MIN_SPINNER_MS = 700;

/**
 * Drives a `RefreshControl` from the pull gesture alone.
 *
 * The point is what it *doesn't* do: it never reflects a query's `isRefetching`.
 * Wiring the control straight to that flag means a background refetch — the one
 * React Query fires on mount when the cache has gone stale — can hand
 * `refreshing: true` to a control on its very first render. iOS then draws the
 * spinner in its pulled-down position without ever starting it, and since the
 * user never pulled, there's nothing to release: the wheel just sits there.
 * That's the stuck wheel you get when opening a tab you haven't visited in a
 * while.
 *
 * Starting at false and only ever flipping in response to `onRefresh` keeps the
 * control honest — it shows exactly when someone asked for it. The underlying
 * refetch still happens either way; it just doesn't get to draw.
 */
export function usePullToRefresh(refresh: () => Promise<unknown>) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Held in a ref so callers can pass an inline closure without giving the
  // control a new `onRefresh` identity on every render. Assigned in an effect
  // rather than during render, which is the only safe place to touch a ref.
  const refreshRef = useRef(refresh);
  useEffect(() => {
    refreshRef.current = refresh;
  });

  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    // Raced against a floor rather than awaited alone: a warm cache answers in
    // a few frames, and the wheel would be gone before it finished drawing —
    // which reads as the pull having done nothing at all.
    void Promise.all([
      refreshRef.current(),
      new Promise((resolve) => setTimeout(resolve, MIN_SPINNER_MS)),
    ]).finally(() => {
      if (mounted.current) setIsRefreshing(false);
    });
  }, []);

  return { isRefreshing, onRefresh };
}
