import { describe, expect, it } from 'vitest';

import { SHAPES, distinctRotations, nextShape } from '@/session/puzzle/shapes';

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

  it('never hands out the piece just placed', () => {
    for (const shape of SHAPES) {
      for (let i = 0; i < 50; i += 1) {
        expect(nextShape(shape.id).id).not.toBe(shape.id);
      }
    }
  });
});
