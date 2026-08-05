import { describe, expect, it } from 'vitest';

import {
  buildRound,
  drawOrder,
  hiddenCubes,
  totalCubes,
  type Heights,
} from '@/session/games/cubes/stack';

const rounds = Array.from({ length: 200 }, () => buildRound());

describe('counting a stack', () => {
  it('adds up the columns', () => {
    expect(totalCubes([[1, 2], [3, 0]])).toBe(6);
    expect(totalCubes([[0, 0], [0, 0]])).toBe(0);
  });

  /**
   * Worked through by hand, because this is the one rule the game is built on
   * and it is easy to get backwards. A cube is out of sight when something sits
   * on top of it *and* both neighbours toward the viewer are tall enough to
   * cover the two faces it would otherwise show.
   */
  it('finds the cube behind the overhang', () => {
    // The tall column's bottom cube is walled in by its two neighbours.
    expect(hiddenCubes([[2, 1], [1, 1]])).toBe(1);
    // Same pile, one neighbour missing: nothing is hidden any more.
    expect(hiddenCubes([[2, 1], [0, 1]])).toBe(0);
    expect(hiddenCubes([[2, 0], [1, 1]])).toBe(0);
  });

  it('hides nothing in a single tower, however tall', () => {
    expect(hiddenCubes([[9]])).toBe(0);
  });

  it('hides nothing in a flat slab', () => {
    expect(
      hiddenCubes([
        [1, 1, 1],
        [1, 1, 1],
        [1, 1, 1],
      ]),
    ).toBe(0);
  });

  it('counts every buried cube of a taller pile', () => {
    // Two levels buried under the corner of a solid 2×2×3 block.
    const heights: Heights = [
      [3, 3],
      [3, 3],
    ];
    expect(hiddenCubes(heights)).toBe(2);
  });
});

describe('the draw order', () => {
  const heights: Heights = [
    [2, 1],
    [1, 3],
  ];

  it('lists every cube exactly once', () => {
    const cubes = drawOrder(heights);
    expect(cubes).toHaveLength(totalCubes(heights));
    expect(new Set(cubes.map((cube) => JSON.stringify(cube))).size).toBe(cubes.length);
  });

  it('goes back to front, so the near cubes are drawn last', () => {
    const depths = drawOrder(heights).map(
      (cube) => cube.column + cube.row + cube.level,
    );
    expect(depths).toEqual([...depths].sort((a, b) => a - b));
  });
});

describe('a round', () => {
  /**
   * The one that makes the question honest. "Including the ones you can't see"
   * is the whole instruction, and a pile with nothing hidden in it is a
   * counting exercise wearing the costume of an imagery one.
   */
  it('always hides at least one cube', () => {
    for (const round of rounds) expect(round.hidden).toBeGreaterThan(0);
  });

  it('keeps the pile countable', () => {
    for (const round of rounds) {
      expect(round.total).toBe(totalCubes(round.heights));
      expect(round.total).toBeGreaterThanOrEqual(7);
      expect(round.total).toBeLessThanOrEqual(15);
    }
  });

  it('reads as one object rather than scattered towers', () => {
    for (const round of rounds) {
      const standing = round.heights.flat().filter((height) => height > 0);
      expect(standing.length).toBeGreaterThanOrEqual(6);
    }
  });

  it('offers four counts, all different and all possible', () => {
    for (const round of rounds) {
      expect(round.options).toHaveLength(4);
      expect(new Set(round.options).size).toBe(4);
      expect(round.options[round.answerIndex]).toBe(round.total);
      for (const option of round.options) {
        expect(option).toBeGreaterThan(0);
        // Near misses only: a wild option is crossed off without counting.
        expect(Math.abs(option - round.total)).toBeLessThanOrEqual(3);
      }
    }
  });

  it('does not always put the answer in the same place', () => {
    expect(new Set(rounds.map((round) => round.answerIndex)).size).toBe(4);
  });

  it('falls back to a real stack when the randomness never obliges', () => {
    // Every height comes out 1, which is a slab with nothing hidden in it, so
    // the retry loop exhausts and the fallback has to carry the round.
    const round = buildRound(() => 0.3);
    expect(round.hidden).toBeGreaterThan(0);
    expect(round.options).toContain(round.total);
  });
});
