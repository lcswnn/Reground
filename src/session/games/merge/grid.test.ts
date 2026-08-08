import { describe, expect, it } from 'vitest';

import {
  addTile,
  canMove,
  createGrid,
  dissolveLowest,
  freeCells,
  slide,
  toMatrix,
  type Direction,
  type Tile,
} from '@/session/games/merge/grid';

/** A board from plain numbers, 0 empty. Easier to read than a list of tiles. */
function tilesFrom(rows: number[][]): Tile[] {
  const tiles: Tile[] = [];
  rows.forEach((cells, row) =>
    cells.forEach((value, column) => {
      if (value !== 0) tiles.push({ id: tiles.length + 1, value, row, column });
    }),
  );
  return tiles;
}

/** The board after one swipe, as numbers. Square boards only — the game is one. */
function after(rows: number[][], direction: Direction): number[][] {
  return toMatrix(slide(tilesFrom(rows), direction, rows.length).tiles, rows.length);
}

/**
 * One row on an otherwise empty 4x4, swiped, and the row that comes back.
 *
 * Most of the rules are about what happens along a single line, and writing
 * those out as four rows of four is three rows of noise per case.
 */
function rowAfter(cells: number[], direction: Direction): number[] {
  return after(oneRow(cells), direction)[0];
}

/** `cells` as the top row of an otherwise empty 4x4. */
function oneRow(cells: number[]): number[][] {
  return [cells, [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]];
}

const EMPTY = [
  [0, 0, 0, 0],
  [0, 0, 0, 0],
  [0, 0, 0, 0],
  [0, 0, 0, 0],
];

/** A full board with no two equal neighbours: nothing to do in any direction. */
const STUCK = [
  [2, 4, 2, 4],
  [4, 2, 4, 2],
  [2, 4, 2, 4],
  [4, 2, 4, 2],
];

describe('slide', () => {
  it('packs a line against the wall it was swiped toward', () => {
    expect(rowAfter([0, 2, 0, 4], 'left')).toEqual([2, 4, 0, 0]);
    expect(rowAfter([0, 2, 0, 4], 'right')).toEqual([0, 0, 2, 4]);
  });

  it('joins two equal tiles into one of twice the value', () => {
    expect(rowAfter([2, 2, 0, 0], 'left')).toEqual([4, 0, 0, 0]);
  });

  it('merges each pair once — four of a kind make two, not one', () => {
    expect(rowAfter([2, 2, 2, 2], 'left')).toEqual([4, 4, 0, 0]);
  });

  it('merges the pair nearest the wall first', () => {
    expect(rowAfter([2, 2, 2, 0], 'left')).toEqual([4, 2, 0, 0]);
    expect(rowAfter([0, 2, 2, 2], 'right')).toEqual([0, 0, 2, 4]);
  });

  it('leaves unequal neighbours alone', () => {
    expect(rowAfter([2, 4, 2, 4], 'left')).toEqual([2, 4, 2, 4]);
  });

  it('works down columns as well as along rows', () => {
    const board = [
      [2, 0, 0, 0],
      [2, 0, 0, 0],
      [0, 0, 0, 4],
      [0, 0, 0, 4],
    ];

    expect(after(board, 'up')).toEqual([
      [4, 0, 0, 8],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ]);
    expect(after(board, 'down')).toEqual([
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [4, 0, 0, 8],
    ]);
  });

  it('treats a swipe that changes nothing as no move', () => {
    expect(slide(tilesFrom(STUCK), 'left', 4).moved).toBe(false);
    expect(slide(tilesFrom(oneRow([2, 0, 0, 0])), 'left', 4).moved).toBe(false);
  });

  it('counts a merge as a move even when nothing travels', () => {
    const merged = slide(tilesFrom(oneRow([2, 2, 0, 0])), 'left', 4);

    expect(merged.moved).toBe(true);
    expect(merged.merges).toBe(1);
  });

  /**
   * The whole reason tiles are identified rather than counted: the view can only
   * animate a slide if the tile that arrives is the tile that left.
   */
  it('carries tile ids across a swipe', () => {
    const before = tilesFrom(oneRow([0, 0, 0, 2]));
    const moved = slide(before, 'left', 4);

    expect(moved.tiles.map((tile) => tile.id)).toEqual([before[0].id]);
    expect(moved.tiles[0].column).toBe(0);
  });

  it('reports an eaten tile at the square it was eaten on', () => {
    const before = tilesFrom(oneRow([2, 2, 0, 0]));
    const { tiles, absorbed } = slide(before, 'left', 4);

    expect(absorbed).toHaveLength(1);
    // The trailing tile is the one that goes, and it goes to the survivor's
    // square — otherwise it would be drawn dying where it stood.
    expect(absorbed[0].id).toBe(before[1].id);
    expect(absorbed[0].column).toBe(0);
    expect(tiles[0].id).toBe(before[0].id);
  });

  it('never puts two tiles on one square', () => {
    const board = [
      [2, 2, 4, 4],
      [8, 8, 2, 2],
      [0, 4, 0, 4],
      [2, 0, 2, 0],
    ];

    (['up', 'down', 'left', 'right'] as Direction[]).forEach((direction) => {
      const { tiles } = slide(tilesFrom(board), direction, 4);
      const squares = tiles.map((tile) => `${tile.row},${tile.column}`);

      expect(new Set(squares).size, direction).toBe(tiles.length);
    });
  });
});

describe('canMove', () => {
  it('says yes while there is a free square', () => {
    expect(canMove(tilesFrom(EMPTY))).toBe(true);
    expect(canMove(tilesFrom([[2, 4, 2, 4], [4, 2, 4, 2], [2, 4, 2, 4], [4, 2, 4, 0]]))).toBe(
      true,
    );
  });

  it('says yes on a full board with two equal neighbours', () => {
    const full = STUCK.map((row) => [...row]);
    full[0][1] = 2;

    expect(canMove(tilesFrom(full))).toBe(true);
  });

  it('says no on a full board with none', () => {
    expect(canMove(tilesFrom(STUCK))).toBe(false);
  });

  // An empty board is left out on purpose: `canMove` answers "is there room or
  // a pair", which is true of it, while no swipe moves anything. It is not a
  // board the game can be in — play opens with two tiles.
  it('agrees with the four swipes', () => {
    const boards = [
      STUCK,
      oneRow([2, 0, 0, 0]),
      [
        [2, 2, 4, 8],
        [4, 8, 2, 4],
        [2, 4, 8, 2],
        [4, 2, 4, 8],
      ],
    ];

    boards.forEach((board) => {
      const tiles = tilesFrom(board);
      const anySlide = (['up', 'down', 'left', 'right'] as Direction[]).some(
        (direction) => slide(tiles, direction, 4).moved,
      );

      expect(canMove(tiles)).toBe(anySlide);
    });
  });
});

describe('dissolveLowest', () => {
  it('takes every tile of the smallest value and nothing else', () => {
    const left = dissolveLowest(tilesFrom([[2, 4, 2, 8]]));

    expect(left.map((tile) => tile.value)).toEqual([4, 8]);
  });

  /**
   * The no-fail rule, as a property rather than an example: this is only ever
   * reached from a stuck board, and on one it always makes room and always
   * leaves something standing.
   */
  it('frees room on a stuck board without emptying it', () => {
    const left = dissolveLowest(tilesFrom(STUCK));

    expect(left.length).toBeGreaterThan(0);
    expect(freeCells(left).length).toBeGreaterThan(0);
    expect(canMove(left)).toBe(true);
  });

  it('leaves an empty board empty rather than throwing', () => {
    expect(dissolveLowest([])).toEqual([]);
  });
});

describe('addTile', () => {
  it('only ever lands on a free square', () => {
    const board = tilesFrom([
      [2, 4, 2, 4],
      [4, 2, 4, 2],
      [2, 4, 2, 4],
      [4, 2, 0, 2],
    ]);

    const grown = addTile(board, 4, () => 0);
    const landed = grown[grown.length - 1];

    expect(grown).toHaveLength(board.length + 1);
    expect({ row: landed.row, column: landed.column }).toEqual({ row: 3, column: 2 });
  });

  it('drops a 2 nearly always and a 4 otherwise', () => {
    expect(addTile([], 4, () => 0)[0].value).toBe(2);
    expect(addTile([], 4, () => 0.95)[0].value).toBe(4);
  });

  it('adds nothing to a full board', () => {
    const full = tilesFrom(STUCK);

    expect(addTile(full)).toHaveLength(full.length);
  });
});

describe('createGrid', () => {
  it('opens with two tiles on distinct squares', () => {
    const tiles = createGrid();

    expect(tiles).toHaveLength(2);
    expect(new Set(tiles.map((tile) => `${tile.row},${tile.column}`)).size).toBe(2);
    expect(new Set(tiles.map((tile) => tile.id)).size).toBe(2);
    expect(tiles.every((tile) => tile.value === 2 || tile.value === 4)).toBe(true);
  });

  it('always leaves something to do', () => {
    for (let i = 0; i < 50; i += 1) expect(canMove(createGrid())).toBe(true);
  });
});
