import { describe, expect, it } from 'vitest';

import { BREATHING, BREATH_CYCLES, BREATH_CYCLE_MS } from '@/config/session';
import { BREATHE_INTRO, CLOSE, GROUNDING, pickUnwindIdea } from '@/content/strings';

/**
 * Also worth a test, for a different reason: this copy makes two checkable
 * promises about a minute the user has not yet agreed to spend. The round count
 * is interpolated so it cannot drift, but the prose claims — "about a minute",
 * and an exhale that "runs about twice as long" — are only true while the
 * numbers in `@/config/session` say so, and `PUZZLE`'s note makes clear those
 * numbers are expected to be retuned.
 */
describe('what the breathing intro promises', () => {
  it('is describing about a minute', () => {
    const actualMs = BREATH_CYCLES * BREATH_CYCLE_MS + BREATHING.leadInMs;
    expect(actualMs).toBeGreaterThan(45_000);
    expect(actualMs).toBeLessThan(90_000);
  });

  it('is describing an exhale that runs about twice the inhale', () => {
    const inhaleMs = BREATHING.firstInhaleMs + BREATHING.secondInhaleMs;
    const ratio = BREATHING.exhaleMs / inhaleMs;
    expect(ratio).toBeGreaterThan(1.5);
    expect(ratio).toBeLessThan(3);
  });

  it('quotes the count the breath actually runs', () => {
    expect(BREATHE_INTRO.shape(BREATH_CYCLES)).toContain(String(BREATH_CYCLES));
  });
});

/**
 * Copy is not usually worth a test. This is: the sequence shipped stopping at
 * three, which is not a typo but a broken technique — the count descending to
 * one is the whole shape of it, and nothing in the component notices if a
 * prompt goes missing.
 */
describe('the grounding sequence', () => {
  it('counts all the way down from five to one', () => {
    expect(GROUNDING.steps).toHaveLength(5);

    const counts = ['five', 'four', 'three', 'two', 'one'];
    counts.forEach((count, index) => {
      expect(GROUNDING.steps[index].toLowerCase()).toContain(count);
    });
  });

  it('names a different sense in each prompt', () => {
    const senses = ['see', 'feel', 'hear', 'smell', 'taste'];
    senses.forEach((sense, index) => {
      expect(GROUNDING.steps[index].toLowerCase()).toContain(sense);
    });
  });
});

/**
 * The suggestion on the last screen is assembled rather than written out, so
 * two things that prose would have got right for free need checking: that the
 * template's full stop isn't doubling one already in the entry, and that the
 * picker can actually reach every idea in the list.
 */
describe('the unwind idea', () => {
  it('leaves the closing punctuation to the template', () => {
    CLOSE.ideas.forEach((idea) => {
      expect(idea.endsWith('.')).toBe(false);
      expect(CLOSE.idea(idea)).toBe(`Idea: ${idea}.`);
    });
  });

  it('only ever suggests something from the list', () => {
    for (let i = 0; i < 200; i += 1) {
      expect(CLOSE.ideas).toContain(pickUnwindIdea());
    }
  });

  it('can reach every idea', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 500; i += 1) seen.add(pickUnwindIdea());
    expect(seen.size).toBe(CLOSE.ideas.length);
  });
});
