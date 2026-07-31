import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import {
  computeComposite,
  defaultWeightsFrom,
  isDefaultWeighting,
  toScorable,
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
    polarity: 'contributor',
    ...overrides,
  };
}

describe('computeComposite', () => {
  it('matches a hand-computed case', () => {
    // Two contributors, equal weight, one category. Contributor weights are
    // renormalised by their own sum, so the result is the plain mean of the
    // normalized values regardless of the absolute weights.
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

  it('lets a regressed detractor cost more than its own weight', () => {
    // The whole reason `normalized` floors at -0.5 rather than 0: a detractor at
    // -0.5 subtracts 1.5x its weight, so it can drag the composite rather than
    // merely failing to lift it.
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

    // Contributor renormalisation puts the contributor at 1.0; the detractor
    // subtracts 0.5 then 0.75 of the total.
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

    const total = result.categories.reduce((sum, entry) => sum + entry.effectiveWeight, 0);
    expect(total).toBeCloseTo(1, 6);
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
