/**
 * Line Up Three, as data. Pure — no React, no timers, no theme.
 *
 * The rules are Bejeweled's, minus the half of Bejeweled that keeps score. A
 * swap that makes no line is refused and put back, a line of three or more
 * clears, what was above it falls, and new pieces drop in at the top. Chains
 * happen because a fall can make a new line, and nothing here treats that as
 * worth more than the line that started it.
 *
 * The reason it is on the shelf at all is the East Carolina work on PopCap's
 * casual puzzle games — brief sessions with one of these moved anxiety and
 * mood, measurably, in people who were not playing them as a treatment for
 * anything. That evidence is about the genre and the dose, not about a
 * mechanism competing with an image, which is exactly why this sits on the calm
 * shelf and borrows none of the visuospatial claim. See `GameKind` in
 * `games/catalog.ts`.
 *
 * ## What was taken out
 *
 * **The score.** No points, no multipliers, no cascade bonus, no level. A
 * cascade is nice to watch and that is all it is here.
 *
 * **The loss.** There is no timer and no move limit, and a board with no legal
 * swap left is reshuffled rather than ended — see `reshuffle`, which is this
 * game's version of what `dissolveLowest` does for the tiles next door.
 *
 * ## Pieces, not a matrix
 *
 * The board could be a grid of kinds and every rule here would be shorter. It
 * is a list of identified pieces instead, for the same reason the merge grid is:
 * a piece has to keep its identity across a fall for the view to animate it
 * *dropping* rather than the board redrawing. `spawn` exists for the same
 * reason — a piece created at the top has to be seen arriving from off the
 * board rather than appearing on it.
 */

/**
 * The five pieces. Named by the shape the view draws, because that is the only
 * thing telling them apart: the palette is one ink on one paper, so a board
 * that coded its pieces by colour would be five greys and unplayable. Shape
 * carries it instead — which is also the version that works for anyone who
 * would have failed the colour version anyway.
 */
export type Kind = 'dot' | 'ring' | 'square' | 'diamond' | 'bar';

export const KINDS: readonly Kind[] = ['dot', 'ring', 'square', 'diamond', 'bar'];

export interface Piece {
  /** Stable across swaps and falls, which is what makes both animatable. */
  readonly id: number;
  readonly kind: Kind;
  readonly row: number;
  readonly column: number;
  /**
   * The row this piece should appear to fall from, set only on a piece that has
   * just been created. Negative — it is above the board — and the view uses it
   * as the starting point of the drop and then forgets about it.
   */
  readonly spawn?: number;
}

export interface Cell {
  readonly row: number;
  readonly column: number;
}

/** 6x6. Big enough for a cascade to have somewhere to happen, small enough to tap. */
export const SIZE = 6;

/**
 * How many times a layout is re-rolled looking for one with a move on it.
 *
 * Never reached in practice — five kinds on thirty-six squares leaves a legal
 * swap almost every time — but a bounded loop that occasionally returns a dead
 * board is better than an unbounded one that hangs the session. A dead board
 * costs one more shuffle a moment later; see `settle` in `match-three.tsx`.
 */
const LAYOUT_ATTEMPTS = 40;

/** The same bound, for the same reason, on the deal a stuck board gets. */
const SHUFFLE_ATTEMPTS = 40;

/**
 * Ids only have to be unique among the pieces on screen at once, so a counter
 * that runs for the life of the process is plenty — the same deal as the merge
 * grid's. Deliberately never reset: a reused id would let the view animate one
 * piece into another's place.
 */
let nextId = 0;

function createPiece(kind: Kind, row: number, column: number, spawn?: number): Piece {
  nextId += 1;
  return spawn === undefined
    ? { id: nextId, kind, row, column }
    : { id: nextId, kind, row, column, spawn };
}

/**
 * A board to start on: no line already made, and at least one swap that makes
 * one.
 *
 * Both halves matter. Opening on a board that is already clearing itself reads
 * as the game playing without you, and opening on a board with no legal move
 * means the first thing that happens is a shuffle.
 */
export function createBoard(size = SIZE, random: () => number = Math.random): Piece[] {
  return fromKinds(layOut(size, random), size);
}

/** Every piece, as a grid of kinds. For reading and testing, not for playing. */
export function toKinds(pieces: readonly Piece[], size = SIZE): (Kind | undefined)[][] {
  const grid: (Kind | undefined)[][] = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => undefined),
  );
  pieces.forEach((piece) => {
    if (piece.row >= 0 && piece.row < size) grid[piece.row][piece.column] = piece.kind;
  });
  return grid;
}

/** Whether two cells share an edge. Diagonals are not swaps. */
export function areNeighbours(a: Cell, b: Cell): boolean {
  return Math.abs(a.row - b.row) + Math.abs(a.column - b.column) === 1;
}

/**
 * The board with the pieces on two cells exchanged.
 *
 * Returns the board unchanged if either cell is empty, which cannot happen from
 * a tap but can from a stale one — a finger that landed while the board was
 * still falling.
 */
export function swap(pieces: readonly Piece[], a: Cell, b: Cell): Piece[] {
  const first = at(pieces, a);
  const second = at(pieces, b);
  if (!first || !second) return [...pieces];

  return pieces.map((piece) => {
    if (piece.id === first.id) return { ...piece, row: b.row, column: b.column };
    if (piece.id === second.id) return { ...piece, row: a.row, column: a.column };
    return piece;
  });
}

/**
 * The ids of every piece in a run of three or more, across and down.
 *
 * A set rather than a list of runs, because the only thing anyone asks of this
 * is whether a given piece goes: the two runs of an L or a T overlap at the
 * corner, and a caller counting runs would clear that corner twice.
 */
export function findMatches(pieces: readonly Piece[], size = SIZE): Set<number> {
  const grid = toGrid(pieces, size);
  const matched = new Set<number>();

  const sweep = (read: (line: number, step: number) => Piece | undefined) => {
    for (let line = 0; line < size; line += 1) {
      let run = 1;
      for (let step = 1; step <= size; step += 1) {
        const current = read(line, step);
        const previous = read(line, step - 1);
        const same = current && previous && current.kind === previous.kind;

        if (same) {
          run += 1;
          continue;
        }

        if (run >= 3) {
          for (let back = 1; back <= run; back += 1) {
            const piece = read(line, step - back);
            if (piece) matched.add(piece.id);
          }
        }
        run = 1;
      }
    }
  };

  sweep((row, column) => grid[row]?.[column]);
  sweep((column, row) => grid[row]?.[column]);

  return matched;
}

/** Whether swapping these two cells would make a line. What a tap is judged on. */
export function makesMatch(
  pieces: readonly Piece[],
  a: Cell,
  b: Cell,
  size = SIZE,
): boolean {
  return findMatches(swap(pieces, a, b), size).size > 0;
}

/**
 * The board with the matched pieces gone, everything above them dropped into
 * the gaps, and new pieces filling the top.
 *
 * Column by column: the survivors are read from the bottom up and packed back
 * onto the floor, then the holes left at the top are filled with new pieces
 * whose `spawn` puts them just above the board, stacked so a column losing three
 * pieces has three of them coming down in a line rather than all from the same
 * point.
 *
 * The new pieces are not checked against the board they land on. A fall that
 * happens to make a line is a cascade, and cascades are the good part.
 */
export function collapse(
  pieces: readonly Piece[],
  cleared: ReadonlySet<number>,
  size = SIZE,
  random: () => number = Math.random,
): Piece[] {
  const next: Piece[] = [];

  for (let column = 0; column < size; column += 1) {
    const survivors = pieces
      .filter((piece) => piece.column === column && !cleared.has(piece.id))
      .sort((a, b) => b.row - a.row);

    survivors.forEach((piece, index) => {
      next.push({ ...piece, row: size - 1 - index, spawn: undefined });
    });

    const missing = size - survivors.length;
    for (let index = 0; index < missing; index += 1) {
      const row = missing - 1 - index;
      next.push(createPiece(pick(random), row, column, -1 - index));
    }
  }

  return next;
}

/**
 * Whether any single swap on this board would make a line.
 *
 * Only right and down are tried for each cell: every adjacent pair on the board
 * is some cell's right or down neighbour, so trying all four would test each
 * pair twice.
 */
export function hasMove(pieces: readonly Piece[], size = SIZE): boolean {
  for (let row = 0; row < size; row += 1) {
    for (let column = 0; column < size; column += 1) {
      const here = { row, column };
      if (column + 1 < size && makesMatch(pieces, here, { row, column: column + 1 }, size))
        return true;
      if (row + 1 < size && makesMatch(pieces, here, { row: row + 1, column }, size))
        return true;
    }
  }
  return false;
}

/**
 * The same pieces, dealt back out over the same squares in a different order.
 *
 * This is what happens instead of "no moves left", and it is the same answer
 * the tiles next door give a full board — see `dissolveLowest` in
 * `merge/grid.ts`. Nothing is taken away and nothing is added: every piece on
 * the board stays on the board, so what the player sees is the board
 * rearranging itself rather than being confiscated and replaced.
 *
 * It is the squares that are shuffled rather than the kinds, which is what makes
 * it animate: each piece keeps its identity and slides to a new square, instead
 * of thirty-six pieces changing shape where they stand. Shuffling positions also
 * keeps the mix of kinds exactly as it was, so a reshuffle cannot quietly deal
 * an easier board.
 *
 * The result is checked for both of the things a fresh board is checked for —
 * nothing already in a line, and a swap available — and re-shuffled if it fails
 * either. After `SHUFFLE_ATTEMPTS` it gives up and returns the last one, which
 * costs a stray cascade or one more shuffle a moment later rather than a hang.
 */
export function reshuffle(
  pieces: readonly Piece[],
  size = SIZE,
  random: () => number = Math.random,
): Piece[] {
  const cells: Cell[] = pieces.map((piece) => ({ row: piece.row, column: piece.column }));
  let next: Piece[] = [...pieces];

  for (let attempt = 0; attempt < SHUFFLE_ATTEMPTS; attempt += 1) {
    const dealt = shuffled(cells, random);
    next = pieces.map((piece, index) => ({
      ...piece,
      row: dealt[index].row,
      column: dealt[index].column,
      spawn: undefined,
    }));

    if (findMatches(next, size).size === 0 && hasMove(next, size)) return next;
  }

  return next;
}

/** Fisher-Yates, on a copy. */
function shuffled(cells: readonly Cell[], random: () => number): Cell[] {
  const order = [...cells];
  for (let i = order.length - 1; i > 0; i -= 1) {
    const j = Math.min(i, Math.floor(random() * (i + 1)));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

/**
 * A grid of kinds with no line already on it and at least one swap available.
 *
 * Filled square by square, refusing any kind that would complete a run of three
 * with the two already placed to the left or above. That is enough to guarantee
 * the first half on its own — a run has to have a leftmost or topmost square,
 * and this is the check that square would have failed — so only the second half
 * needs the retry loop.
 */
function layOut(size: number, random: () => number): Kind[][] {
  let grid: Kind[][] = [];

  for (let attempt = 0; attempt < LAYOUT_ATTEMPTS; attempt += 1) {
    grid = Array.from({ length: size }, () => Array.from({ length: size }, () => KINDS[0]));

    for (let row = 0; row < size; row += 1) {
      for (let column = 0; column < size; column += 1) {
        const banned = new Set<Kind>();
        if (column >= 2 && grid[row][column - 1] === grid[row][column - 2])
          banned.add(grid[row][column - 1]);
        if (row >= 2 && grid[row - 1][column] === grid[row - 2][column])
          banned.add(grid[row - 1][column]);

        const allowed = KINDS.filter((kind) => !banned.has(kind));
        grid[row][column] = allowed[Math.min(allowed.length - 1, Math.floor(random() * allowed.length))];
      }
    }

    if (hasMove(fromKinds(grid, size), size)) return grid;
  }

  return grid;
}

/** A grid of kinds as a fresh board of identified pieces. */
function fromKinds(grid: readonly (readonly Kind[])[], size: number): Piece[] {
  const pieces: Piece[] = [];
  for (let row = 0; row < size; row += 1) {
    for (let column = 0; column < size; column += 1) {
      pieces.push(createPiece(grid[row][column], row, column));
    }
  }
  return pieces;
}

/** The pieces by square, for the run scans. Undefined where a square is empty. */
function toGrid(pieces: readonly Piece[], size: number): (Piece | undefined)[][] {
  const grid: (Piece | undefined)[][] = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => undefined),
  );
  pieces.forEach((piece) => {
    if (piece.row >= 0 && piece.row < size && piece.column >= 0 && piece.column < size) {
      grid[piece.row][piece.column] = piece;
    }
  });
  return grid;
}

function at(pieces: readonly Piece[], cell: Cell): Piece | undefined {
  return pieces.find((piece) => piece.row === cell.row && piece.column === cell.column);
}

/** `random` is a parameter everywhere for the same reason it is in the merge grid: so the rules can be tested without the dice. */
function pick(random: () => number): Kind {
  return KINDS[Math.min(KINDS.length - 1, Math.floor(random() * KINDS.length))];
}
