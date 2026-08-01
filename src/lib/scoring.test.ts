import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import {
  computeComposite,
  defaultWeightsFrom,
  isDefaultWeighting,
  toScorable,
  unclampedComposite,
  type CategoryWeights,
  type ScorableMetric,
} from './scoring';

/**
 * The composite, and the guarantee that this client-side copy still agrees with
 * the server that produced the artifact.
 *
 * The last test is the important one. Everything above it checks the formula
 * behaves; that one checks it is the *same* formula as the data layer's, which
 * is the failure mode two implementations of one model actually have.
 */

function metric(overrides: Partial<ScorableMetric> = {}): ScorableMetric {
  return {
    id: 'm',
    category: 'health',
    weight: 0.1,
    normalized: 0.5,
    hasData: true,
    polarity: 'contributor',
    ...overrides,
  };
}

describe('computeComposite', () => {
  it('matches a hand-computed case', () => {
    // Two metrics, equal weight, one category. The rescaled weights sum to 1,
    // so the result is the plain mean of the normalized values regardless of
    // the absolute weights.
    const result = computeComposite(
      [
        metric({ id: 'a', weight: 0.1, normalized: 0.8 }),
        metric({ id: 'b', weight: 0.1, normalized: 0.4 }),
      ],
      { health: 20 },
    );

    expect(result.score).toBeCloseTo(0.6, 6);
  });

  it('weights within a category by the metrics own weights', () => {
    // 0.75 * (0.15/0.20) + 0.35 * (0.05/0.20) = 0.5625 + 0.0875 = 0.65
    const result = computeComposite(
      [
        metric({ id: 'a', weight: 0.15, normalized: 0.75 }),
        metric({ id: 'b', weight: 0.05, normalized: 0.35 }),
      ],
      { health: 20 },
    );

    expect(result.score).toBeCloseTo(0.65, 6);
  });

  it('falls when an input worsens', () => {
    const before = computeComposite(
      [
        metric({ id: 'a', normalized: 0.6 }),
        metric({ id: 'b', category: 'environment', normalized: 0.5, polarity: 'detractor' }),
      ],
      { health: 20, environment: 15 },
    );

    const after = computeComposite(
      [
        metric({ id: 'a', normalized: 0.6 }),
        // The detractor regresses past its baseline.
        metric({ id: 'b', category: 'environment', normalized: -0.4, polarity: 'detractor' }),
      ],
      { health: 20, environment: 15 },
    );

    expect(after.score).toBeLessThan(before.score);
  });

  it('lets a regressed metric pull the composite down, not merely fail to lift it', () => {
    // The whole reason `normalized` floors at -0.5 rather than 0: a metric that
    // has gone backwards past its own baseline carries a negative term into the
    // mean, so it drags rather than contributing nothing.
    const mild = computeComposite(
      [
        metric({ id: 'a', normalized: 1 }),
        metric({ id: 'b', category: 'environment', normalized: 0, polarity: 'detractor' }),
      ],
      { health: 50, environment: 50 },
    );

    const severe = computeComposite(
      [
        metric({ id: 'a', normalized: 1 }),
        metric({ id: 'b', category: 'environment', normalized: -0.5, polarity: 'detractor' }),
      ],
      { health: 50, environment: 50 },
    );

    // Half the weight each: (1 + 0) / 2, then (1 + -0.5) / 2.
    expect(mild.score).toBeCloseTo(0.5, 6);
    expect(severe.score).toBeCloseTo(0.25, 6);
  });

  it('responds to custom user weights', () => {
    const metrics = [
      metric({ id: 'a', category: 'health', normalized: 0.9 }),
      metric({ id: 'b', category: 'environment', normalized: 0.1 }),
    ];

    const balanced = computeComposite(metrics, { health: 50, environment: 50 });
    const healthHeavy = computeComposite(metrics, { health: 90, environment: 10 });
    const envHeavy = computeComposite(metrics, { health: 10, environment: 90 });

    expect(balanced.score).toBeCloseTo(0.5, 6);
    expect(healthHeavy.score).toBeGreaterThan(balanced.score);
    expect(envHeavy.score).toBeLessThan(balanced.score);
  });

  it('does not require weights to sum to 100', () => {
    const metrics = [
      metric({ id: 'a', category: 'health', normalized: 0.9 }),
      metric({ id: 'b', category: 'environment', normalized: 0.1 }),
    ];

    // Same ratio, wildly different totals. Normalising by the sum of the weights
    // is what makes these agree.
    expect(computeComposite(metrics, { health: 1, environment: 1 }).score).toBeCloseTo(
      computeComposite(metrics, { health: 500, environment: 500 }).score,
      6,
    );
  });

  it('skips a category that has no metrics, rather than draining weight into it', () => {
    const metrics = [metric({ id: 'a', category: 'health', normalized: 0.8 })];

    // freedom_rights is weighted but empty. If it took a share, the score would
    // be dragged toward zero by a category that measures nothing.
    const result = computeComposite(metrics, { health: 20, freedom_rights: 80 });

    expect(result.score).toBeCloseTo(0.8, 6);
  });

  it('ignores a zero-weight metric without dividing by zero', () => {
    // `disease-outbreaks` ships at weight 0 on purpose.
    const result = computeComposite(
      [
        metric({ id: 'a', normalized: 0.6 }),
        metric({ id: 'zero', weight: 0, normalized: 0.99 }),
      ],
      { health: 20 },
    );

    expect(result.score).toBeCloseTo(0.6, 6);
    expect(Number.isFinite(result.score)).toBe(true);
  });

  it('scores every metric on target as exactly 1, detractors included', () => {
    const result = computeComposite(
      [
        metric({ id: 'a', category: 'health', weight: 0.15, normalized: 1 }),
        metric({ id: 'b', category: 'environment', weight: 0.05, normalized: 1, polarity: 'detractor' }),
        metric({ id: 'c', category: 'peace_safety', weight: 0.3, normalized: 1, polarity: 'detractor' }),
      ],
      { health: 20, environment: 15, peace_safety: 15 },
    );

    expect(result.score).toBe(1);
  });

  it('scores every metric at baseline as exactly 0, before any clamping', () => {
    // The point of asserting the *unclamped* number: under the old detractor
    // handicap this world scored -(detractor weight) and only read as 0%
    // because `Math.max(0, …)` hid it.
    const atBaseline = [
      metric({ id: 'a', category: 'health', weight: 0.15, normalized: 0 }),
      metric({ id: 'b', category: 'environment', weight: 0.05, normalized: 0, polarity: 'detractor' }),
      metric({ id: 'c', category: 'peace_safety', weight: 0.3, normalized: 0, polarity: 'detractor' }),
    ];
    const weights = { health: 20, environment: 15, peace_safety: 15 };

    expect(unclampedComposite(atBaseline, weights)).toBe(0);
    expect(computeComposite(atBaseline, weights).score).toBe(0);
  });

  it('lets an all-detractor weighting reach 1.0 with those metrics on target', () => {
    // The reader put everything on categories holding only detractors. Under
    // the old handicap every term was <= 0 and this read 0% no matter how well
    // the indicators were doing — an arithmetic ceiling, not a finding.
    const result = computeComposite(
      [
        metric({ id: 'a', category: 'peace_safety', normalized: 1, polarity: 'detractor' }),
        metric({ id: 'b', category: 'peace_safety', normalized: 1, polarity: 'detractor' }),
        metric({ id: 'c', category: 'health', normalized: 0.5, polarity: 'contributor' }),
      ],
      { peace_safety: 100, health: 0 },
    );

    expect(result.score).toBe(1);
  });

  it('reads all-detractor progress as the weighted mean of it', () => {
    // 0.8 * (0.15/0.20) + 0.2 * (0.05/0.20) = 0.6 + 0.05 = 0.65.
    const detractors = [
      metric({ id: 'a', category: 'peace_safety', weight: 0.15, normalized: 0.8, polarity: 'detractor' }),
      metric({ id: 'b', category: 'peace_safety', weight: 0.05, normalized: 0.2, polarity: 'detractor' }),
    ];

    expect(computeComposite(detractors, { peace_safety: 100 }).score).toBeCloseTo(0.65, 6);

    const atBaseline = detractors.map((m) => ({ ...m, normalized: 0 }));
    expect(computeComposite(atBaseline, { peace_safety: 100 }).score).toBe(0);

    const regressed = detractors.map((m) => ({ ...m, normalized: -0.5 }));
    expect(unclampedComposite(regressed, { peace_safety: 100 })).toBeCloseTo(-0.5, 6);
    expect(computeComposite(regressed, { peace_safety: 100 }).score).toBe(0);
  });

  it('treats a detractor as an ordinary term in the mean', () => {
    // The metric's own weight carries it, and nothing else. 0.9 * 1 + 0.1 * 0.
    const result = computeComposite(
      [
        metric({ id: 'a', category: 'health', weight: 0.1, normalized: 1 }),
        metric({ id: 'b', category: 'environment', weight: 0.1, normalized: 0, polarity: 'detractor' }),
      ],
      { health: 90, environment: 10 },
    );

    expect(result.score).toBeCloseTo(0.9, 6);
  });

  it('returns zero rather than NaN when every weight is zero', () => {
    const result = computeComposite([metric({ id: 'a' })], { health: 0 });

    expect(result.score).toBe(0);
    expect(Number.isNaN(result.score)).toBe(false);
  });

  it('reports a per-category breakdown', () => {
    const result = computeComposite(
      [
        metric({ id: 'a', category: 'health', weight: 0.15, normalized: 0.8 }),
        metric({ id: 'b', category: 'health', weight: 0.05, normalized: 0.4 }),
        metric({ id: 'c', category: 'environment', weight: 0.15, normalized: 0.2 }),
      ],
      { health: 20, environment: 15 },
    );

    const health = result.categories.find((entry) => entry.categoryId === 'health');
    // 0.8 * 0.75 + 0.4 * 0.25 = 0.7
    expect(health?.score).toBeCloseTo(70, 4);
    expect(health?.metricCount).toBe(2);
    expect(health?.unscoredMetricCount).toBe(0);

    const total = result.categories.reduce((sum, entry) => sum + entry.effectiveWeight, 0);
    expect(total).toBeCloseTo(1, 6);
  });
});

/**
 * The breakdown has to add up to the number above it.
 *
 * The home screen itemises these under the reader's own weighting. If they were
 * taken from the artifact instead they would be shares of the research score,
 * and the one reader who opened the breakdown to check the arithmetic is
 * exactly the one who would notice.
 */
describe('computeComposite — per-metric shares', () => {
  it('sums to the unclamped score', () => {
    const metrics = [
      metric({ id: 'a', category: 'health', weight: 0.15, normalized: 0.8 }),
      metric({ id: 'b', category: 'health', weight: 0.05, normalized: -0.3 }),
      metric({ id: 'c', category: 'environment', weight: 0.15, normalized: 0.2 }),
    ];
    const weights = { health: 20, environment: 15 };

    const total = computeComposite(metrics, weights).contributions.reduce(
      (sum, entry) => sum + entry.contribution,
      0,
    );

    expect(total).toBeCloseTo(unclampedComposite(metrics, weights), 12);
  });

  it('tracks the readers weighting, not the artifacts', () => {
    const metrics = [
      metric({ id: 'a', category: 'health', weight: 0.1, normalized: 1 }),
      metric({ id: 'b', category: 'environment', weight: 0.1, normalized: 1 }),
    ];

    const healthHeavy = computeComposite(metrics, { health: 90, environment: 10 });
    const byId = new Map(healthHeavy.contributions.map((entry) => [entry.metricId, entry]));

    expect(byId.get('a')!.weight).toBeCloseTo(0.9, 6);
    expect(byId.get('b')!.weight).toBeCloseTo(0.1, 6);
    expect(byId.get('a')!.contribution).toBeCloseTo(0.9, 6);
  });

  it('keeps unscored metrics in the list at zero rather than dropping them', () => {
    const result = computeComposite(
      [
        metric({ id: 'a', category: 'health', normalized: 0.8 }),
        metric({ id: 'pending', category: 'environment', normalized: 0, hasData: false }),
      ],
      { health: 20, environment: 15 },
    );

    // Present, so the UI can render "no data yet" instead of silently showing
    // eighteen rows where the reader configured nineteen.
    expect(result.contributions).toHaveLength(2);

    const pending = result.contributions.find((entry) => entry.metricId === 'pending')!;
    expect(pending.hasData).toBe(false);
    expect(pending.contribution).toBe(0);
    expect(pending.weight).toBe(0);
  });

  it('gives a zero-weighted category no share', () => {
    const result = computeComposite(
      [
        metric({ id: 'a', category: 'health', normalized: 0.8 }),
        metric({ id: 'b', category: 'environment', normalized: 0.9 }),
      ],
      { health: 100, environment: 0 },
    );

    const byId = new Map(result.contributions.map((entry) => [entry.metricId, entry]));
    expect(byId.get('b')!.weight).toBe(0);
    expect(byId.get('b')!.contribution).toBe(0);
  });
});

/**
 * Absent data is not zero progress.
 *
 * A metric with no measurement behind it leaves both the numerator and the
 * weight denominator. Scoring it as 0 would say "no progress made on this",
 * which is a claim about the world rather than a statement about our coverage.
 */
describe('computeComposite — metrics with no data', () => {
  it('redistributes an unscored metrics weight rather than counting it as zero', () => {
    const scoredOnly = computeComposite(
      [metric({ id: 'a', category: 'health', weight: 0.1, normalized: 0.8 })],
      { health: 20, environment: 15 },
    );

    const withPending = computeComposite(
      [
        metric({ id: 'a', category: 'health', weight: 0.1, normalized: 0.8 }),
        metric({ id: 'b', category: 'environment', weight: 0.1, normalized: 0, hasData: false }),
      ],
      { health: 20, environment: 15 },
    );

    // 0.8 either way. If the pending metric were counted as zero progress this
    // would read 0.457 — the environment slider dragging the score down for a
    // metric nobody has measured.
    expect(withPending.score).toBeCloseTo(0.8, 6);
    expect(withPending.score).toBeCloseTo(scoredOnly.score, 6);
  });

  it('reports coverage as the fraction of weight that had data', () => {
    const result = computeComposite(
      [
        metric({ id: 'heavy', category: 'health', weight: 0.8, normalized: 0.5 }),
        metric({ id: 'light', category: 'environment', weight: 0.2, hasData: false }),
      ],
      { health: 50, environment: 50 },
    );

    // By weight, not by count — half the metrics are missing but only a fifth
    // of the budget is, and 80% coverage is the honest way to say that.
    expect(result.coverage).toBeCloseTo(0.8, 6);
    expect(result.score).toBeCloseTo(0.5, 6);
  });

  it('reports full coverage for an artifact whose metrics all scored', () => {
    const result = computeComposite([metric({ id: 'a' }), metric({ id: 'b' })], { health: 20 });

    expect(result.coverage).toBe(1);
  });

  it('leaves unscored metrics out of the category score and counts them separately', () => {
    const result = computeComposite(
      [
        metric({ id: 'a', category: 'health', weight: 0.1, normalized: 0.9 }),
        metric({ id: 'b', category: 'health', weight: 0.1, normalized: 0, hasData: false }),
      ],
      { health: 20 },
    );

    const health = result.categories.find((entry) => entry.categoryId === 'health');

    // 90, not 45. The placeholder zero is not a reading.
    expect(health?.score).toBeCloseTo(90, 6);
    expect(health?.metricCount).toBe(1);
    expect(health?.unscoredMetricCount).toBe(1);
  });

  it('returns 0 and no coverage when nothing at all could be scored', () => {
    const result = computeComposite(
      [
        metric({ id: 'a', category: 'health', hasData: false }),
        metric({ id: 'b', category: 'environment', hasData: false }),
      ],
      { health: 50, environment: 50 },
    );

    expect(result.score).toBe(0);
    expect(result.coverage).toBe(0);
    expect(Number.isNaN(result.score)).toBe(false);
  });
});

/**
 * The bounding argument the doc comment makes, checked rather than asserted.
 *
 * Scaled weights sum to 1 and `normalized` is bounded to [-0.5, 1], so a
 * weighted mean of them is bounded to [-0.5, 1] too. That is what makes
 * `Math.min(1, …)` unreachable and leaves `Math.max(0, …)` as the only clamp
 * that can fire.
 */
describe('the composite is bounded to [-0.5, 1] before clamping', () => {
  const CATEGORIES = ['health', 'environment', 'peace_safety', 'education', 'basic_needs'];

  /** Seeded so a failure is reproducible rather than a one-off CI flake. */
  function rng(seed: number): () => number {
    let state = seed >>> 0;
    return () => {
      state = (state * 1664525 + 1013904223) >>> 0;
      return state / 0x100000000;
    };
  }

  it('never exceeds 1, over randomised metric sets', () => {
    const random = rng(20260801);

    for (let run = 0; run < 2000; run += 1) {
      const metrics: ScorableMetric[] = [];
      const count = 1 + Math.floor(random() * 12);

      for (let index = 0; index < count; index += 1) {
        metrics.push(
          metric({
            id: `m${index}`,
            category: CATEGORIES[Math.floor(random() * CATEGORIES.length)],
            // Zero weights included on purpose — `disease-outbreaks` ships at 0.
            weight: random() < 0.15 ? 0 : random() * 0.3,
            // The full normalised range, floor and ceiling included.
            normalized: random() * 1.5 - 0.5,
            polarity: random() < 0.5 ? 'detractor' : 'contributor',
          }),
        );
      }

      const categoryWeights: CategoryWeights = {};
      for (const category of CATEGORIES) {
        categoryWeights[category] = random() < 0.2 ? 0 : random() * 100;
      }

      const raw = unclampedComposite(metrics, categoryWeights);

      expect(raw).toBeLessThanOrEqual(1 + 1e-12);
      expect(raw).toBeGreaterThanOrEqual(-0.5 - 1e-12);
    }
  });

  it('does reach below 0, which is why the lower clamp is not dead code', () => {
    const flooredOut = [
      metric({ id: 'a', category: 'health', normalized: -0.5 }),
      metric({ id: 'b', category: 'environment', normalized: -0.5, polarity: 'detractor' }),
    ];

    expect(unclampedComposite(flooredOut, { health: 50, environment: 50 })).toBeCloseTo(-0.5, 6);
    expect(computeComposite(flooredOut, { health: 50, environment: 50 }).score).toBe(0);
  });

  it('reaches exactly 1 but never past it, even with every metric on the ceiling', () => {
    const solved = [
      metric({ id: 'a', category: 'health', weight: 0.3, normalized: 1 }),
      metric({ id: 'b', category: 'environment', weight: 0.7, normalized: 1, polarity: 'detractor' }),
    ];

    expect(unclampedComposite(solved, { health: 10, environment: 90 })).toBeCloseTo(1, 12);
  });
});

describe('isDefaultWeighting', () => {
  it('tolerates float noise from a slider round-trip', () => {
    expect(isDefaultWeighting({ health: 20.001 }, { health: 20 })).toBe(true);
    expect(isDefaultWeighting({ health: 25 }, { health: 20 })).toBe(false);
  });

  it('treats a missing category as zero', () => {
    expect(isDefaultWeighting({}, { health: 20 })).toBe(false);
    expect(isDefaultWeighting({ health: 20 }, { health: 20, environment: 0 })).toBe(true);
  });
});

/**
 * The artifact is a build output, not a source file — it is gitignored, so a
 * fresh checkout does not have one until `npm run data:artifact` has run. These
 * tests therefore have to tolerate its absence rather than fail the whole suite
 * with an ENOENT, which would take the refresh workflow's test gate down with
 * it and publish nothing at all.
 */
function readArtifact(): {
  compositeScore: number;
  metrics: Parameters<typeof toScorable>[0];
} | null {
  try {
    return JSON.parse(readFileSync('humanity.json', 'utf8'));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw error;
  }
}

const artifact = readArtifact();

describe.skipIf(artifact === null)('agreement with the data layer', () => {
  it('reproduces the published composite from the published metrics', () => {
    // The guard against the two implementations drifting. If the server's maths
    // changes and this file does not, the app would quietly show a different
    // number from the one in the artifact it just downloaded.
    const metrics = toScorable(artifact!.metrics);
    const result = computeComposite(metrics, defaultWeightsFrom(metrics));

    expect(result.score).toBeCloseTo(artifact!.compositeScore, 6);
  });

  it('derives defaults that match the categories the artifact ships', () => {
    const defaults = defaultWeightsFrom(toScorable(artifact!.metrics));
    const total = Object.values(defaults).reduce((sum, weight) => sum + weight, 0);

    expect(total).toBeCloseTo(1, 3);
    expect(Object.keys(defaults).sort()).toEqual([
      'basic_needs',
      'connection',
      'education',
      'environment',
      'freedom_rights',
      'health',
      'peace_safety',
    ]);
  });
});
