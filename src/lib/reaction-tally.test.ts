import { describe, expect, it } from 'vitest';

import { readersLabel, reactionPercents, totalVotes } from '@/lib/reaction-tally';

describe('totalVotes', () => {
  it('sums both options', () => {
    expect(totalVotes({ hope: 7, surprised: 3 })).toBe(10);
  });

  it('is zero for an empty tally', () => {
    expect(totalVotes({ hope: 0, surprised: 0 })).toBe(0);
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

describe('readersLabel', () => {
  it('says so when the reader is alone', () => {
    // The line that keeps an unfiltered "100%" honest: one person agreeing with
    // themselves should read as exactly that.
    expect(readersLabel(1)).toBe('Just you so far today.');
  });

  it('pluralises above one', () => {
    expect(readersLabel(4)).toBe('4 readers today.');
  });

  it('handles a tally that has not landed', () => {
    expect(readersLabel(0)).toBe('No answers yet today.');
  });
});
