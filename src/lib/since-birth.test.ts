import { describe, expect, it } from 'vitest';

import { normalizeMetric } from '../../data-layer/src/scoring/normalize.js';
import type { MetricConfig } from '../../data-layer/src/types.js';
import type { HumanityMetric } from '@/api/humanity';
import { comparisonsSinceBirth, compositeSinceBirth } from '@/lib/since-birth';

function metric(overrides: Partial<HumanityMetric> & Pick<HumanityMetric, 'id'>): HumanityMetric {
  return {
    label: overrides.id,
    category: 'health',
    currentValue: 0,
    isProjected: false,
    lastObservedAt: '2025-01-01',
    lastObservedValue: 0,
    sourceLastUpdated: null,
    normalized: 0.5,
    normalizedObserved: 0.5,
    contribution: 0,
    weight: 0.1,
    polarity: 'contributor',
    unit: '%',
    basis: '',
    delta: '',
    nowcastConfidence: 1,
    sourceName: 'Test',
    sourceUrl: 'https://example.com',
    series: [],
    ...overrides,
  } as HumanityMetric;
}

describe('comparisonsSinceBirth', () => {
  it('reads the last observation at or before the birthday, not the nearest', () => {
    const [comparison] = comparisonsSinceBirth(
      [
        metric({
          id: 'poverty',
          direction: 'lower_is_better',
          currentValue: 8,
          series: [
            { t: '1998-01-01', v: 28 },
            // Closer to the birthday than 1998, but hadn't happened yet.
            { t: '2000-01-01', v: 24 },
          ],
        }),
      ],
      '1999-06-15',
    );

    expect(comparison.fromValue).toBe(28);
    expect(comparison.fromYear).toBe('1998');
  });

  it('drops a metric whose series begins after the birthday', () => {
    const comparisons = comparisonsSinceBirth(
      [
        metric({
          id: 'internet',
          direction: 'higher_is_better',
          currentValue: 68,
          series: [{ t: '2005-01-01', v: 16 }],
        }),
      ],
      '1990-03-02',
    );

    expect(comparisons).toEqual([]);
  });

  it('calls a fall in a lower-is-better metric progress, and a rise not', () => {
    const falling = metric({
      id: 'poverty',
      direction: 'lower_is_better',
      currentValue: 8,
      series: [{ t: '1990-01-01', v: 28 }],
    });
    const rising = metric({
      id: 'co2',
      direction: 'lower_is_better',
      currentValue: 4.8,
      series: [{ t: '1990-01-01', v: 4 }],
    });

    const byId = new Map(
      comparisonsSinceBirth([falling, rising], '1995-01-01').map((c) => [c.metric.id, c]),
    );

    expect(byId.get('poverty')?.isProgress).toBe(true);
    expect(byId.get('co2')?.isProgress).toBe(false);
  });

  it('reports "don\'t know" rather than a guess when direction is missing', () => {
    const [comparison] = comparisonsSinceBirth(
      [
        metric({
          id: 'legacy-artifact',
          currentValue: 80,
          series: [{ t: '1990-01-01', v: 65 }],
        }),
      ],
      '1995-01-01',
    );

    expect(comparison.isProgress).toBeNull();
  });

  it('ranks by size of change, regardless of whether it is good news', () => {
    const comparisons = comparisonsSinceBirth(
      [
        metric({
          id: 'small-win',
          direction: 'higher_is_better',
          currentValue: 110,
          series: [{ t: '1990-01-01', v: 100 }],
        }),
        metric({
          id: 'big-regression',
          direction: 'lower_is_better',
          currentValue: 200,
          series: [{ t: '1990-01-01', v: 100 }],
        }),
      ],
      '1995-01-01',
    );

    expect(comparisons.map((c) => c.metric.id)).toEqual(['big-regression', 'small-win']);
  });

  it('ignores changes small enough to be noise', () => {
    const comparisons = comparisonsSinceBirth(
      [
        metric({
          id: 'flat',
          direction: 'higher_is_better',
          currentValue: 100.4,
          series: [{ t: '2024-01-01', v: 100 }],
        }),
      ],
      '2024-06-01',
    );

    expect(comparisons).toEqual([]);
  });

  it('skips a zero baseline rather than dividing by it', () => {
    const comparisons = comparisonsSinceBirth(
      [
        metric({
          id: 'from-nothing',
          direction: 'higher_is_better',
          currentValue: 40,
          series: [{ t: '1990-01-01', v: 0 }],
        }),
      ],
      '1995-01-01',
    );

    expect(comparisons).toEqual([]);
  });

  it('reads the value at the birthday, not the current value, for the "from" side', () => {
    const [comparison] = comparisonsSinceBirth(
      [
        metric({
          id: 'literacy',
          direction: 'higher_is_better',
          currentValue: 87,
          series: [
            { t: '1980-01-01', v: 68 },
            { t: '1995-01-01', v: 76 },
          ],
        }),
      ],
      '1996-01-01',
    );

    expect(comparison.fromValue).toBe(76);
    expect(comparison.toValue).toBe(87);
  });

  it('honours the limit', () => {
    const many = Array.from({ length: 8 }, (_, index) =>
      metric({
        id: `m${index}`,
        direction: 'higher_is_better',
        currentValue: 100 + index * 10,
        series: [{ t: '1990-01-01', v: 100 }],
      }),
    );

    expect(comparisonsSinceBirth(many, '1995-01-01', 3)).toHaveLength(3);
  });
});

/**
 * The client mirrors the data layer's scoring model — see `scoreOver`. These
 * are the guard that keeps the copy honest: if the model changes on the server
 * and not here, "Human progress since you were born" starts quoting a number
 * the Progress tab disagrees with, and nothing else would catch it.
 */
describe('composite scoring mirrors the data layer', () => {
  function config(overrides: Partial<MetricConfig> & Pick<MetricConfig, 'id'>): MetricConfig {
    return {
      label: overrides.id,
      category: 'health',
      baselineValue: 100,
      targetValue: 0,
      direction: 'lower_is_better',
      weight: 0.5,
      polarity: 'contributor',
      nowcastMethod: 'linear',
      trailingWindowYears: 10,
      sourceAdapterId: 'test',
      unit: '%',
      basis: '',
      ...overrides,
    } as MetricConfig;
  }

  const cases: { name: string; config: MetricConfig; value: number }[] = [
    { name: 'midway on a falling metric', config: config({ id: 'a' }), value: 50 },
    { name: 'on target', config: config({ id: 'b' }), value: 0 },
    { name: 'on baseline', config: config({ id: 'c' }), value: 100 },
    { name: 'past the target', config: config({ id: 'd' }), value: -20 },
    { name: 'regressed past baseline', config: config({ id: 'e' }), value: 400 },
    {
      name: 'midway on a rising metric',
      config: config({ id: 'f', baselineValue: 20, targetValue: 100, direction: 'higher_is_better' }),
      value: 60,
    },
  ];

  for (const testCase of cases) {
    it(`normalizes the same as the data layer: ${testCase.name}`, () => {
      const asArtifact = metric({
        id: testCase.config.id,
        baselineValue: testCase.config.baselineValue,
        targetValue: testCase.config.targetValue,
        direction: testCase.config.direction,
        weight: testCase.config.weight,
        polarity: testCase.config.polarity,
        currentValue: testCase.value,
        series: [{ t: '1990-01-01', v: testCase.value }],
      });

      // No composite helper exposes `normalize` directly, so it is exercised
      // through a single-metric score, where the two are equal by construction:
      // one metric holding the whole weight is its own weighted mean.
      const composite = compositeSinceBirth([asArtifact], '1995-01-01');
      expect(composite).not.toBeNull();

      const expected = Math.min(1, Math.max(0, normalizeMetric(testCase.config, testCase.value)));
      expect(composite!.toScore).toBeCloseTo(expected, 10);
    });
  }
});

describe('compositeSinceBirth', () => {
  const poverty = metric({
    id: 'poverty',
    direction: 'lower_is_better',
    baselineValue: 40,
    targetValue: 0,
    weight: 0.5,
    polarity: 'contributor',
    currentValue: 10,
    series: [{ t: '1990-01-01', v: 30 }],
  });

  const co2 = metric({
    id: 'co2',
    direction: 'lower_is_better',
    baselineValue: 4,
    targetValue: 2,
    weight: 0.5,
    polarity: 'detractor',
    currentValue: 4.5,
    series: [{ t: '1990-01-01', v: 4.2 }],
  });

  it('scores both ends over the same metric set', () => {
    const result = compositeSinceBirth([poverty, co2], '1995-01-01');

    // from: poverty (40→0 scale) at 30 normalizes to 0.25. co2 (4→2 scale) at
    // 4.2 sits past its own baseline, at -0.1. Equal weights, so 0.075.
    expect(result!.fromScore).toBeCloseTo(0.075, 10);

    // to: poverty at 10 → 0.75. co2 at 4.5 → -0.25. Mean of those is 0.25.
    expect(result!.toScore).toBeCloseTo(0.25, 10);
    expect(result!.deltaPoints).toBeCloseTo(17.5, 10);
  });

  it('floors a negative total at both ends rather than only one', () => {
    // A clamp that fires at one end and not the other overstates the move, so
    // it is worth pinning that both ends go through the same clamp.
    const regressed = [poverty, co2].map((entry) => ({
      ...entry,
      // Both well past their own baselines, at each end.
      currentValue: 200,
      series: [{ t: '1990-01-01', v: 200 }],
    }));

    const result = compositeSinceBirth(regressed, '1995-01-01');

    expect(result!.fromScore).toBe(0);
    expect(result!.toScore).toBe(0);
    expect(result!.deltaPoints).toBe(0);
  });

  it('reports a rise when the improving metrics outrun the worsening ones', () => {
    const improving = metric({
      id: 'literacy',
      direction: 'higher_is_better',
      baselineValue: 50,
      targetValue: 100,
      weight: 1,
      polarity: 'contributor',
      currentValue: 90,
      series: [{ t: '1990-01-01', v: 60 }],
    });

    const result = compositeSinceBirth([improving], '1995-01-01');

    expect(result!.fromScore).toBeCloseTo(0.2, 10);
    expect(result!.toScore).toBeCloseTo(0.8, 10);
    expect(result!.deltaPoints).toBeCloseTo(60, 10);
  });

  it('excludes metrics whose history starts after the birthday, at both ends', () => {
    const late = metric({
      id: 'internet',
      direction: 'higher_is_better',
      baselineValue: 0,
      targetValue: 100,
      weight: 1,
      polarity: 'contributor',
      currentValue: 68,
      series: [{ t: '2005-01-01', v: 16 }],
    });

    const early = metric({
      id: 'literacy',
      direction: 'higher_is_better',
      baselineValue: 50,
      targetValue: 100,
      weight: 1,
      polarity: 'contributor',
      currentValue: 90,
      series: [{ t: '1990-01-01', v: 60 }],
    });

    const result = compositeSinceBirth([late, early], '1995-01-01');

    expect(result!.coverage).toEqual({ scored: 1, total: 2 });
    // Scored over literacy alone — the same answer as if `late` weren't there.
    expect(result!.toScore).toBeCloseTo(0.8, 10);
  });

  it('returns null when too little of the model reaches back that far', () => {
    const late = metric({
      id: 'internet',
      baselineValue: 0,
      targetValue: 100,
      currentValue: 68,
      series: [{ t: '2005-01-01', v: 16 }],
    });
    const early = metric({
      id: 'literacy',
      baselineValue: 50,
      targetValue: 100,
      currentValue: 90,
      series: [{ t: '1990-01-01', v: 60 }],
    });
    const alsoLate = metric({
      id: 'renewables',
      baselineValue: 0,
      targetValue: 100,
      currentValue: 30,
      series: [{ t: '2010-01-01', v: 5 }],
    });

    expect(compositeSinceBirth([late, early, alsoLate], '1995-01-01')).toBeNull();
  });

  it('returns null on an artifact published before the anchors existed', () => {
    const legacy = metric({
      id: 'legacy',
      currentValue: 90,
      series: [{ t: '1990-01-01', v: 60 }],
    });

    expect(compositeSinceBirth([legacy], '1995-01-01')).toBeNull();
  });
});
