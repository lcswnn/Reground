import { describe, expect, it } from 'vitest';

import { HUMANITY_PROGRESS, WORLD_METRICS } from '@/constants/world-metrics';
import {
  computeBreakdown,
  computeCompositeScore,
  normalizeMetric,
  weightError,
  type MetricConfig,
} from '@/lib/scoring';

/** A rising contributor at its baseline, for tests to spread apart. */
function metric(overrides: Partial<MetricConfig> = {}): MetricConfig {
  return {
    id: 'test',
    label: 'Test metric',
    category: 'test',
    currentValue: 0,
    baselineValue: 0,
    targetValue: 100,
    direction: 'higher_is_better',
    weight: 1,
    polarity: 'contributor',
    ...overrides,
  };
}

describe('normalizeMetric', () => {
  it('scores a metric sitting on its baseline at 0', () => {
    expect(normalizeMetric(metric({ currentValue: 0 }))).toBe(0);
  });

  it('scores a metric sitting on its target at 1', () => {
    expect(normalizeMetric(metric({ currentValue: 100 }))).toBe(1);
  });

  it('places a metric proportionally between the two', () => {
    expect(normalizeMetric(metric({ currentValue: 25 }))).toBeCloseTo(0.25, 10);
  });

  it('reads a falling metric the right way up rather than inverted', () => {
    const falling = metric({
      direction: 'lower_is_better',
      baselineValue: 40,
      targetValue: 0,
      currentValue: 10,
    });

    // 10 out of a 40-point fall still to go: three quarters of the way there,
    // not the quarter an inverted scale would report.
    expect(normalizeMetric(falling)).toBeCloseTo(0.75, 10);
    expect(normalizeMetric({ ...falling, currentValue: 40 })).toBe(0);
    expect(normalizeMetric({ ...falling, currentValue: 0 })).toBe(1);
  });

  it('clamps both ends instead of banking credit or going negative', () => {
    expect(normalizeMetric(metric({ currentValue: 150 }))).toBe(1);
    expect(normalizeMetric(metric({ currentValue: -50 }))).toBe(0);

    const falling = metric({
      direction: 'lower_is_better',
      baselineValue: 40,
      targetValue: 10,
    });
    // Past the target, and worse than the baseline: both pin.
    expect(normalizeMetric({ ...falling, currentValue: 5 })).toBe(1);
    expect(normalizeMetric({ ...falling, currentValue: 90 })).toBe(0);
  });

  it('returns 0 when the anchors contradict the declared direction', () => {
    // Says it should fall, but the target is above the baseline. Scoring this
    // backwards silently is the failure mode worth being loud about.
    expect(
      normalizeMetric(
        metric({ direction: 'lower_is_better', currentValue: 100 }),
      ),
    ).toBe(0);
  });

  it('returns 0 for a zero-width span rather than dividing by it', () => {
    expect(
      normalizeMetric(metric({ baselineValue: 5, targetValue: 5, currentValue: 5 })),
    ).toBe(0);
  });
});

describe('computeCompositeScore', () => {
  it('returns 0 when every contributor is at its baseline', () => {
    const score = computeCompositeScore([
      metric({ id: 'a', weight: 0.6, currentValue: 0 }),
      metric({ id: 'b', weight: 0.4, currentValue: 0 }),
    ]);

    expect(score).toBe(0);
  });

  it('returns 1 when every contributor is at its target', () => {
    const score = computeCompositeScore([
      metric({ id: 'a', weight: 0.6, currentValue: 100 }),
      metric({ id: 'b', weight: 0.4, currentValue: 100 }),
    ]);

    expect(score).toBeCloseTo(1, 10);
  });

  it('weights contributors by importance rather than averaging them', () => {
    // The heavy metric is solved, the light one has not moved. An average would
    // say 50%; the weights say 80%.
    const score = computeCompositeScore([
      metric({ id: 'heavy', weight: 0.8, currentValue: 100 }),
      metric({ id: 'light', weight: 0.2, currentValue: 0 }),
    ]);

    expect(score).toBeCloseTo(0.8, 10);
  });

  it('reaches 100% even when a detractor holds part of the weight budget', () => {
    // The contributor's 0.75 is renormalized against itself, and the detractor
    // sitting on its own target takes nothing off.
    const score = computeCompositeScore([
      metric({ id: 'good', weight: 0.75, currentValue: 100 }),
      metric({
        id: 'emissions',
        weight: 0.25,
        polarity: 'detractor',
        direction: 'lower_is_better',
        baselineValue: 10,
        targetValue: 2,
        currentValue: 2,
      }),
    ]);

    expect(score).toBeCloseTo(1, 10);
  });

  it('subtracts a detractor sitting at its baseline, rather than averaging it in', () => {
    const contributors = [metric({ id: 'good', weight: 0.75, currentValue: 100 })];
    const detractor = metric({
      id: 'emissions',
      weight: 0.25,
      polarity: 'detractor',
      direction: 'lower_is_better',
      baselineValue: 10,
      targetValue: 2,
      currentValue: 10,
    });

    // Full weight comes off: 1.0 - 0.25.
    expect(computeCompositeScore([...contributors, detractor])).toBeCloseTo(0.75, 10);

    // Halfway to its target, half the penalty.
    expect(
      computeCompositeScore([...contributors, { ...detractor, currentValue: 6 }]),
    ).toBeCloseTo(0.875, 10);

    // Worse than its baseline is capped at the full penalty, not compounded.
    expect(
      computeCompositeScore([...contributors, { ...detractor, currentValue: 40 }]),
    ).toBeCloseTo(0.75, 10);
  });

  it('clamps at 0 when detractors outweigh contributors', () => {
    const score = computeCompositeScore([
      metric({ id: 'good', weight: 0.2, currentValue: 20 }),
      metric({
        id: 'bad',
        weight: 0.8,
        polarity: 'detractor',
        direction: 'lower_is_better',
        baselineValue: 10,
        targetValue: 0,
        currentValue: 10,
      }),
    ]);

    expect(score).toBe(0);
  });

  it('handles an empty set without dividing by zero', () => {
    expect(computeCompositeScore([])).toBe(0);
  });
});

describe('computeBreakdown', () => {
  it('returns contributions that sum to the score, signed by polarity', () => {
    const metrics = [
      metric({ id: 'a', weight: 0.5, currentValue: 80 }),
      metric({ id: 'b', weight: 0.3, currentValue: 40 }),
      metric({
        id: 'c',
        weight: 0.2,
        polarity: 'detractor',
        direction: 'lower_is_better',
        baselineValue: 10,
        targetValue: 0,
        currentValue: 5,
      }),
    ];

    const { score, contributions } = computeBreakdown(metrics);
    const summed = contributions.reduce((total, entry) => total + entry.points, 0);

    expect(summed).toBeCloseTo(score, 10);
    expect(contributions.find((entry) => entry.metric.id === 'c')?.points).toBeLessThan(0);
    expect(contributions.find((entry) => entry.metric.id === 'a')?.points).toBeGreaterThan(0);
  });

  it('orders by absolute impact, so the biggest mover is first', () => {
    const { contributions } = computeBreakdown([
      metric({ id: 'small', weight: 0.1, currentValue: 10 }),
      metric({ id: 'large', weight: 0.9, currentValue: 90 }),
    ]);

    expect(contributions[0].metric.id).toBe('large');
  });
});

describe('the live indicator set', () => {
  it('declares weights that sum to 1', () => {
    expect(Math.abs(weightError(WORLD_METRICS))).toBeLessThan(0.001);
  });

  it('scores a realistic mix in the plausible middle, not at either rail', () => {
    // Eleven contributors in varying health, one detractor above its own
    // baseline. Pinning the exact number would just restate the config, so this
    // asserts the range the model should land a world like today's in.
    expect(HUMANITY_PROGRESS).toBeGreaterThan(0.35);
    expect(HUMANITY_PROGRESS).toBeLessThan(0.7);
  });

  it('charges the full weight of emissions, which sit above their baseline', () => {
    const { contributions } = computeBreakdown(WORLD_METRICS);
    const co2 = contributions.find((entry) => entry.metric.id === 'co2-per-person');

    expect(co2?.normalized).toBe(0);
    expect(co2?.points).toBeCloseTo(-0.12, 10);
  });

  it('would score higher if emissions were on target, holding all else equal', () => {
    const onTarget = WORLD_METRICS.map((entry) =>
      entry.id === 'co2-per-person' ? { ...entry, currentValue: entry.targetValue } : entry,
    );

    expect(computeCompositeScore(onTarget)).toBeCloseTo(HUMANITY_PROGRESS + 0.12, 10);
  });
});
