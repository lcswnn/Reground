import { describe, expect, it } from 'vitest';

import { GROUNDING } from '@/content/strings';

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
