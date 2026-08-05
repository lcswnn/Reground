import { describe, expect, it } from 'vitest';

import {
  SIZE,
  buildPattern,
  isComplete,
  isGivenHalf,
  reflectCell,
  sameCells,
  type Cell,
  type Pattern,
} from '@/session/games/mirror/pattern';

const patterns = Array.from({ length: 200 }, () => buildPattern());
const key = (cell: Cell) => `${cell.row},${cell.column}`;

/** Whether every cell can be reached from the first by stepping between neighbours. */
function isConnected(cells: readonly Cell[]): boolean {
  const remaining = new Map(cells.map((cell) => [key(cell), cell]));
  const queue = [cells[0]];
  remaining.delete(key(cells[0]));

  while (queue.length > 0) {
    const cell = queue.shift() as Cell;
    for (const neighbour of [
      { row: cell.row - 1, column: cell.column },
      { row: cell.row + 1, column: cell.column },
      { row: cell.row, column: cell.column - 1 },
      { row: cell.row, column: cell.column + 1 },
    ]) {
      const found = remaining.get(key(neighbour));
      if (!found) continue;

      remaining.delete(key(neighbour));
      queue.push(found);
    }
  }

  return remaining.size === 0;
}

describe('reflecting', () => {
  it('is its own undoing', () => {
    for (const axis of ['vertical', 'horizontal'] as const) {
      for (let row = 0; row < SIZE; row += 1) {
        for (let column = 0; column < SIZE; column += 1) {
          const cell = { row, column };
          expect(reflectCell(reflectCell(cell, axis, SIZE), axis, SIZE)).toEqual(cell);
        }
      }
    }
  });

  it('sends the given half to the other one', () => {
    for (const axis of ['vertical', 'horizontal'] as const) {
      for (let row = 0; row < SIZE; row += 1) {
        for (let column = 0; column < SIZE; column += 1) {
          const cell = { row, column };
          expect(isGivenHalf(reflectCell(cell, axis, SIZE), axis, SIZE)).toBe(
            !isGivenHalf(cell, axis, SIZE),
          );
        }
      }
    }
  });

  it('mirrors across the middle, not across the edge', () => {
    expect(reflectCell({ row: 2, column: 0 }, 'vertical', 6)).toEqual({
      row: 2,
      column: 5,
    });
    expect(reflectCell({ row: 0, column: 4 }, 'horizontal', 6)).toEqual({
      row: 5,
      column: 4,
    });
  });
});

describe('a pattern', () => {
  it('starts wholly inside the given half', () => {
    for (const pattern of patterns) {
      for (const cell of pattern.filled) {
        expect(isGivenHalf(cell, pattern.axis, pattern.size)).toBe(true);
      }
      for (const cell of pattern.target) {
        expect(isGivenHalf(cell, pattern.axis, pattern.size)).toBe(false);
      }
    }
  });

  it('never repeats a cell', () => {
    for (const pattern of patterns) {
      expect(new Set(pattern.filled.map(key)).size).toBe(pattern.filled.length);
    }
  });

  /**
   * The property that makes this a shape to picture rather than a list of
   * coordinates to transcribe — see the note on `grow`.
   */
  it('is one connected shape', () => {
    for (const pattern of patterns) expect(isConnected(pattern.filled)).toBe(true);
  });

  it('is big enough to be a shape and small enough to hold', () => {
    for (const pattern of patterns) {
      expect(pattern.filled.length).toBeGreaterThanOrEqual(5);
      expect(pattern.filled.length).toBeLessThanOrEqual(9);
      expect(pattern.target).toHaveLength(pattern.filled.length);
    }
  });

  it('uses both axes', () => {
    expect(new Set(patterns.map((pattern) => pattern.axis)).size).toBe(2);
  });

  it('takes its randomness from the caller', () => {
    const fixed = () => 0.42;
    expect(buildPattern(fixed)).toEqual(buildPattern(fixed));
  });
});

describe('finishing one', () => {
  const pattern: Pattern = buildPattern();

  it('does not care what order the cells were tapped in', () => {
    expect(isComplete([...pattern.target].reverse(), pattern)).toBe(true);
  });

  it('is not finished while a cell is missing or spare', () => {
    expect(isComplete(pattern.target.slice(1), pattern)).toBe(false);
    expect(isComplete([...pattern.target, { row: 0, column: 0 }], pattern)).toBe(false);
    expect(isComplete([], pattern)).toBe(false);
  });

  it('compares cells by where they are', () => {
    expect(sameCells([{ row: 1, column: 2 }], [{ row: 1, column: 2 }])).toBe(true);
    expect(sameCells([{ row: 1, column: 2 }], [{ row: 2, column: 1 }])).toBe(false);
  });
});
