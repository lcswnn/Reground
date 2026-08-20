import { describe, expect, it } from 'vitest';

import { BREATHING, BREATH_CYCLES, BREATH_CYCLE_MS } from '@/config/session';
import {
  BREATHE_INTRO,
  CLOSE,
  GROUNDING,
  pickUnwindIdea,
  pickWelcomeLine,
  timeOfDay,
  WELCOME,
} from '@/content/strings';

/**
 * Also worth a test, for a different reason: this copy makes two checkable
 * promises about half a minute the user has not yet agreed to spend. The round
 * count is interpolated so it cannot drift, but the prose claims — "about half
 * a minute", and an exhale that "runs about twice as long" — are only true
 * while the numbers in `@/config/session` say so, and `PUZZLE`'s note makes
 * clear those numbers are expected to be retuned.
 */
describe('what the breathing intro promises', () => {
  /**
   * The band is wide on purpose — this is guarding the phrase, not pinning the
   * timings. Anything from about twenty seconds to about forty is a thing a
   * person would call half a minute; the moment the run leaves that, the copy
   * has to change with it rather than the bound being widened.
   */
  it('is describing about half a minute', () => {
    const actualMs = BREATH_CYCLES * BREATH_CYCLE_MS + BREATHING.leadInMs;
    expect(actualMs).toBeGreaterThan(20_000);
    expect(actualMs).toBeLessThan(40_000);
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

/**
 * The door's greeting is the one piece of copy in the app that is chosen at
 * runtime rather than written into a screen, and the failure modes are both
 * silent: an hour that falls through every bucket renders an empty line, and a
 * set that is accidentally emptied renders `undefined`. Neither throws, and
 * both would ship.
 */
describe('the door greeting', () => {
  it('has a set for every hour of the day', () => {
    for (let hour = 0; hour < 24; hour += 1) {
      const set = WELCOME.lines[timeOfDay(hour)];

      expect(set.length).toBeGreaterThan(0);
    }
  });

  it('divides the day into four parts, in order and without gaps', () => {
    const buckets = Array.from({ length: 24 }, (_, hour) => timeOfDay(hour));

    // Night wraps around midnight, so it is the first and the last; the other
    // three appear once each, in the order the day runs.
    expect(buckets[0]).toBe('night');
    expect(buckets[23]).toBe('night');
    expect(buckets[5]).toBe('morning');
    expect(buckets[12]).toBe('afternoon');
    expect(buckets[17]).toBe('evening');
    expect(buckets[22]).toBe('night');
  });

  it('answers with a line from the set the clock is in', () => {
    // Every hour, many times over: the picker is random, so one call per hour
    // would pass with three of four lines missing from a set.
    for (let hour = 0; hour < 24; hour += 1) {
      const set: readonly string[] = WELCOME.lines[timeOfDay(hour)];
      const at = new Date(2026, 0, 1, hour, 30);

      for (let attempt = 0; attempt < 40; attempt += 1) {
        expect(set).toContain(pickWelcomeLine(at));
      }
    }
  });

  /**
   * Not a style rule for its own sake: these are drawn at the title tier on an
   * otherwise empty screen, and a line long enough to wrap three times turns
   * the door into a paragraph. The longest one written is comfortably inside
   * this, so it is a ceiling rather than a target.
   */
  it('keeps every greeting short enough to be read at a glance', () => {
    for (const set of Object.values(WELCOME.lines)) {
      for (const line of set) {
        expect(line.length).toBeGreaterThan(0);
        expect(line.length).toBeLessThanOrEqual(64);
      }
    }
  });
});
