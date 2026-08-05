import { describe, expect, it } from 'vitest';

import {
  SHEET,
  applyFold,
  buildRound,
  creaseAt,
  frames,
  movedHalf,
  patternKey,
  reflect,
  unfold,
  type FoldRound,
  type Point,
} from '@/session/games/paper-fold/fold';

const area = (rect: { x0: number; y0: number; x1: number; y1: number }) =>
  (rect.x1 - rect.x0) * (rect.y1 - rect.y0);

const rounds = (count: number): FoldRound[] =>
  Array.from({ length: count }, () => buildRound());

describe('folding', () => {
  it('halves the sheet each time', () => {
    for (const round of rounds(50)) {
      round.frames.forEach((rect, index) => {
        expect(area(rect)).toBeCloseTo(1 / 2 ** index, 10);
      });
    }
  });

  it('keeps one half and moves the other, with nothing left over', () => {
    const fold = { axis: 'vertical', keep: 'right' } as const;
    expect(applyFold(SHEET, fold)).toEqual({ x0: 0.5, y0: 0, x1: 1, y1: 1 });
    expect(movedHalf(SHEET, fold)).toEqual({ x0: 0, y0: 0, x1: 0.5, y1: 1 });
    expect(area(applyFold(SHEET, fold)) + area(movedHalf(SHEET, fold))).toBe(1);
  });

  it('creases the second fold across the middle of a half-sheet', () => {
    const stages = frames([
      { axis: 'vertical', keep: 'right' },
      { axis: 'vertical', keep: 'right' },
    ]);
    expect(creaseAt(stages[1], { axis: 'vertical', keep: 'right' })).toBe(0.75);
  });

  it('reflects across the crease and back again', () => {
    const point: Point = { x: 0.125, y: 0.4 };
    expect(reflect(reflect(point, 'vertical', 0.5), 'vertical', 0.5)).toEqual(point);
    expect(reflect(point, 'vertical', 0.5)).toEqual({ x: 0.875, y: 0.4 });
  });

  it('never folds the same way twice in a row', () => {
    for (const round of rounds(80)) {
      for (let i = 1; i < round.folds.length; i += 1) {
        expect(round.folds[i].axis).not.toBe(round.folds[i - 1].axis);
      }
    }
  });
});

describe('unfolding', () => {
  /**
   * The one property the whole item rests on. A hole punched through k folds
   * opens out to 2^k holes — unless it landed on a crease, in which case it is
   * its own reflection and the count comes up short. This is what holds
   * `punchSites` to its inset positions, and it is invisible by inspection.
   */
  it('doubles the holes for every fold', () => {
    for (const round of rounds(120)) {
      const opened = unfold(round.punches, round.folds);
      expect(opened).toHaveLength(round.punches.length * 2 ** round.folds.length);
      expect(new Set(opened.map((point) => `${point.x},${point.y}`)).size).toBe(
        opened.length,
      );
    }
  });

  it('leaves every hole on the sheet', () => {
    for (const round of rounds(80)) {
      for (const option of round.options) {
        for (const point of option) {
          expect(point.x).toBeGreaterThan(0);
          expect(point.x).toBeLessThan(1);
          expect(point.y).toBeGreaterThan(0);
          expect(point.y).toBeLessThan(1);
        }
      }
    }
  });

  it('keeps the punched holes where they were punched', () => {
    for (const round of rounds(40)) {
      const opened = patternKey(unfold(round.punches, round.folds));
      for (const punch of round.punches) {
        expect(opened).toContain(punch.x.toFixed(6));
      }
    }
  });

  it('punches through the folded stack, not the open sheet', () => {
    for (const round of rounds(60)) {
      const folded = round.frames[round.frames.length - 1];
      for (const punch of round.punches) {
        expect(punch.x).toBeGreaterThan(folded.x0);
        expect(punch.x).toBeLessThan(folded.x1);
        expect(punch.y).toBeGreaterThan(folded.y0);
        expect(punch.y).toBeLessThan(folded.y1);
      }
    }
  });
});

describe('the answers on offer', () => {
  it('always contains the right one, exactly once', () => {
    for (const round of rounds(120)) {
      const answer = patternKey(unfold(round.punches, round.folds));
      const matches = round.options.filter((option) => patternKey(option) === answer);

      expect(matches).toHaveLength(1);
      expect(patternKey(round.options[round.answerIndex])).toBe(answer);
    }
  });

  it('offers four, all different', () => {
    for (const round of rounds(120)) {
      expect(round.options).toHaveLength(4);
      expect(new Set(round.options.map(patternKey)).size).toBe(4);
    }
  });

  /**
   * Counting the holes has to get you nowhere. If the wrong answers carried a
   * different number of them, the fold count alone would pick the right one out
   * — a correct answer with no picture generated anywhere, which is the whole
   * thing this game is for.
   */
  it('gives every wrong answer the same number of holes as the right one', () => {
    for (const round of rounds(120)) {
      const expected = round.options[round.answerIndex].length;
      for (const option of round.options) expect(option).toHaveLength(expected);
    }
  });

  it('does not always put the answer in the same place', () => {
    const places = new Set(rounds(60).map((round) => round.answerIndex));
    expect(places.size).toBeGreaterThan(1);
  });

  it('takes its randomness from the caller', () => {
    const fixed = () => 0.1;
    expect(patternKey(buildRound(fixed).options[0])).toBe(
      patternKey(buildRound(fixed).options[0]),
    );
  });
});
