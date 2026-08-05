import { describe, expect, it } from 'vitest';

import {
  canPlace,
  clampColumn,
  clearFullRows,
  createBoard,
  dissolveLowest,
  landingRow,
  place,
  type Board,
} from '@/session/puzzle/board';
import { SHAPES, rotateClockwise } from '@/session/puzzle/shapes';

/** Builds a board from strings, `#` filled. Easier to read than nested arrays. */
function boardFrom(rows: string[]): Board {
  return rows.map((row) => [...row].map((cell) => cell === '#'));
}

const BAR = [[1, 1, 1]] as const;

describe('rotateClockwise', () => {
  it('returns the original grid after four turns', () => {
    for (const shape of SHAPES) {
      let cells = shape.cells;
      for (let i = 0; i < 4; i += 1) cells = rotateClockwise(cells);
      expect(cells).toEqual(shape.cells);
    }
  });

  it('turns a horizontal bar into a vertical one', () => {
    expect(rotateClockwise(BAR)).toEqual([[1], [1], [1]]);
  });
});

describe('canPlace', () => {
  const board = boardFrom(['....', '....', '##..']);

  it('rejects a piece running off the right edge', () => {
    expect(canPlace(board, BAR, 0, 2)).toBe(false);
  });

  it('rejects a piece overlapping a filled cell', () => {
    expect(canPlace(board, BAR, 2, 0)).toBe(false);
  });

  it('accepts a piece in clear space', () => {
    expect(canPlace(board, BAR, 0, 0)).toBe(true);
    expect(canPlace(board, BAR, 1, 1)).toBe(true);
  });
});

describe('landingRow', () => {
  it('drops to the floor of an empty board', () => {
    expect(landingRow(createBoard(5, 4), BAR, 0)).toBe(4);
  });

  it('rests on top of what is already there', () => {
    const board = boardFrom(['....', '....', '....', '#...', '####']);
    expect(landingRow(board, BAR, 0)).toBe(2);
  });

  it('returns -1 when the column is blocked at the top', () => {
    const board = boardFrom(['###.', '....']);
    expect(landingRow(board, BAR, 0)).toBe(-1);
  });
});

describe('place and clearFullRows', () => {
  it('completing a row removes it and drops what was above', () => {
    const filled = place(boardFrom(['....', '#...', '#...', '#...']), BAR, 3, 1);
    expect(filled[3]).toEqual([true, true, true, true]);

    const { board: cleared, cleared: count } = clearFullRows(filled);

    expect(count).toBe(1);
    expect(cleared.length).toBe(4);
    expect(cleared[0].every((cell) => !cell)).toBe(true);
    // The two stacked cells fall by one.
    expect(cleared[2][0]).toBe(true);
    expect(cleared[3][0]).toBe(true);
  });

  it('leaves a board with no full rows alone', () => {
    const board = boardFrom(['....', '###.']);
    expect(clearFullRows(board)).toEqual({ board, cleared: 0 });
  });
});

describe('dissolveLowest', () => {
  it('takes the bottom rows and lets the rest fall', () => {
    const board = boardFrom(['....', '#...', '##..', '###.', '####']);
    const settled = dissolveLowest(board, 2);

    expect(settled).toHaveLength(board.length);
    expect(settled[0].some(Boolean)).toBe(false);
    expect(settled[1].some(Boolean)).toBe(false);
    expect(settled[2].some(Boolean)).toBe(false);
    // What was in the top three rows, two rows lower.
    expect(settled[3]).toEqual(boardFrom(['#...'])[0]);
    expect(settled[4]).toEqual(boardFrom(['##..'])[0]);
  });

  it('keeps something to carry on with rather than clearing everything', () => {
    const board = boardFrom(['##..', '###.', '####']);
    const settled = dissolveLowest(board, 1);
    expect(settled.some((row) => row.some(Boolean))).toBe(true);
  });

  it('treats an over-long count as emptying the board', () => {
    const board = boardFrom(['##..', '####']);
    expect(dissolveLowest(board, 9)).toEqual(createBoard(2, 4));
  });

  it('does nothing when asked for no rows', () => {
    const board = boardFrom(['##..', '####']);
    expect(dissolveLowest(board, 0)).toBe(board);
  });
});

describe('clampColumn', () => {
  it('keeps a piece inside the grid', () => {
    expect(clampColumn(BAR, 5, 6)).toBe(3);
    expect(clampColumn(BAR, -2, 6)).toBe(0);
    expect(clampColumn(BAR, 1, 6)).toBe(1);
  });
});
