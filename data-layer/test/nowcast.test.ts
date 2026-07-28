import { describe, expect, it } from 'vitest';

import { cagrFit, linearFit, nowcast, projectionConfidence } from '../src/nowcast/index.js';
import type { Observation } from '../src/types.js';

/** Annual observed points, one per year, starting at `startYear`. */
function series(startYear: number, values: number[], metricId = 'test'): Observation[] {
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

const LINEAR = { method: 'linear' as const, trailingWindowYears: 10 };
const CAGR = { method: 'cagr' as const, trailingWindowYears: 10 };

describe('nowcast direction', () => {
  it('projects UP for a rising series', () => {
    const rising = series(2015, [10, 12, 14, 16, 18, 20, 22, 24, 26, 28]);
    const result = nowcast(rising, new Date('2027-01-01'), LINEAR);

    expect(result.isProjected).toBe(true);
    expect(result.value).toBeGreaterThan(result.lastObservedValue);
    // Series ends 2024 at 28, rising +2/yr; asOf is three years past it.
    // Precision is 2 throughout: the fit measures time in 365.2425-day years,
    // so a whole-number calendar gap lands a fraction of a day off exact.
    expect(result.value).toBeCloseTo(34, 2);
  });

  it('projects DOWN for a falling series — no floor at the last observation', () => {
    const falling = series(2015, [28, 26, 24, 22, 20, 18, 16, 14, 12, 10]);
    const result = nowcast(falling, new Date('2027-01-01'), LINEAR);

    expect(result.isProjected).toBe(true);
    expect(result.value).toBeLessThan(result.lastObservedValue);
    // Ends 2024 at 10, falling -2/yr, three years on.
    expect(result.value).toBeCloseTo(4, 2);
  });

  it('follows a falling trend past zero into negative values', () => {
    // The requirement is that the trend is followed faithfully, not that the
    // output is kept comfortable. Clamping here would silently invent a floor
    // the data does not have.
    const falling = series(2015, [10, 9, 8, 7, 6, 5, 4, 3, 2, 1]);
    const result = nowcast(falling, new Date('2027-01-01'), LINEAR);

    expect(result.value).toBeLessThan(0);
  });

  it('projects down under CAGR too, without absolute-value tricks', () => {
    // Halving every two years.
    const decaying = series(2016, [100, 71, 50, 35, 25, 18, 12.5, 8.8, 6.25]);
    const result = nowcast(decaying, new Date('2026-01-01'), CAGR);

    expect(result.value).toBeLessThan(result.lastObservedValue);
    expect(result.value).toBeGreaterThan(0); // decays toward zero, never crosses
  });

  it('does not project at all when asOf is on or before the last observation', () => {
    const rising = series(2015, [10, 12, 14, 16, 18]);
    const result = nowcast(rising, new Date('2019-01-01'), LINEAR);

    expect(result.isProjected).toBe(false);
    expect(result.method).toBe('observed');
    expect(result.value).toBe(18);
    expect(result.confidence).toBe(1);
  });

  it('ignores points that arrived already projected when fitting', () => {
    // A republished nowcast that disagrees sharply with the observed trend must
    // not steer our own projection.
    const mixed: Observation[] = [
      ...series(2015, [10, 12, 14, 16, 18]),
      {
        ...series(2020, [99])[0],
        provenance: 'projected',
      },
    ];

    const result = nowcast(mixed, new Date('2021-01-01'), LINEAR);
    expect(result.lastObservedValue).toBe(18);
    expect(result.value).toBeCloseTo(22, 2);
  });
});

describe('nowcast confidence', () => {
  it('falls as asOf drifts further from the last observation', () => {
    const rising = series(2015, [10, 12, 14, 16, 18, 20, 22, 24, 26, 28]);

    const near = nowcast(rising, new Date('2025-01-01'), LINEAR);
    const far = nowcast(rising, new Date('2033-01-01'), LINEAR);

    expect(near.confidence).toBeGreaterThan(far.confidence);
    expect(far.confidence).toBeGreaterThan(0);
  });

  it('penalises a noisy window more than a clean one at the same drift', () => {
    const clean = series(2015, [10, 12, 14, 16, 18, 20, 22, 24, 26, 28]);
    const noisy = series(2015, [10, 25, 11, 30, 12, 28, 14, 31, 15, 28]);

    const asOf = new Date('2027-01-01');
    expect(nowcast(clean, asOf, LINEAR).confidence).toBeGreaterThan(
      nowcast(noisy, asOf, LINEAR).confidence,
    );
  });

  it('is 1 when nothing is being projected', () => {
    expect(projectionConfidence(0, 10, 1)).toBe(1);
    expect(projectionConfidence(-3, 10, 1)).toBe(1);
  });
});

describe('fits', () => {
  it('returns a negative slope for falling data', () => {
    const fit = linearFit([
      { t: 0, v: 10 },
      { t: 1, v: 8 },
      { t: 2, v: 6 },
    ]);
    expect(fit.slope).toBeCloseTo(-2, 10);
    expect(fit.r2).toBeCloseTo(1, 10);
  });

  it('reports CAGR as undefined for non-positive values rather than guessing', () => {
    expect(cagrFit({ t: 0, v: 0 }, { t: 5, v: 10 })).toBeNull();
    expect(cagrFit({ t: 0, v: 10 }, { t: 5, v: -1 })).toBeNull();
    expect(cagrFit({ t: 0, v: 10 }, { t: 0, v: 10 })).toBeNull();
  });

  it('falls back to linear when CAGR is undefined, still following the trend down', () => {
    // Crosses zero, so no ratio exists.
    const crossing = series(2016, [5, 4, 3, 2, 1, 0, -1, -2]);
    const result = nowcast(crossing, new Date('2025-01-01'), CAGR);

    expect(result.method).toBe('linear');
    expect(result.value).toBeLessThan(result.lastObservedValue);
  });

  it('holds flat with low confidence when there is only one observation', () => {
    const single = series(2020, [42]);
    const result = nowcast(single, new Date('2026-01-01'), LINEAR);

    expect(result.value).toBe(42);
    expect(result.isProjected).toBe(true);
    expect(result.confidence).toBeLessThan(0.1);
  });

  it('throws rather than inventing a value when there is nothing observed', () => {
    expect(() => nowcast([], new Date(), LINEAR)).toThrow(/at least one observed/);
  });
});
