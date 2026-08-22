import { describe, expect, it } from 'vitest';

import {
  appearanceFor,
  DAY_BEGINS,
  NIGHT_BEGINS,
  openingAppearance,
  phaseAt,
} from '@/lib/appearance-clock';

/** A local-time `Date` at a given hour, on a day that is otherwise irrelevant. */
const at = (hour: number, minute = 0) => new Date(2026, 7, 21, hour, minute);

describe('which half of the day it is', () => {
  it.each([
    [6, 'day'],
    [9, 'day'],
    [12, 'day'],
    [17, 'day'],
    [18, 'night'],
    [21, 'night'],
    [23, 'night'],
    [0, 'night'],
    [3, 'night'],
    [5, 'night'],
  ])('reads %i:00 as %s', (hour, phase) => {
    expect(phaseAt(at(hour))).toBe(phase);
  });

  /**
   * Both boundaries belong to the phase they open, so there is no minute that
   * belongs to neither and none that belongs to both.
   */
  it('starts each phase exactly on its own hour', () => {
    expect(phaseAt(at(DAY_BEGINS - 1, 59))).toBe('night');
    expect(phaseAt(at(DAY_BEGINS, 0))).toBe('day');
    expect(phaseAt(at(NIGHT_BEGINS - 1, 59))).toBe('day');
    expect(phaseAt(at(NIGHT_BEGINS, 0))).toBe('night');
  });

  it('opens light by day and dark by night', () => {
    expect(appearanceFor('day')).toBe('light');
    expect(appearanceFor('night')).toBe('dark');
  });
});

describe('what the app opens in', () => {
  /** The headline behaviour, and the whole of what was asked for. */
  it('follows the clock when nothing has been chosen', () => {
    expect(openingAppearance(null, null, at(9))).toBe('light');
    expect(openingAppearance(null, null, at(14))).toBe('light');
    expect(openingAppearance(null, null, at(20))).toBe('dark');
    expect(openingAppearance(null, null, at(2))).toBe('dark');
  });

  /**
   * A choice is obeyed inside the phase it was made in — otherwise the switch
   * would not work at all, since the next launch would undo every use of it.
   */
  it('keeps a choice made in the same half of the day', () => {
    expect(openingAppearance('dark', 'day', at(14))).toBe('dark');
    expect(openingAppearance('light', 'night', at(22))).toBe('light');
  });

  /**
   * And released once that half is over, which is what stops one tap from
   * switching the clock off forever.
   */
  it('lets a choice expire when the day turns over', () => {
    expect(openingAppearance('dark', 'day', at(20))).toBe('dark');
    expect(openingAppearance('light', 'night', at(9))).toBe('light');
    // The cases that actually matter: a choice that disagrees with the new
    // phase's default is the one that has to be let go.
    expect(openingAppearance('light', 'day', at(20))).toBe('dark');
    expect(openingAppearance('dark', 'night', at(9))).toBe('light');
  });

  /**
   * Readers who set the switch before any of this existed have a preference with
   * no phase beside it. It expires at the next boundary like any other, which is
   * the only honest reading of a choice made at an unknown time.
   */
  it('lets a choice with no recorded phase fall through to the clock', () => {
    expect(openingAppearance('light', null, at(20))).toBe('dark');
    expect(openingAppearance('dark', null, at(9))).toBe('light');
  });

  /** Anything unreadable is treated as nothing at all. */
  it('ignores values it does not recognise', () => {
    expect(openingAppearance('sepia', 'day', at(20))).toBe('dark');
    expect(openingAppearance('dark', 'afternoon', at(9))).toBe('light');
    expect(openingAppearance('', '', at(20))).toBe('dark');
  });
});
