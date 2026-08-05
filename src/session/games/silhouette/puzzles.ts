/**
 * Silhouette Fit, as data.
 *
 * An outline and a handful of irregular pieces that fill it exactly. Longer and
 * more absorbing than the trial games — one of these takes minutes rather than
 * seconds — which is what it is for: it is the back half of a session, after
 * the short-answer games have done their work and sitting still has stopped
 * being difficult.
 *
 * ## The puzzles are written as their own solutions
 *
 * Each one is a grid of letters. A letter's cells are one piece, and every cell
 * that has a letter is part of the outline. So the thing that is authored is a
 * finished puzzle, and the two facts that matter — the pieces tile the outline,
 * and each piece is one connected shape — are true of anything written this way
 * or are a typo the tests catch. Generating tilings and checking them by hand
 * are both worse than not being able to write down an impossible puzzle.
 *
 * What the player is shown is the outline with the letters taken off, and the
 * pieces in a tray, turned. Nothing in here knows where a piece "should" go:
 * any placement that stays inside the outline and overlaps nothing is legal,
 * and finishing means the outline is full — see `SilhouetteFit` for why that
 * matters and what happens when a legal placement paints someone into a corner.
 */

export type Cell = 0 | 1;
export type Grid = readonly (readonly Cell[])[];

export interface Piece {
  /** The letter it was written as. Stable, so a tray piece keeps its identity. */
  id: string;
  /** Trimmed to its own bounding box. */
  cells: Grid;
}

export interface Puzzle {
  rows: number;
  columns: number;
  /** True where the silhouette is. */
  outline: readonly (readonly boolean[])[];
  pieces: readonly Piece[];
}

/**
 * The puzzles, smallest first.
 *
 * Three of them, and they get bigger rather than trickier: fifteen cells, then
 * twenty, then twenty-five. A fourth is a fourth array of strings — the tests
 * will tell you if it is not a puzzle.
 */
export const PUZZLES: readonly (readonly string[])[] = [
  ['AABBB', 'AACBB', 'ACCCC'],
  ['AAABB', 'ACABB', 'CCCBD', 'CDDDD'],
  ['AAABB', 'CABBB', 'CADDD', 'CDDEE', 'CCEEE'],
];

/** 90° clockwise. */
export function rotateCells(cells: Grid): Grid {
  const rows = cells.length;
  const columns = cells[0].length;

  return Array.from({ length: columns }, (_, row) =>
    Array.from({ length: rows }, (_, column) => cells[rows - 1 - column][row]),
  );
}

export function distinctRotations(cells: Grid): number {
  const seen = new Set<string>();
  let turned = cells;

  for (let i = 0; i < 4; i += 1) {
    seen.add(JSON.stringify(turned));
    turned = rotateCells(turned);
  }
  return seen.size;
}

/** A piece's cells, cut out of the letter grid and trimmed to its own box. */
function pieceFrom(rows: readonly string[], letter: string): Grid {
  const at: { row: number; column: number }[] = [];

  rows.forEach((line, row) => {
    [...line].forEach((mark, column) => {
      if (mark === letter) at.push({ row, column });
    });
  });

  const top = Math.min(...at.map((cell) => cell.row));
  const left = Math.min(...at.map((cell) => cell.column));
  const height = Math.max(...at.map((cell) => cell.row)) - top + 1;
  const width = Math.max(...at.map((cell) => cell.column)) - left + 1;

  const grid: Cell[][] = Array.from({ length: height }, () =>
    Array.from({ length: width }, () => 0 as Cell),
  );
  for (const cell of at) grid[cell.row - top][cell.column - left] = 1;

  return grid;
}

export function buildPuzzle(rows: readonly string[]): Puzzle {
  const letters = [...new Set(rows.join('').split('').filter((mark) => mark !== '.'))].sort();

  return {
    rows: rows.length,
    columns: rows[0].length,
    outline: rows.map((line) => [...line].map((mark) => mark !== '.')),
    pieces: letters.map((letter) => ({ id: letter, cells: pieceFrom(rows, letter) })),
  };
}

export const BOARDS: readonly Puzzle[] = PUZZLES.map(buildPuzzle);

/** Where a piece's filled cells land if its top-left corner goes at (row, column). */
export function cellsAt(
  cells: Grid,
  row: number,
  column: number,
): { row: number; column: number }[] {
  const out: { row: number; column: number }[] = [];

  cells.forEach((line, r) => {
    line.forEach((cell, c) => {
      if (cell) out.push({ row: row + r, column: column + c });
    });
  });
  return out;
}

/**
 * Whether a piece can go there: inside the silhouette, and on nothing that is
 * already taken. Being outside the *grid* is covered by the first of those —
 * there is no outline out there either.
 */
export function fits(
  puzzle: Puzzle,
  taken: ReadonlySet<string>,
  cells: Grid,
  row: number,
  column: number,
): boolean {
  return cellsAt(cells, row, column).every(
    (cell) =>
      puzzle.outline[cell.row]?.[cell.column] === true &&
      !taken.has(`${cell.row},${cell.column}`),
  );
}

/** How many cells the silhouette has, which is when it is finished. */
export function outlineSize(puzzle: Puzzle): number {
  return puzzle.outline.flat().filter(Boolean).length;
}
