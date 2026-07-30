import { describe, expect, it } from 'vitest';

import { isMovingWrongWay, isRegressing, type HumanityMetric } from './humanity';

/**
 * `isRegressing` vs `isMovingWrongWay`.
 *
 * These answer different questions — position against the baseline, and which
 * way the series is going — and the cases below are the ones where the answers
 * differ. Arctic sea ice is not a hypothetical: it shipped green with a
 * 1.9M km² loss in its delta pill because the card coloured by position.
 */

function metric(overrides: Partial<HumanityMetric>): HumanityMetric {
  return {
    id: 'test',
    label: 'Test',
    category: 'environment',
    currentValue: 0,
    isProjected: false,
    lastObservedAt: '2026-01-01',
    lastObservedValue: 0,
    sourceLastUpdated: null,
    normalized: 0.5,
    normalizedObserved: 0.5,
    contribution: 0,
    weight: 0.05,
    polarity: 'contributor',
    unit: '%',
    basis: '',
    delta: '',
    nowcastConfidence: 1,
    sourceName: '',
    sourceUrl: '',
    series: [],
    ...overrides,
  };
}

describe('isMovingWrongWay', () => {
  it('flags a falling series that is meant to rise, even when normalized is positive', () => {
    // The Arctic sea ice case, with its real numbers. Baseline is anchored at
    // the record low, so sitting at the worst level in the satellite record
    // still normalises just above zero and `isRegressing` reads false.
    const seaIce = metric({
      id: 'arctic-sea-ice',
      direction: 'higher_is_better',
      polarity: 'detractor',
      normalized: 0.002,
      series: [
        { t: '1979-05-01', v: 12.425 },
        { t: '2010-01-01', v: 10.833 },
        { t: '2026-01-01', v: 10.108 },
      ],
    });

    expect(isRegressing(seaIce)).toBe(false);
    expect(isMovingWrongWay(seaIce)).toBe(true);
  });

  it('leaves a rising series that is meant to rise alone', () => {
    const renewables = metric({
      direction: 'higher_is_better',
      normalized: 0.201,
      series: [
        { t: '1990-01-01', v: 16.2 },
        { t: '2025-01-01', v: 35.1 },
      ],
    });

    expect(isMovingWrongWay(renewables)).toBe(false);
  });

  it('flags a rising series that is meant to fall', () => {
    const co2 = metric({
      direction: 'lower_is_better',
      normalized: -0.5,
      series: [
        { t: '2016-01-01', v: 401.6 },
        { t: '2026-07-01', v: 428.4 },
      ],
    });

    expect(isMovingWrongWay(co2)).toBe(true);
  });

  it('leaves a falling series that is meant to fall alone', () => {
    const poverty = metric({
      direction: 'lower_is_better',
      normalized: 0.807,
      series: [
        { t: '1990-01-01', v: 43.4 },
        { t: '2023-01-01', v: 10.6 },
      ],
    });

    expect(isMovingWrongWay(poverty)).toBe(false);
  });

  it('ignores the projected tail, so the colour agrees with the delta', () => {
    // `delta` is computed from observed points only. If the projection pointed
    // the other way the pill would be one colour and its own text the other.
    const rising = metric({
      direction: 'higher_is_better',
      series: [
        { t: '2020-01-01', v: 10 },
        { t: '2024-01-01', v: 12 },
        { t: '2026-01-01', v: 8, projected: true },
      ],
    });

    expect(isMovingWrongWay(rising)).toBe(false);
  });

  it('treats a dead-flat series as neutral rather than as a problem', () => {
    const flat = metric({
      direction: 'higher_is_better',
      series: [
        { t: '2020-01-01', v: 10 },
        { t: '2026-01-01', v: 10 },
      ],
    });

    expect(isMovingWrongWay(flat)).toBe(false);
  });

  it('falls back to position when the artifact predates the direction field', () => {
    // `direction` is optional — artifacts published before it was added do not
    // carry it, and the app reads whatever is currently in the bucket.
    const old = metric({
      direction: undefined,
      normalized: -0.2,
      series: [
        { t: '2020-01-01', v: 10 },
        { t: '2026-01-01', v: 12 },
      ],
    });

    expect(isMovingWrongWay(old)).toBe(true);

    const fine = metric({ direction: undefined, normalized: 0.4, series: [] });
    expect(isMovingWrongWay(fine)).toBe(false);
  });

  it('falls back to position when there is nothing to compare', () => {
    const single = metric({
      direction: 'higher_is_better',
      normalized: -0.3,
      series: [{ t: '2026-01-01', v: 10 }],
    });

    expect(isMovingWrongWay(single)).toBe(true);
  });
});
