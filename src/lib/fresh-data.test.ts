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

function metric(id: string, lastObservedAt: string): HumanityMetric {
  return { id, lastObservedAt } as HumanityMetric;
}

let run = 0;

function artifact(...metrics: HumanityMetric[]): HumanityArtifact {
  // `generatedAt` gates re-reconciliation, so each build needs its own.
  run += 1;
  return { generatedAt: `2026-07-${String(run).padStart(2, '0')}T00:00:00.000Z`, metrics } as HumanityArtifact;
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
