/**
 * Grid logic for the puzzle. Pure — no React, no timers, no randomness.
 *
 * There is no fail state anywhere in here. `landingRow` returning -1 means the
 * board has no room, and the caller's answer to that is to clear it and carry
 * on, not to end anything.
 */

import type { ShapeGrid } from '@/session/puzzle/shapes';

export type Board = readonly (readonly boolean[])[];

export function createBoard(rows: number, columns: number): Board {
  return Array.from({ length: rows }, () => Array.from({ length: columns }, () => false));
}

/** Whether `cells` fits with its top-left corner at (row, column). */
export function canPlace(
  board: Board,
  cells: ShapeGrid,
  row: number,
  column: number,
): boolean {
  for (let r = 0; r < cells.length; r += 1) {
    for (let c = 0; c < cells[r].length; c += 1) {
      if (!cells[r][c]) continue;

      const boardRow = row + r;
      const boardColumn = column + c;

      if (boardRow < 0 || boardRow >= board.length) return false;
      if (boardColumn < 0 || boardColumn >= board[0].length) return false;
      if (board[boardRow][boardColumn]) return false;
    }
  }
  return true;
}

/**
 * The row a piece dropped from the top of `column` comes to rest on, or -1 if
 * it cannot even enter the board.
 */
export function landingRow(board: Board, cells: ShapeGrid, column: number): number {
  if (!canPlace(board, cells, 0, column)) return -1;

  let row = 0;
  while (canPlace(board, cells, row + 1, column)) row += 1;
  return row;
}

/** Board with `cells` written in. Assumes `canPlace` already said yes. */
export function place(
  board: Board,
  cells: ShapeGrid,
  row: number,
  column: number,
): Board {
  const next = board.map((boardRow) => [...boardRow]);

  for (let r = 0; r < cells.length; r += 1) {
    for (let c = 0; c < cells[r].length; c += 1) {
      if (cells[r][c]) next[row + r][column + c] = true;
    }
  }
  return next;
}

/**
 * Removes any full rows and drops what was above them, the way you would
 * expect. No score comes back — only how many went, which the caller uses to
 * decide whether anything is worth a haptic.
 */
export function clearFullRows(board: Board): { board: Board; cleared: number } {
  const columns = board[0].length;
  const kept = board.filter((row) => !row.every(Boolean));
  const cleared = board.length - kept.length;

  if (cleared === 0) return { board, cleared: 0 };

  const empty = Array.from({ length: cleared }, () =>
    Array.from({ length: columns }, () => false),
  );
  return { board: [...empty, ...kept], cleared };
}

/** Keeps a piece's column in range as it is moved or rotated. */
export function clampColumn(cells: ShapeGrid, column: number, columns: number): number {
  const width = cells[0].length;
  return Math.max(0, Math.min(column, columns - width));
}
