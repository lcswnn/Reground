import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { HumanityArtifact, HumanityMetric } from '@/api/humanity';

// The module pulls in the SQLite-backed localStorage polyfill for its side
// effect. There is no SQLite here, so stand in a plain in-memory one — what is
// under test is the freshness rule, not the storage engine.
vi.mock('expo-sqlite/localStorage/install', () => ({}));

const store = new Map<string, string>();

vi.stubGlobal('localStorage', {
  getItem: (key: string) => store.get(key) ?? null,
  setItem: (key: string, value: string) => void store.set(key, value),
  removeItem: (key: string) => void store.delete(key),
});

type FreshData = typeof import('./fresh-data');

/** A fresh module instance, since the badge set is module-level session state. */
async function relaunch(): Promise<FreshData> {
  vi.resetModules();
  return import('./fresh-data');
}

function metric(id: string, lastObservedAt: string, currentValue = 0): HumanityMetric {
  return { id, lastObservedAt, currentValue } as HumanityMetric;
}

let run = 0;

function artifact(...metrics: HumanityMetric[]): HumanityArtifact {
  // `generatedAt` gates re-reconciliation, so each build needs its own.
  run += 1;
  return { generatedAt: `2026-07-${String(run).padStart(2, '0')}T00:00:00.000Z`, metrics } as HumanityArtifact;
}

/** Same, with a composite score attached. */
function scored(score: number, ...metrics: HumanityMetric[]): HumanityArtifact {
  return { ...artifact(...metrics), compositeScore: score };
}

beforeEach(() => {
  store.clear();
  run = 0;
});

describe('fresh metrics', () => {
  it('never badges a metric it has not seen before', async () => {
    const { reconcileFreshMetrics, getFreshMetricIds } = await relaunch();

    reconcileFreshMetrics(artifact(metric('life-expectancy', '2023-01-01')));

    // A new install would otherwise open with every tile flagged, which tells
    // the user nothing at all.
    expect(getFreshMetricIds().size).toBe(0);
  });

  it('ignores a daily source ticking forward a day at a time', async () => {
    const first = await relaunch();
    first.reconcileFreshMetrics(artifact(metric('co2-concentration', '2026-07-27')));

    const second = await relaunch();
    second.reconcileFreshMetrics(artifact(metric('co2-concentration', '2026-07-28')));

    expect(second.getFreshMetricIds().has('co2-concentration')).toBe(false);
  });

  it('badges a daily source after a long absence', async () => {
    const first = await relaunch();
    first.reconcileFreshMetrics(artifact(metric('co2-concentration', '2026-06-01')));

    const second = await relaunch();
    second.reconcileFreshMetrics(artifact(metric('co2-concentration', '2026-07-28')));

    // Six weeks of readings the user has not seen is genuinely new to them,
    // even though each individual day's tick was not.
    expect(second.getFreshMetricIds().has('co2-concentration')).toBe(true);
  });

  it('badges monthly and annual sources when they publish', async () => {
    const first = await relaunch();
    first.reconcileFreshMetrics(
      artifact(metric('renewable-share', '2026-05-01'), metric('child-mortality', '2024-01-01')),
    );

    const second = await relaunch();
    second.reconcileFreshMetrics(
      artifact(metric('renewable-share', '2026-06-01'), metric('child-mortality', '2025-01-01')),
    );

    expect([...second.getFreshMetricIds()].sort()).toEqual(['child-mortality', 'renewable-share']);
  });

  it('ignores a backwards revision', async () => {
    const first = await relaunch();
    first.reconcileFreshMetrics(artifact(metric('extreme-poverty', '2023-01-01')));

    const second = await relaunch();
    second.reconcileFreshMetrics(artifact(metric('extreme-poverty', '2022-01-01')));

    expect(second.getFreshMetricIds().size).toBe(0);
  });

  it('keeps badging until the metric is actually looked at', async () => {
    const first = await relaunch();
    first.reconcileFreshMetrics(artifact(metric('child-mortality', '2024-01-01')));

    const second = await relaunch();
    second.reconcileFreshMetrics(artifact(metric('child-mortality', '2025-01-01')));
    expect(second.getFreshMetricIds().has('child-mortality')).toBe(true);

    // Closed the app without ever scrolling to it.
    const third = await relaunch();
    third.reconcileFreshMetrics(artifact(metric('child-mortality', '2025-01-01')));
    expect(third.getFreshMetricIds().has('child-mortality')).toBe(true);

    third.markMetricSeen(metric('child-mortality', '2025-01-01'));
    // Still showing: clearing it mid-session would make it vanish under the
    // user's eyes.
    expect(third.getFreshMetricIds().has('child-mortality')).toBe(true);

    const fourth = await relaunch();
    fourth.reconcileFreshMetrics(artifact(metric('child-mortality', '2025-01-01')));
    expect(fourth.getFreshMetricIds().has('child-mortality')).toBe(false);
  });

  it('picks up an update that arrives mid-session', async () => {
    const app = await relaunch();
    app.reconcileFreshMetrics(artifact(metric('undernourishment', '2024-01-01')));
    expect(app.getFreshMetricIds().size).toBe(0);

    // Pull to refresh, and a new artifact lands.
    app.reconcileFreshMetrics(artifact(metric('undernourishment', '2025-01-01')));
    expect(app.getFreshMetricIds().has('undernourishment')).toBe(true);
  });
});

describe('previous values', () => {
  it('reports the value shown before a new measurement landed', async () => {
    const first = await relaunch();
    first.reconcileFreshMetrics(artifact(metric('child-mortality', '2024-01-01', 3.62)));

    const second = await relaunch();
    second.reconcileFreshMetrics(artifact(metric('child-mortality', '2025-01-01', 3.41)));

    expect(second.getFreshSnapshot().previousValues.get('child-mortality')).toBe(3.62);
  });

  it('carries none for a metric that is not badged', async () => {
    const first = await relaunch();
    first.reconcileFreshMetrics(artifact(metric('co2-concentration', '2026-07-27', 421)));

    const second = await relaunch();
    second.reconcileFreshMetrics(artifact(metric('co2-concentration', '2026-07-28', 422)));

    // The nowcast moved, but nothing was measured. An arrow here would appear
    // on every metric, every launch.
    expect(second.getFreshSnapshot().previousValues.has('co2-concentration')).toBe(false);
  });

  it('keeps comparing against what the user last actually saw', async () => {
    const first = await relaunch();
    first.reconcileFreshMetrics(artifact(metric('child-mortality', '2024-01-01', 3.62)));

    const second = await relaunch();
    second.reconcileFreshMetrics(artifact(metric('child-mortality', '2025-01-01', 3.41)));

    // Closed the app without scrolling to it; the nowcast drifts on.
    const third = await relaunch();
    third.reconcileFreshMetrics(artifact(metric('child-mortality', '2025-01-01', 3.4)));

    expect(third.getFreshSnapshot().previousValues.get('child-mortality')).toBe(3.62);
  });

  it('tracks the composite score across a measurement', async () => {
    const first = await relaunch();
    first.reconcileFreshMetrics(scored(0.2859, metric('child-mortality', '2024-01-01', 3.62)));
    // Nothing fresh, so nothing to compare against.
    expect(first.getFreshSnapshot().previousScore).toBe(null);

    const second = await relaunch();
    second.reconcileFreshMetrics(scored(0.2861, metric('child-mortality', '2025-01-01', 3.41)));

    expect(second.getFreshSnapshot().previousScore).toBe(0.2859);
  });

  it('freezes the stored score while a badge is live', async () => {
    const first = await relaunch();
    first.reconcileFreshMetrics(scored(0.2859, metric('child-mortality', '2024-01-01', 3.62)));

    const second = await relaunch();
    second.reconcileFreshMetrics(scored(0.2861, metric('child-mortality', '2025-01-01', 3.41)));

    // Still unread on the next launch: the arrow has to still say 0.2859.
    const third = await relaunch();
    third.reconcileFreshMetrics(scored(0.2862, metric('child-mortality', '2025-01-01', 3.41)));

    expect(third.getFreshSnapshot().previousScore).toBe(0.2859);
  });
});
