import { describe, expect, it } from 'vitest';

import {
  companyLabel,
  hasEnoughForPercent,
  MIN_SAMPLE,
  reactionPercents,
  totalVotes,
} from '@/lib/reaction-tally';

describe('hasEnoughForPercent', () => {
  it('is false below the threshold', () => {
    // The case this whole module exists for. Three people is not 67%.
    expect(hasEnoughForPercent({ hope: 2, surprised: 1 })).toBe(false);
  });

  it('is true exactly at the threshold', () => {
    expect(totalVotes({ hope: MIN_SAMPLE, surprised: 0 })).toBe(MIN_SAMPLE);
    expect(hasEnoughForPercent({ hope: MIN_SAMPLE, surprised: 0 })).toBe(true);
  });

  it('is false for an empty tally', () => {
    expect(hasEnoughForPercent({ hope: 0, surprised: 0 })).toBe(false);
  });
});

describe('reactionPercents', () => {
  it('splits evenly', () => {
    expect(reactionPercents({ hope: 5, surprised: 5 })).toEqual({ hope: 50, surprised: 50 });
  });

  it('always sums to exactly 100', () => {
    // Independent rounding gives 67 and 34 here, and two numbers on screen that
    // visibly fail to add up discredit the one thing this component is for.
    const percents = reactionPercents({ hope: 2, surprised: 1 });
    expect(percents.hope + percents.surprised).toBe(100);
  });

  it('sums to 100 across many awkward splits', () => {
    for (let hope = 0; hope <= 17; hope += 1) {
      for (let surprised = 0; surprised <= 17; surprised += 1) {
        if (hope + surprised === 0) continue;
        const percents = reactionPercents({ hope, surprised });
        expect(percents.hope + percents.surprised).toBe(100);
      }
    }
  });

  it('gives a unanimous tally 100 and 0', () => {
    expect(reactionPercents({ hope: 12, surprised: 0 })).toEqual({ hope: 100, surprised: 0 });
  });

  it('returns zeroes rather than NaN for an empty tally', () => {
    // Callers check `hasEnoughForPercent` first, but a NaN reaching the screen
    // is a worse failure than a meaningless zero.
    expect(reactionPercents({ hope: 0, surprised: 0 })).toEqual({ hope: 0, surprised: 0 });
  });
});

describe('companyLabel', () => {
  it('handles being the only one so far', () => {
    expect(companyLabel(1)).toBe('You are the first to react today.');
  });

  it('uses the singular for exactly one other', () => {
    expect(companyLabel(2)).toBe('You and one other person so far today.');
  });

  it('counts the others, not the total', () => {
    // The reader is included in `total` — they had to answer to see this — so
    // saying "you and 4 others" off a total of 4 would invent a person.
    expect(companyLabel(4)).toBe('You and 3 others so far today.');
  });

  it('never renders a negative count', () => {
    // A tally that has not landed yet, or a stale zero from the server.
    expect(companyLabel(0)).toBe('You are the first to react today.');
  });
});
