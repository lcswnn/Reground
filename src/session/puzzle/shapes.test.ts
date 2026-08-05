import { describe, expect, it } from 'vitest';

import {
  SHAPES,
  TALLEST_SHAPE,
  distinctRotations,
  nextShape,
  rotateClockwise,
} from '@/session/puzzle/shapes';

/**
 * The piece set has one job beyond looking unfamiliar: every shape in it has to
 * be worth turning. A rotation-invariant piece is placeable by eye, and the
 * whole reason this game is in a mental-imagery app is that its pieces are not.
 * It is also the failure that is hardest to spot by reading the file — a plus
 * sign in a list of nested arrays looks like any other five cells.
 */
describe('the piece set', () => {
  it.each(SHAPES.map((shape) => [shape.id, shape] as const))(
    '%s looks different when it is turned',
    (_, shape) => {
      expect(distinctRotations(shape.cells)).toBeGreaterThan(1);
    },
  );

  it('catches a piece that a quarter-turn leaves alone, so the check above holds', () => {
    expect(distinctRotations([[1]])).toBe(1);
    expect(
      distinctRotations([
        [0, 1, 0],
        [1, 1, 1],
        [0, 1, 0],
      ]),
    ).toBe(1);
    expect(
      distinctRotations([
        [1, 1],
        [1, 1],
      ]),
    ).toBe(1);
  });

  it('has unique ids', () => {
    expect(new Set(SHAPES.map((shape) => shape.id)).size).toBe(SHAPES.length);
  });

  /**
   * One pair is deliberately two hands of the same shape. Reflections cannot be
   * turned into each other, so telling them apart is exactly the work the game
   * is for — and a player who learns "the fat one goes in the corner" still has
   * to notice which of the two they have been handed.
   */
  it('carries both hands of one shape', () => {
    const mirror = (cells: readonly (readonly number[])[]) =>
      JSON.stringify(cells.map((row) => [...row].reverse()));

    const pairs = SHAPES.filter((shape) =>
      // A different piece, which is the whole point: most of these are their
      // own reflection — turn a T over and it is a T — so matching against
      // itself would say every shape in the set is half of a pair.
      SHAPES.some((other) => {
        if (other.id === shape.id) return false;

        let turned = other.cells;
        for (let i = 0; i < 4; i += 1) {
          if (JSON.stringify(turned) === mirror(shape.cells)) return true;
          turned = rotateClockwise(turned);
        }
        return false;
      }),
    );

    expect(pairs.map((shape) => shape.id).sort()).toEqual(['jut', 'notch']);
  });

  /**
   * The board reserves `TALLEST_SHAPE` rows above the playfield for the waiting
   * piece to sit in. A shape taller than that in some rotation would have its
   * top row drawn off the top of the grid — which is the exact bug the hover
   * zone was added to fix, reintroduced by adding a piece.
   */
  it('has nothing taller than the space the board saves for it', () => {
    for (const shape of SHAPES) {
      let cells = shape.cells;
      for (let i = 0; i < 4; i += 1) {
        expect(cells.length).toBeLessThanOrEqual(TALLEST_SHAPE);
        cells = rotateClockwise(cells);
      }
    }
  });

  it('never hands out the piece just placed', () => {
    for (const shape of SHAPES) {
      for (let i = 0; i < 50; i += 1) {
        expect(nextShape(shape.id).id).not.toBe(shape.id);
      }
    }
  });
});
