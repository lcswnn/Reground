import { describe, expect, it } from 'vitest';

import {
  CRISIS_REGIONS,
  DEFAULT_REGION,
  findRegion,
  guessRegion,
  HELPLINE_DIRECTORY,
  type RegionId,
} from '@/content/crisis';

/**
 * The crisis numbers are the one part of this app where being wrong is not a
 * design problem. A row that opens nothing, or opens a web page when it
 * promised a phone call, fails the person it exists for at the moment they are
 * least able to work around it — so the shape of every one of them is checked
 * here rather than trusted to review.
 *
 * None of this can check that a number *answers*. That is a human job, and the
 * note at the top of `crisis.ts` says whose.
 */
describe('the crisis lines', () => {
  const withNumbers = CRISIS_REGIONS.filter((region) => region.options.length > 0);

  it('carries numbers for every region except the fallback', () => {
    expect(withNumbers.length).toBe(CRISIS_REGIONS.length - 1);
    expect(findRegion(DEFAULT_REGION).options).toHaveLength(0);
  });

  it('only ever dials or texts, and never opens a page', () => {
    for (const region of CRISIS_REGIONS) {
      for (const option of region.options) {
        // `tel:` and `sms:` and nothing else. A crisis row that opens a browser
        // is a row that has put a loading spinner between somebody and a person.
        expect(option.url).toMatch(/^(tel|sms):[0-9]+$/);
      }
    }
  });

  /**
   * Every row has to carry its own number in the words, because a device with
   * no dialler cannot open `tel:` and the tap will do nothing. What is left on
   * screen then is the label, and the label has to be enough to act on.
   *
   * Spaces are stripped before comparing: labels are written the way the number
   * is said out loud ("13 11 14"), and URLs the way it is dialled.
   */
  it('says the number in the label, so a dead link still reads as a number', () => {
    for (const region of CRISIS_REGIONS) {
      for (const option of region.options) {
        const digits = option.url.replace(/^(tel|sms):/, '');

        expect(option.label.replace(/\s/g, '')).toContain(digits);
        expect(option.detail.length).toBeGreaterThan(0);
      }
    }
  });

  /**
   * Every region that has numbers has to have a way to reach a person in
   * immediate danger as well as a way to talk to one. They are different needs
   * and only one of them is what a lifeline is for.
   */
  it('gives every listed country both a lifeline and an emergency number', () => {
    for (const region of withNumbers) {
      expect(region.options.length).toBeGreaterThanOrEqual(2);
      expect(
        region.options.some((option) => /immediate danger/.test(option.detail)),
      ).toBe(true);
    }
  });

  it('has no id twice, anywhere', () => {
    const ids = CRISIS_REGIONS.flatMap((region) =>
      region.options.map((option) => option.id),
    );

    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(CRISIS_REGIONS.map((region) => region.id)).size).toBe(
      CRISIS_REGIONS.length,
    );
  });

  it('falls back rather than throwing when handed an id it does not know', () => {
    expect(findRegion('pt' as RegionId).id).toBe(DEFAULT_REGION);
  });

  it('links out of its own limits', () => {
    expect(HELPLINE_DIRECTORY).toMatch(/^https:\/\//);
  });
});

describe('guessing a region from a locale', () => {
  it('reads the country out of the usual shapes', () => {
    expect(guessRegion('en-US')).toBe('us');
    expect(guessRegion('en_GB')).toBe('gb');
    expect(guessRegion('en-AU')).toBe('au');
  });

  /**
   * A guess is only ever used to put a tick next to a likely answer, so the
   * only wrong outcome is a confident one: anything unrecognised has to come
   * back `null` rather than defaulting to a country.
   */
  it('answers null rather than guessing when it cannot tell', () => {
    expect(guessRegion('pt-PT')).toBeNull();
    expect(guessRegion('en')).toBeNull();
    expect(guessRegion('')).toBeNull();
    expect(guessRegion(undefined)).toBeNull();
  });
});
