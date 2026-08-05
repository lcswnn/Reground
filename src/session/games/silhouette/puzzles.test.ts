import { describe, expect, it } from 'vitest';

import {
  BOARDS,
  PUZZLES,
  buildPuzzle,
  cellsAt,
  distinctRotations,
  fits,
  outlineSize,
  rotateCells,
  type Grid,
} from '@/session/games/silhouette/puzzles';

const boards = BOARDS.map((puzzle, index) => [index, puzzle] as const);

const filled = (cells: Grid) => cells.flat().filter(Boolean).length;

function isConnected(cells: Grid): boolean {
  const at = cellsAt(cells, 0, 0);
  const remaining = new Map(at.map((cell) => [`${cell.row},${cell.column}`, cell]));
  const queue = [at[0]];
  remaining.delete(`${at[0].row},${at[0].column}`);

  while (queue.length > 0) {
    const cell = queue.shift() as { row: number; column: number };
    for (const neighbour of [
      { row: cell.row - 1, column: cell.column },
      { row: cell.row + 1, column: cell.column },
      { row: cell.row, column: cell.column - 1 },
      { row: cell.row, column: cell.column + 1 },
    ]) {
      const key = `${neighbour.row},${neighbour.column}`;
      if (!remaining.has(key)) continue;

      remaining.delete(key);
      queue.push(neighbour);
    }
  }
  return remaining.size === 0;
}

describe('the puzzles', () => {
  it('are rectangular grids', () => {
    for (const rows of PUZZLES) {
      expect(new Set(rows.map((row) => row.length)).size).toBe(1);
    }
  });

  /**
   * The one that makes a letter grid a puzzle rather than a doodle: the pieces
   * cover the silhouette exactly, with nothing left over and nothing counted
   * twice. It is true by construction of anything written the way `PUZZLES` is
   * written — which is the point of writing them that way — but a stray letter
   * in a wall of As and Bs is invisible, and the failure it causes is a puzzle
   * that cannot be finished.
   */
  it.each(boards)('puzzle %i is tiled exactly by its own pieces', (_, puzzle) => {
    const cells = puzzle.pieces.flatMap((piece) => filled(piece.cells));
    expect(cells.reduce((sum, count) => sum + count, 0)).toBe(outlineSize(puzzle));
  });

  it.each(boards)('puzzle %i has pieces that are each one shape', (_, puzzle) => {
    for (const piece of puzzle.pieces) {
      expect(isConnected(piece.cells)).toBe(true);
      expect(filled(piece.cells)).toBeGreaterThanOrEqual(3);
    }
  });

  /**
   * A piece that looks the same whichever way up it is can be dropped without
   * ever being turned, and turning things is what this whole step is for.
   */
  it.each(boards)('puzzle %i asks for every piece to be turned', (_, puzzle) => {
    for (const piece of puzzle.pieces) {
      expect(distinctRotations(piece.cells)).toBeGreaterThan(1);
    }
  });

  it.each(boards)('puzzle %i trims each piece to its own box', (_, puzzle) => {
    for (const piece of puzzle.pieces) {
      // No empty edge row or column: a piece with padding round it would drop
      // a cell short of where it looks like it is going.
      expect(piece.cells[0].some(Boolean)).toBe(true);
      expect(piece.cells[piece.cells.length - 1].some(Boolean)).toBe(true);
      expect(piece.cells.some((row) => row[0] === 1)).toBe(true);
      expect(piece.cells.some((row) => row[row.length - 1] === 1)).toBe(true);
    }
  });

  it.each(boards)('puzzle %i gets harder than the one before it', (_, puzzle) => {
    const index = BOARDS.indexOf(puzzle);
    if (index === 0) return;
    expect(outlineSize(puzzle)).toBeGreaterThan(outlineSize(BOARDS[index - 1]));
  });

  it('can be solved by putting every piece back where it came from', () => {
    // The letter grid is a solution, so replaying it has to fill the outline.
    PUZZLES.forEach((rows, index) => {
      const puzzle = BOARDS[index];
      const taken = new Set<string>();

      for (const piece of puzzle.pieces) {
        const top = rows.findIndex((row) => row.includes(piece.id));
        const left = Math.min(
          ...rows.map((row) => row.indexOf(piece.id)).filter((column) => column >= 0),
        );

        expect(fits(puzzle, taken, piece.cells, top, left)).toBe(true);
        for (const cell of cellsAt(piece.cells, top, left)) {
          taken.add(`${cell.row},${cell.column}`);
        }
      }

      expect(taken.size).toBe(outlineSize(puzzle));
    });
  });
});

describe('placing a piece', () => {
  const puzzle = buildPuzzle(['AAB', '.AB']);

  it('says no when it hangs outside the silhouette', () => {
    const piece = puzzle.pieces[0].cells;
    expect(fits(puzzle, new Set(), piece, 0, 0)).toBe(true);
    // One column further right and its foot hangs off the end of the grid.
    expect(fits(puzzle, new Set(), piece, 0, 2)).toBe(false);
    // One row down and its shoulder sits on the notch, which is not silhouette.
    expect(fits(puzzle, new Set(), piece, 1, 0)).toBe(false);
    expect(fits(puzzle, new Set(), piece, -1, 0)).toBe(false);
  });

  it('says no when something is already there', () => {
    const piece = puzzle.pieces[0].cells;
    expect(fits(puzzle, new Set(['0,0']), piece, 0, 0)).toBe(false);
  });

  it('reports the cells it would cover', () => {
    expect(cellsAt([[1, 1], [0, 1]], 2, 3)).toEqual([
      { row: 2, column: 3 },
      { row: 2, column: 4 },
      { row: 3, column: 4 },
    ]);
  });
});

describe('turning a piece', () => {
  it('comes back to itself after four turns', () => {
    for (const puzzle of BOARDS) {
      for (const piece of puzzle.pieces) {
        let turned: Grid = piece.cells;
        for (let i = 0; i < 4; i += 1) turned = rotateCells(turned);
        expect(turned).toEqual(piece.cells);
      }
    }
  });

  it('keeps every cell', () => {
    for (const puzzle of BOARDS) {
      for (const piece of puzzle.pieces) {
        expect(filled(rotateCells(piece.cells))).toBe(filled(piece.cells));
      }
    }
  });
});
