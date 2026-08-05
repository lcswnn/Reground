import { describe, expect, it } from 'vitest';

import {
  FIGURES,
  buildRound,
  isChiral,
  mirror,
  rotate,
  turn,
  type Figure,
} from '@/session/games/rotations/figures';

const cells = (figure: Figure) => figure.flat().filter(Boolean).length;

describe('turning a figure', () => {
  it('comes back to itself after four quarter-turns', () => {
    for (const figure of FIGURES) expect(turn(figure, 4)).toStrictEqual(figure);
  });

  it('keeps every cell', () => {
    for (const figure of FIGURES) {
      expect(cells(rotate(figure))).toBe(cells(figure));
      expect(cells(mirror(figure))).toBe(cells(figure));
    }
  });

  it('transposes the bounding box', () => {
    const wide: Figure = [
      [1, 1, 1],
      [1, 0, 0],
    ];
    expect(rotate(wide)).toStrictEqual([
      [1, 1],
      [0, 1],
      [0, 1],
    ]);
  });

  it('mirrors back to itself', () => {
    for (const figure of FIGURES) expect(mirror(mirror(figure))).toStrictEqual(figure);
  });
});

describe('the figures', () => {
  // The one that matters. An achiral figure makes "same or mirrored?" a
  // question with both answers, and a player reasoning correctly is marked
  // wrong half the time — see `isChiral`.
  it.each(FIGURES.map((figure, i) => [i, figure] as const))(
    'figure %i can be told from its own reflection',
    (_, figure) => {
      expect(isChiral(figure)).toBe(true);
    },
  );

  it('catches an achiral figure, so the check above can be trusted', () => {
    // A plus sign: every reflection of it is also a rotation of it.
    expect(
      isChiral([
        [0, 1, 0],
        [1, 1, 1],
        [0, 1, 0],
      ]),
    ).toBe(false);
    // And a square, for the same reason.
    expect(
      isChiral([
        [1, 1],
        [1, 1],
      ]),
    ).toBe(false);
  });

  it('offers both hands of the one pair it draws twice', () => {
    const reflections = FIGURES.filter((figure) =>
      FIGURES.some((other) =>
        [0, 1, 2, 3].some(
          (turns) => JSON.stringify(turn(other, turns)) === JSON.stringify(mirror(figure)),
        ),
      ),
    );
    expect(reflections.length).toBeGreaterThanOrEqual(2);
  });
});

describe('a round', () => {
  const round = (values: number[]) => {
    let i = 0;
    return buildRound(() => values[i++ % values.length]);
  };

  it('always turns the candidate at least once', () => {
    for (let i = 0; i < 200; i += 1) {
      const { figure, candidate } = buildRound();
      const untouched =
        JSON.stringify(figure) === JSON.stringify(candidate) &&
        figure.length === candidate.length;
      expect(untouched).toBe(false);
    }
  });

  /**
   * The random walk above catches this eventually; this pins the one figure it
   * is actually about. The Z-pentomino is its own half-turn, so a round that
   * drew two turns for it used to show the same picture twice.
   */
  it('turns past a half-turn-symmetric figure rather than showing it twice', () => {
    const zed = FIGURES[FIGURES.length - 1];
    expect(turn(zed, 2)).toStrictEqual(zed);

    // Last figure, two turns, not mirrored.
    const values = [0.99, 0.5, 0.99];
    let i = 0;
    const { figure, candidate } = buildRound(() => values[i++ % values.length]);

    expect(figure).toStrictEqual(zed);
    expect(candidate).not.toStrictEqual(zed);
  });

  it('reports mirrored only when the candidate really is one', () => {
    for (let i = 0; i < 200; i += 1) {
      const { figure, candidate, mirrored } = buildRound();
      const reachableByTurning = [0, 1, 2, 3].some(
        (turns) => JSON.stringify(turn(figure, turns)) === JSON.stringify(candidate),
      );
      // Chirality is what makes these two the same statement: if it can be
      // turned back on, it is not a mirror, and vice versa.
      expect(reachableByTurning).toBe(!mirrored);
    }
  });

  it('takes its randomness from the caller', () => {
    const low = round([0, 0, 0]);
    expect(low.figure).toStrictEqual(FIGURES[0]);
    expect(low.mirrored).toBe(true);

    const high = round([0, 0, 0.99]);
    expect(high.mirrored).toBe(false);
  });

  it('never loses a cell to the transform', () => {
    for (let i = 0; i < 100; i += 1) {
      const { figure, candidate } = buildRound();
      expect(cells(candidate)).toBe(cells(figure));
    }
  });
});
