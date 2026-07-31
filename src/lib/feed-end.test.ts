import { describe, expect, it } from 'vitest';

import { SIGN_OFFS, signOffFor } from '@/lib/feed-end';

describe('signOffFor', () => {
  it('returns a line from the set', () => {
    expect(SIGN_OFFS).toContain(signOffFor('2026-07-31'));
  });

  it('is stable for a given day', () => {
    // The sign-off sits at the bottom of a list the reader scrolls back up
    // through. Rerolling it per render would read as a glitch.
    expect(signOffFor('2026-07-31')).toBe(signOffFor('2026-07-31'));
  });

  it('changes from one day to the next', () => {
    expect(signOffFor('2026-07-31')).not.toBe(signOffFor('2026-08-01'));
  });

  it('cycles through every line before repeating', () => {
    const seen = new Set<string>();
    const start = Date.UTC(2026, 6, 31);

    for (let day = 0; day < SIGN_OFFS.length; day += 1) {
      seen.add(signOffFor(new Date(start + day * 86_400_000).toISOString().slice(0, 10)));
    }

    expect(seen.size).toBe(SIGN_OFFS.length);
  });

  it('reaches every line for a reader who only opens the app on Sundays', () => {
    /**
     * The property worth protecting, and the one this file was written with
     * wrong. A line count sharing a factor with seven collapses to
     * `count / gcd(count, 7)` distinct lines for anyone reading on a fixed
     * weekday — at fourteen lines that is two sentences, forever, for a whole
     * class of readers. Any count coprime with seven walks the full rotation.
     *
     * Stepping a week at a time rather than asserting on the count directly, so
     * this keeps testing the behaviour if the rotation ever stops being a plain
     * modulo.
     */
    const start = Date.UTC(2026, 6, 5);
    const sundays = new Set<string>();

    for (let week = 0; week < SIGN_OFFS.length; week += 1) {
      sundays.add(signOffFor(new Date(start + week * 7 * 86_400_000).toISOString().slice(0, 10)));
    }

    expect(sundays.size).toBe(SIGN_OFFS.length);
  });

  it('does not return undefined for a date before the epoch', () => {
    // `dayNumber` goes negative there, and a negative index would render the
    // sign-off as a blank line.
    expect(SIGN_OFFS).toContain(signOffFor('1965-03-02'));
  });
});
