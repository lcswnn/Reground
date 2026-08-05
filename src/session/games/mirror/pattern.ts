/**
 * Mirror Complete, as data.
 *
 * Half a pattern is on the grid and the other half is missing; the player fills
 * it in. The transformation is a reflection rather than a rotation, which is the
 * reason it is in the set at all — everything else here turns things, and a
 * reflection is a different mental operation that happens to use the same
 * machinery. It also has no wrong-answer moment: a cell can be tapped off again,
 * so the game is finished or not yet finished, and never failed.
 *
 * ## The shapes are grown, not scattered
 *
 * A random handful of cells would make this an exercise in copying coordinates
 * one at a time — find a dot, count across, tap. Growing the pattern outward
 * from one cell gives it a silhouette, and a silhouette can be held in the head
 * as a single object and reflected in one go, which is the thing worth
 * practising. See `grow`.
 */

export type Axis = 'vertical' | 'horizontal';

export interface Cell {
  row: number;
  column: number;
}

export interface Pattern {
  /** The grid is `size` × `size`, with the axis down the middle of it. */
  size: number;
  axis: Axis;
  /** The half that is given, already filled in. */
  filled: readonly Cell[];
  /** Its reflection: what the player has to end up having tapped. */
  target: readonly Cell[];
}

/** Even, so the axis falls between two cells rather than through a row of them. */
export const SIZE = 6;

/** How much of the half-grid gets filled. Below five it is barely a shape. */
const CELLS = { min: 5, max: 9 } as const;

export function reflectCell(cell: Cell, axis: Axis, size: number): Cell {
  return axis === 'vertical'
    ? { row: cell.row, column: size - 1 - cell.column }
    : { row: size - 1 - cell.row, column: cell.column };
}

/** Whether a cell is in the given half — the one that starts filled in. */
export function isGivenHalf(cell: Cell, axis: Axis, size: number): boolean {
  return axis === 'vertical' ? cell.column < size / 2 : cell.row < size / 2;
}

const key = (cell: Cell): string => `${cell.row},${cell.column}`;

/** Order is not part of a pattern: the same cells in any order are the same half. */
export function sameCells(a: readonly Cell[], b: readonly Cell[]): boolean {
  if (a.length !== b.length) return false;

  const inB = new Set(b.map(key));
  return a.every((cell) => inB.has(key(cell)));
}

export function isComplete(placed: readonly Cell[], pattern: Pattern): boolean {
  return sameCells(placed, pattern.target);
}

/**
 * A connected blob inside the given half.
 *
 * Grown a cell at a time from a random start, each new cell touching one that
 * is already there — so what comes out is one shape rather than a constellation.
 * The frontier is rebuilt each step rather than kept, which is slower and much
 * harder to get wrong on a grid this size.
 */
function grow(size: number, axis: Axis, count: number, random: () => number): Cell[] {
  const half = (cell: Cell) => isGivenHalf(cell, axis, size);
  const start: Cell = {
    row: Math.floor(random() * size),
    column: Math.floor(random() * size),
  };

  const cells: Cell[] = [
    axis === 'vertical'
      ? { row: start.row, column: start.column % (size / 2) }
      : { row: start.row % (size / 2), column: start.column },
  ];
  const taken = new Set(cells.map(key));

  while (cells.length < count) {
    const frontier: Cell[] = [];

    for (const cell of cells) {
      for (const neighbour of [
        { row: cell.row - 1, column: cell.column },
        { row: cell.row + 1, column: cell.column },
        { row: cell.row, column: cell.column - 1 },
        { row: cell.row, column: cell.column + 1 },
      ]) {
        if (neighbour.row < 0 || neighbour.row >= size) continue;
        if (neighbour.column < 0 || neighbour.column >= size) continue;
        if (!half(neighbour) || taken.has(key(neighbour))) continue;

        frontier.push(neighbour);
      }
    }

    // Only possible if the half is full, which at these counts it never is.
    if (frontier.length === 0) break;

    const next = frontier[Math.floor(random() * frontier.length)];
    cells.push(next);
    taken.add(key(next));
  }

  return cells;
}

export function buildPattern(random: () => number = Math.random): Pattern {
  const axis: Axis = random() < 0.5 ? 'vertical' : 'horizontal';
  const count = CELLS.min + Math.floor(random() * (CELLS.max - CELLS.min + 1));
  const filled = grow(SIZE, axis, count, random);

  return {
    size: SIZE,
    axis,
    filled,
    target: filled.map((cell) => reflectCell(cell, axis, SIZE)),
  };
}
