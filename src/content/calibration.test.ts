import { describe, expect, it } from 'vitest';

import { METRICS } from '../../data-layer/src/config/metrics.js';
import { CALIBRATION, type CalibrationEntry } from './calibration';

const ENTRIES = Object.entries(CALIBRATION) as [string, CalibrationEntry][];

/**
 * Copy is not usually worth a test. This is, for the same reason the grounding
 * sequence is: the screen makes a promise about its own shape — what's going on,
 * what's being done, what you can do — and nothing in the renderer notices if an
 * entry stops keeping it. A missing `response` renders as a heading with a gap
 * under it, which reads as a bug in the app rather than as the thing it is: a
 * screen that named a problem and then had nothing to say about it.
 */
describe('every calibration entry', () => {
  it('answers all three questions', () => {
    for (const [key, entry] of ENTRIES) {
      expect(entry.trend.label.trim(), key).not.toBe('');
      expect(entry.trend.body.trim(), key).not.toBe('');
      expect(entry.response.trim(), key).not.toBe('');
      expect(entry.action.trim(), key).not.toBe('');
    }
  });

  /**
   * The copy shipped as placeholders for a while and the screen rendered them
   * happily. This is what stops that happening twice.
   */
  it('is not placeholder copy', () => {
    for (const [key, entry] of ENTRIES) {
      const text = [entry.trend.label, entry.trend.body, entry.response, entry.action]
        .join(' ')
        .toUpperCase();

      expect(text, key).not.toContain('PLACEHOLDER');
      expect(text, key).not.toContain('TODO');
    }
  });
});

/**
 * The one place the app's content reaches across into the data layer. The ids
 * are strings on this side — the artifact is fetched at runtime and the app has
 * no compile-time view of what's in it — so a typo or a renamed metric would
 * otherwise show up as a chart that silently never appears.
 *
 * `metricsFor` dropping unknown ids is the *runtime* safety net and is there so
 * a shipped build survives the data layer changing under it. This is the
 * build-time one, and it is the one that tells somebody about it.
 */
describe('the metrics each topic asks for', () => {
  const scoredIds = new Set(METRICS.map((metric) => metric.id));

  it('all exist in the data layer', () => {
    for (const [key, entry] of ENTRIES) {
      for (const id of entry.metricIds) {
        expect(scoredIds, `${key} → ${id}`).toContain(id);
      }
    }
  });

  it('does not ask for the same series twice', () => {
    for (const [key, entry] of ENTRIES) {
      expect(new Set(entry.metricIds).size, key).toBe(entry.metricIds.length);
    }
  });

  /**
   * The ceiling is a design constraint, not a technical one — see the note on
   * `metricIds`. Three charts plus two sections is already a long scroll for
   * someone who came here to be calmed down.
   */
  it('shows at most three at a time', () => {
    for (const [key, entry] of ENTRIES) {
      expect(entry.metricIds.length, key).toBeLessThanOrEqual(3);
    }
  });

  /**
   * `politics` is deliberately empty and documented as such. Any *other* topic
   * arriving here with no charts is a topic that lost its data by accident.
   */
  it('leaves only politics without any', () => {
    const empty = ENTRIES.filter(([, entry]) => entry.metricIds.length === 0).map(([key]) => key);

    expect(empty).toEqual(['politics']);
  });
});
