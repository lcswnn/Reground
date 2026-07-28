import { describe, expect, it } from 'vitest';

import { METRICS } from '../src/config/metrics.js';
import { computeCompositeScore, scoreAt } from '../src/scoring/composite.js';
import { NORMALIZED_FLOOR, normalizeMetric } from '../src/scoring/normalize.js';
import type { MetricConfig, Observation } from '../src/types.js';

function config(overrides: Partial<MetricConfig> = {}): MetricConfig {
  return {
    id: 'test',
    label: 'Test',
    category: 'test',
    baselineValue: 0,
    targetValue: 100,
    direction: 'higher_is_better',
    weight: 1,
    polarity: 'contributor',
    nowcastMethod: 'linear',
    trailingWindowYears: 10,
    sourceAdapterId: 'test',
    unit: '%',
    basis: 'test',
    ...overrides,
  };
}

function series(metricId: string, startYear: number, values: number[]): Observation[] {
  return values.map((value, index) => ({
    metricId,
    value,
    observedAt: `${startYear + index}-01-01`,
    provenance: 'observed' as const,
    sourceLastUpdated: null,
    sourceNextUpdate: null,
    fetchedAt: '2026-01-01T00:00:00.000Z',
    source: 'test',
    unit: '%',
  }));
}

describe('normalizeMetric — higher_is_better', () => {
  const rising = config();

  it('is 0 at baseline', () => {
    expect(normalizeMetric(rising, 0)).toBe(0);
  });

  it('is 1 at target', () => {
    expect(normalizeMetric(rising, 100)).toBe(1);
  });

  it('is proportional in between', () => {
    expect(normalizeMetric(rising, 30)).toBeCloseTo(0.3, 10);
  });

  it('clamps at 1 beyond target — no credit banked', () => {
    expect(normalizeMetric(rising, 250)).toBe(1);
  });

  it('goes NEGATIVE below baseline, floored at -0.5', () => {
    expect(normalizeMetric(rising, -20)).toBeCloseTo(-0.2, 10);
    expect(normalizeMetric(rising, -500)).toBe(NORMALIZED_FLOOR);
  });
});

describe('normalizeMetric — lower_is_better', () => {
  const falling = config({ direction: 'lower_is_better', baselineValue: 40, targetValue: 10 });

  it('is 0 at baseline', () => {
    expect(normalizeMetric(falling, 40)).toBe(0);
  });

  it('is 1 at target', () => {
    expect(normalizeMetric(falling, 10)).toBe(1);
  });

  it('is proportional in between, the right way up', () => {
    // Ten of a thirty-point fall achieved.
    expect(normalizeMetric(falling, 30)).toBeCloseTo(1 / 3, 10);
  });

  it('clamps at 1 beyond target', () => {
    expect(normalizeMetric(falling, 0)).toBe(1);
  });

  it('goes NEGATIVE when the number has risen past baseline', () => {
    expect(normalizeMetric(falling, 55)).toBeCloseTo(-0.5, 10);
    expect(normalizeMetric(falling, 200)).toBe(NORMALIZED_FLOOR);
  });

  it('throws when direction contradicts the anchors', () => {
    expect(() =>
      normalizeMetric(config({ direction: 'lower_is_better' }), 50),
    ).toThrow(/contradicts anchors/);
  });
});

describe('composite', () => {
  const asOf = new Date('2026-01-01');

  it('falls when a heavily-weighted metric regresses', () => {
    const configs = [
      config({ id: 'heavy', weight: 0.7 }),
      config({ id: 'light', weight: 0.3 }),
    ];

    const healthy = new Map([
      ['heavy', series('heavy', 2016, [50, 55, 60, 65, 70, 75, 80, 85, 90, 95])],
      ['light', series('light', 2016, [50, 50, 50, 50, 50, 50, 50, 50, 50, 50])],
    ]);

    const regressing = new Map([
      // Same start, then collapses well below the baseline of 0.
      ['heavy', series('heavy', 2016, [50, 40, 30, 20, 10, 0, -10, -20, -30, -40])],
      ['light', series('light', 2016, [50, 50, 50, 50, 50, 50, 50, 50, 50, 50])],
    ]);

    const before = scoreAt({ configs, observations: healthy, asOf }).score;
    const after = scoreAt({ configs, observations: regressing, asOf }).score;

    expect(after).toBeLessThan(before);
  });

  it('lets a regressed metric pull the total down, not merely contribute zero', () => {
    const configs = [
      config({ id: 'good', weight: 0.5 }),
      config({ id: 'bad', weight: 0.5 }),
    ];

    const flooredAtZero = new Map([
      ['good', series('good', 2020, [100, 100, 100])],
      ['bad', series('bad', 2020, [0, 0, 0])], // exactly at baseline -> 0
    ]);

    const regressed = new Map([
      ['good', series('good', 2020, [100, 100, 100])],
      ['bad', series('bad', 2020, [-40, -45, -50])], // past baseline -> negative
    ]);

    const atBaseline = scoreAt({ configs, observations: flooredAtZero, asOf }).score;
    const belowBaseline = scoreAt({ configs, observations: regressed, asOf }).score;

    // If the floor were 0 these would be equal. They must not be.
    expect(belowBaseline).toBeLessThan(atBaseline);
  });

  it('subtracts a detractor rather than averaging it in', () => {
    const withContributorOnly = [config({ id: 'good', weight: 1 })];
    const withDetractor = [
      config({ id: 'good', weight: 0.8 }),
      config({
        id: 'emissions',
        weight: 0.2,
        polarity: 'detractor',
        direction: 'lower_is_better',
        baselineValue: 10,
        targetValue: 2,
      }),
    ];

    const observations = new Map([
      ['good', series('good', 2020, [80, 80, 80])],
      ['emissions', series('emissions', 2020, [10, 10, 10])], // at baseline, full penalty
    ]);

    const clean = scoreAt({ configs: withContributorOnly, observations, asOf }).score;
    const dirty = scoreAt({ configs: withDetractor, observations, asOf }).score;

    expect(dirty).toBeCloseTo(clean - 0.2, 10);
  });

  it('charges a detractor MORE than its weight once it regresses past baseline', () => {
    const configs = [
      config({ id: 'good', weight: 0.8 }),
      config({
        id: 'emissions',
        weight: 0.2,
        polarity: 'detractor',
        direction: 'lower_is_better',
        baselineValue: 10,
        targetValue: 2,
      }),
    ];

    const atBaseline = new Map([
      ['good', series('good', 2020, [100, 100, 100])],
      ['emissions', series('emissions', 2020, [10, 10, 10])],
    ]);
    const worse = new Map([
      ['good', series('good', 2020, [100, 100, 100])],
      ['emissions', series('emissions', 2020, [14, 14, 14])], // normalized -0.5
    ]);

    const a = scoreAt({ configs, observations: atBaseline, asOf }).score;
    const b = scoreAt({ configs, observations: worse, asOf }).score;

    expect(a).toBeCloseTo(0.8, 10); // 1.0 - 0.2
    expect(b).toBeCloseTo(0.7, 10); // 1.0 - 0.2 * 1.5
  });

  it('clamps the final score at 0 without clamping the pressure that got it there', () => {
    const configs = [
      config({ id: 'good', weight: 0.1 }),
      config({
        id: 'bad',
        weight: 0.9,
        polarity: 'detractor',
        direction: 'lower_is_better',
        baselineValue: 10,
        targetValue: 0,
      }),
    ];

    const observations = new Map([
      ['good', series('good', 2020, [10, 10, 10])],
      ['bad', series('bad', 2020, [30, 30, 30])],
    ]);

    expect(scoreAt({ configs, observations, asOf }).score).toBe(0);
  });

  it('reports direction and deltas', () => {
    const configs = [config({ id: 'rising', weight: 1 })];
    const observations = new Map([
      ['rising', series('rising', 2014, [10, 15, 20, 25, 30, 35, 40, 45, 50, 55])],
    ]);

    const result = computeCompositeScore({ configs, observations, asOf: new Date('2026-06-01') });

    expect(result.direction).toBe('up');
    expect(result.deltaVsLastWeek).toBeGreaterThan(0);
    expect(result.deltaVsLastMonth).toBeGreaterThan(0);
    expect(result.perMetricContributions).toHaveLength(1);
  });

  it('reports direction down when the projection is falling', () => {
    const configs = [config({ id: 'falling', weight: 1 })];
    const observations = new Map([
      ['falling', series('falling', 2014, [90, 85, 80, 75, 70, 65, 60, 55, 50, 45])],
    ]);

    const result = computeCompositeScore({ configs, observations, asOf: new Date('2026-06-01') });

    expect(result.direction).toBe('down');
    expect(result.deltaVsLastWeek).toBeLessThan(0);
  });
});

describe('live metric config', () => {
  it('declares weights summing to 1', () => {
    const sum = METRICS.reduce((total, metric) => total + metric.weight, 0);
    expect(Math.abs(sum - 1)).toBeLessThan(0.001);
  });

  it('has anchors consistent with each declared direction', () => {
    for (const metric of METRICS) {
      const span = metric.targetValue - metric.baselineValue;
      const declaredFall = metric.direction === 'lower_is_better';
      expect(
        declaredFall === span < 0,
        `${metric.id}: direction ${metric.direction} vs ${metric.baselineValue}->${metric.targetValue}`,
      ).toBe(true);
    }
  });

  it('scores conflict deaths negative, since the rate is above its baseline', () => {
    const conflict = METRICS.find((metric) => metric.id === 'conflict-deaths')!;
    // 2.98 per 100k against a 1989 baseline of 1.302 and a target of 0.
    expect(normalizeMetric(conflict, 2.98)).toBeLessThan(0);
  });
});
