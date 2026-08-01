import { describe, expect, it } from 'vitest';

import { METRICS } from '../src/config/metrics.js';
import { computeCompositeScore, scoreAt } from '../src/scoring/composite.js';
import {
  NORMALIZED_FLOOR,
  normalizeMetric,
  validateMetricConfigs,
} from '../src/scoring/normalize.js';
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

/** A series carrying no observed point, which `nowcast` refuses to project from. */
function projectedSeries(metricId: string, startYear: number, values: number[]): Observation[] {
  return series(metricId, startYear, values).map((observation) => ({
    ...observation,
    provenance: 'projected' as const,
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

/**
 * `null` is "cannot be placed on its scale", and it is emphatically not 0.
 *
 * 0 in this model is a claim — sitting exactly at baseline, no progress made —
 * and returning it for a metric we could not measure biases the composite
 * downward invisibly, because the two then read identically.
 */
describe('normalizeMetric — unscoreable', () => {
  it('returns null for a degenerate span rather than the pessimistic end', () => {
    expect(normalizeMetric(config({ baselineValue: 5, targetValue: 5 }), 5)).toBeNull();
    expect(normalizeMetric(config({ baselineValue: 0, targetValue: Infinity }), 5)).toBeNull();
  });

  it('returns null for a non-finite value', () => {
    expect(normalizeMetric(config(), NaN)).toBeNull();
    expect(normalizeMetric(config(), Infinity)).toBeNull();
  });

  it('still throws on a config contradiction — that is a bug, not missing data', () => {
    // The two must not collapse into one signal. Absence is now a normal,
    // silent, expected condition; a contradiction has to stay loud.
    expect(() => normalizeMetric(config({ direction: 'lower_is_better' }), NaN)).toThrow(
      /contradicts anchors/,
    );
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

  it('averages a detractor in like any other metric', () => {
    // `normalized` is already direction-corrected by the signed span, so a
    // detractor carries no handicap here — it is one more term in the mean.
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

    const observations = new Map([
      ['good', series('good', 2020, [80, 80, 80])], // normalized 0.8
      ['emissions', series('emissions', 2020, [10, 10, 10])], // at baseline, normalized 0
    ]);

    // 0.8 * 0.8 + 0.2 * 0
    expect(scoreAt({ configs, observations, asOf }).score).toBeCloseTo(0.64, 10);
  });

  it('scores a detractor sitting on its target as full marks for that weight', () => {
    // The case the old handicap could not express: a detractor on target used
    // to cost nothing but could never *earn* anything either, so a world of
    // solved detractors was capped below 100%.
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

    const solved = new Map([
      ['good', series('good', 2020, [100, 100, 100])],
      ['emissions', series('emissions', 2020, [2, 2, 2])],
    ]);

    expect(scoreAt({ configs, observations: solved, asOf }).score).toBeCloseTo(1, 10);
  });

  it('scores an all-at-baseline world as 0 before the clamp, not by clamping', () => {
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
      ['good', series('good', 2020, [0, 0, 0])],
      ['emissions', series('emissions', 2020, [10, 10, 10])],
    ]);

    const { score, contributions } = scoreAt({ configs, observations: atBaseline, asOf });

    // Contributions sum to the *unclamped* total. Under the old detractor
    // handicap this read -0.2 and only surfaced as 0 because of `Math.max`.
    const raw = contributions.reduce((total, entry) => total + entry.contribution, 0);
    expect(raw).toBe(0);
    expect(score).toBe(0);
  });

  it('lets a regressed metric drag the total below its at-baseline level', () => {
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

    expect(a).toBeCloseTo(0.8, 10); // 0.8 * 1 + 0.2 * 0
    expect(b).toBeCloseTo(0.7, 10); // 0.8 * 1 + 0.2 * -0.5
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

  it('excludes a metric with no observations instead of scoring it as zero', () => {
    const configs = [
      config({ id: 'measured', weight: 0.5 }),
      config({ id: 'pending', weight: 0.5 }),
    ];

    // Only one of the two has a series behind it.
    const observations = new Map([['measured', series('measured', 2020, [80, 80, 80])]]);

    const { score, coverage, contributions } = scoreAt({ configs, observations, asOf });

    // 0.8, not 0.4. The unmeasured half leaves the denominator too.
    expect(score).toBeCloseTo(0.8, 10);
    expect(coverage).toBeCloseTo(0.5, 10);

    // It still appears, so the UI can say "no data yet" rather than dropping it.
    const pending = contributions.find((entry) => entry.metricId === 'pending')!;
    expect(pending.hasData).toBe(false);
    expect(pending.contribution).toBe(0);
    expect(contributions.find((entry) => entry.metricId === 'measured')!.hasData).toBe(true);
  });

  it('reports full coverage when every metric has data', () => {
    const configs = [config({ id: 'a', weight: 0.5 }), config({ id: 'b', weight: 0.5 })];
    const observations = new Map([
      ['a', series('a', 2020, [50, 50, 50])],
      ['b', series('b', 2020, [50, 50, 50])],
    ]);

    expect(scoreAt({ configs, observations, asOf }).coverage).toBeCloseTo(1, 10);
  });

  it('measures coverage by weight, not by count', () => {
    // Three metrics, one of them holding 80% of the budget. Losing that one is
    // not "a third missing", which is the whole reason coverage is weighted.
    const configs = [
      config({ id: 'heavy', weight: 0.8 }),
      config({ id: 'light-a', weight: 0.1 }),
      config({ id: 'light-b', weight: 0.1 }),
    ];

    const observations = new Map([
      ['light-a', series('light-a', 2020, [50, 50, 50])],
      ['light-b', series('light-b', 2020, [50, 50, 50])],
    ]);

    expect(scoreAt({ configs, observations, asOf }).coverage).toBeCloseTo(0.2, 10);
  });

  it('marks a metric whose nowcast throws unscored, rather than failing the run', () => {
    // `nowcast` throws when a series carries no *observed* point to project
    // from — an all-projected series does that, and OWID republishes other
    // people's nowcasts, so it is reachable. Caught per metric, that metric
    // drops out and the rest of the model still produces a number. Before, it
    // propagated out of `scoreAt` and took the whole run with it.
    const configs = [
      config({ id: 'measured', weight: 0.5 }),
      config({ id: 'unprojectable', weight: 0.5 }),
    ];

    const observations = new Map([
      ['measured', series('measured', 2016, [10, 15, 20, 25, 30, 35, 40, 45, 50, 55])],
      ['unprojectable', projectedSeries('unprojectable', 2020, [40, 41, 42])],
    ]);

    const result = computeCompositeScore({ configs, observations, asOf: new Date('2026-06-01') });

    expect(result.coverage).toBeCloseTo(0.5, 10);
    expect(result.deltaVsLastWeek).not.toBeNull();
    expect(result.deltaVsLastMonth).not.toBeNull();

    const entry = result.perMetricContributions.find((c) => c.metricId === 'unprojectable')!;
    expect(entry.hasData).toBe(false);
  });

  it('reports a null delta when nothing at all could be scored', () => {
    // A composite over zero weight is 0 by arithmetic, not by finding.
    // Differencing against it would report the arrival of data as a collapse.
    const configs = [config({ id: 'late', weight: 1 })];
    const observations = new Map([['late', projectedSeries('late', 2020, [40, 41])]]);

    const result = computeCompositeScore({ configs, observations, asOf: new Date('2026-06-01') });

    expect(result.coverage).toBe(0);
    expect(result.score).toBe(0);
    expect(result.deltaVsLastWeek).toBeNull();
    expect(result.deltaVsLastMonth).toBeNull();
    expect(result.direction).toBe('flat');
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

/**
 * Config errors have to fail loudly and up front.
 *
 * Inside `scoreAt` the throw disappears into `safeScoreAt` and surfaces as a
 * missing delta. Now that absent data is a normal, silent condition, that is
 * exactly where a real bug would hide.
 */
describe('validateMetricConfigs', () => {
  it('accepts a well-formed set', () => {
    expect(() =>
      validateMetricConfigs([
        config({ id: 'rising' }),
        config({ id: 'falling', direction: 'lower_is_better', baselineValue: 40, targetValue: 10 }),
      ]),
    ).not.toThrow();
  });

  it('rejects a direction that contradicts the anchors', () => {
    expect(() => validateMetricConfigs([config({ id: 'wrong', direction: 'lower_is_better' })])).toThrow(
      /wrong: direction "lower_is_better" contradicts anchors/,
    );
  });

  it('rejects a degenerate span', () => {
    expect(() =>
      validateMetricConfigs([config({ id: 'flat', baselineValue: 5, targetValue: 5 })]),
    ).toThrow(/flat: baseline and target are both 5/);
  });

  it('rejects a non-finite anchor', () => {
    expect(() =>
      validateMetricConfigs([config({ id: 'infinite', targetValue: Infinity })]),
    ).toThrow(/infinite: non-finite anchor/);
  });

  it('names every offender in one message rather than stopping at the first', () => {
    let message = '';
    try {
      validateMetricConfigs([
        config({ id: 'ok' }),
        config({ id: 'bad-direction', direction: 'lower_is_better' }),
        config({ id: 'bad-span', baselineValue: 3, targetValue: 3 }),
        config({ id: 'bad-anchor', baselineValue: NaN }),
      ]);
    } catch (error) {
      message = (error as Error).message;
    }

    expect(message).toMatch(/bad-direction/);
    expect(message).toMatch(/bad-span/);
    expect(message).toMatch(/bad-anchor/);
    expect(message).not.toMatch(/\bok:/);
  });

  it('does not report a non-finite anchor twice under two headings', () => {
    let message = '';
    try {
      validateMetricConfigs([config({ id: 'nan', baselineValue: NaN })]);
    } catch (error) {
      message = (error as Error).message;
    }

    expect(message.match(/nan:/g)).toHaveLength(1);
  });
});

describe('live metric config', () => {
  it('passes its own anchor validation', () => {
    // METRICS validates itself at import, so this is really a guard against
    // that call being deleted — the check that the check is wired up.
    expect(() => validateMetricConfigs(METRICS)).not.toThrow();
  });

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
