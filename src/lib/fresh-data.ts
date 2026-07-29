import "expo-sqlite/localStorage/install";

import { useEffect, useSyncExternalStore } from "react";

import type { HumanityArtifact, HumanityMetric } from "@/api/humanity";

/**
 * "New data since you last looked", per device.
 *
 * The artifact is rebuilt every day and every metric is a nowcast, so the
 * numbers differ from yesterday's by construction — `currentValue` moves on
 * every run whether or not anything was measured. Badging on that would light
 * up all thirteen tiles, every day, forever.
 *
 * The signal that means something is `lastObservedAt`: a real new measurement
 * from the source. Those land roughly twenty-odd times a year across the whole
 * grid, which is rare enough to be worth an interruption.
 *
 * Per device rather than computed in the data layer on purpose. A server-side
 * "updated today" flag is wrong for anyone who hasn't opened the app since the
 * update — which, for annual series, is nearly everyone nearly always. What the
 * badge should answer is "did this change since *I* last saw it".
 */

const STORAGE_KEY = "humanitas.seen-observations";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * How far `lastObservedAt` has to advance before it counts as news.
 *
 * This is what keeps NOAA out of the badge without hardcoding a list of metric
 * ids in the app. CO₂ concentration has `sourceUpdateCadence: 'daily'`, so for
 * anyone who opens the app regularly it advances a day at a time and never
 * clears the bar. Ember's monthly points (~30 days) and OWID's annual ones
 * (~365) clear it easily.
 *
 * The nice consequence of expressing it as a distance rather than a cadence:
 * someone back after six weeks away *does* get a CO₂ badge, because six weeks
 * of new readings genuinely is new data to them.
 */
const MIN_ADVANCE_DAYS = 25;

type SeenMap = Record<string, string>;

/** Lazily read; the module owns this object and mutates it in place. */
let seen: SeenMap | null = null;

/**
 * Ids to badge this session. Deliberately not recomputed when `seen` changes —
 * see `markMetricSeen` for why the badge has to outlive being marked as read.
 */
let fresh: ReadonlySet<string> | null = null;

/** The artifact `fresh` was computed from, so a mid-session refresh re-runs. */
let reconciledAt: string | null = null;

const listeners = new Set<() => void>();

const EMPTY: ReadonlySet<string> = new Set();

function readSeen(): SeenMap {
  if (seen) return seen;

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    seen = parsed && typeof parsed === "object" ? (parsed as SeenMap) : {};
  } catch {
    // Corrupt JSON, or storage unavailable on web. Starting empty costs one
    // silent seeding pass, which is much better than failing a render.
    seen = {};
  }

  return seen;
}

function persist(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seen ?? {}));
  } catch {
    // The badge is a nicety. It is not worth an error boundary.
  }
}

/** Whether the source published a measurement far enough past the seen one. */
function hasAdvanced(previous: string, current: string): boolean {
  const gap = Date.parse(current) - Date.parse(previous);
  // NaN from an unparseable date fails this, which is the safe direction: an
  // unreadable timestamp shows no badge rather than a permanent one.
  return gap >= MIN_ADVANCE_DAYS * MS_PER_DAY;
}

/**
 * Works out what's new, and quietly records everything that isn't.
 *
 * Three cases per metric:
 *
 *   never seen    — record it, don't badge. A fresh install would otherwise
 *                   open with all thirteen tiles flagged, which says nothing.
 *   advanced far  — badge it, and *leave the stored date alone*, so a badge the
 *                   user never actually looked at survives a relaunch.
 *   anything else — a daily NOAA tick, or a backwards revision. Record silently.
 */
export function reconcileFreshMetrics(artifact: HumanityArtifact): void {
  if (reconciledAt === artifact.generatedAt) return;

  const store = readSeen();
  const next = new Set(fresh ?? EMPTY);
  let dirty = false;

  for (const metric of artifact.metrics) {
    const previous = store[metric.id];

    if (previous && hasAdvanced(previous, metric.lastObservedAt)) {
      next.add(metric.id);
      continue;
    }

    if (previous !== metric.lastObservedAt) {
      store[metric.id] = metric.lastObservedAt;
      dirty = true;
    }
  }

  fresh = next;
  reconciledAt = artifact.generatedAt;
  if (dirty) persist();

  for (const listener of listeners) listener();
}

/**
 * Records that the user has now seen this metric's latest observation.
 *
 * Notably does *not* clear the badge from `fresh`, and so notifies nobody: the
 * dot has to stay put while it's being looked at. Clearing on viewability would
 * make it vanish from under the user's eyes, which reads as a rendering bug
 * rather than as "read". It's gone on the next launch instead.
 */
export function markMetricSeen(metric: HumanityMetric): void {
  const store = readSeen();
  if (store[metric.id] === metric.lastObservedAt) return;

  store[metric.id] = metric.lastObservedAt;
  persist();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Metric ids to badge. Stable reference, so it is safe as a store snapshot. */
export function getFreshMetricIds(): ReadonlySet<string> {
  return fresh ?? EMPTY;
}

/** Metric ids carrying a new measurement since this device last saw one. */
export function useFreshMetrics(
  artifact: HumanityArtifact | undefined,
): ReadonlySet<string> {
  useEffect(() => {
    if (artifact) reconcileFreshMetrics(artifact);
  }, [artifact]);

  // `getFreshMetricIds` returns a stable reference — either the module's own
  // Set or the shared empty one — so this never loops.
  return useSyncExternalStore(subscribe, getFreshMetricIds, getFreshMetricIds);
}
