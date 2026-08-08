/**
 * Join the Numbers, as data. Pure — no React, no timers, no theme.
 *
 * The rules are 2048's and nothing here changes them: a swipe slides every tile
 * as far as it will go, two equal neighbours become one of twice the value, and
 * a tile that has just been made cannot be merged again on the same swipe.
 *
 * What is missing is the half of 2048 that keeps score. There is no points
 * total, no best-ever, and no 2048 tile to be chasing — see the note on
 * `dissolveLowest` for the end of the game, which is the part that had to be
 * rewritten rather than left out. The numbers on the tiles are a score of
 * sorts and there is no version of this game without them; what they are not is
 * a total that survives the session or a target that can be missed.
 *
 * ## Tiles, not a matrix
 *
 * The board could be a 4x4 array of numbers and the rules would be shorter to
 * write. It is a list of identified tiles instead, because the animation is the
 * only thing separating this from a grid of numbers that teleports: a tile has
 * to keep the same identity across a swipe for the view to know it *slid* there
 * rather than appeared there. `absorbed` exists for the same reason — a tile
 * that is eaten still has to be seen travelling to the square it died on.
 */

export type Direction = 'up' | 'down' | 'left' | 'right';

export interface Tile {
  /** Stable across swipes, which is what makes the slide animatable. */
  readonly id: number;
  readonly value: number;
  readonly row: number;
  readonly column: number;
}

export interface Slide {
  /** The board afterwards. */
  tiles: Tile[];
  /**
   * The tiles that were merged away, moved to the square they were merged on.
   * Not part of the board — the view draws them under the survivor for the
   * length of the slide and then drops them.
   */
  absorbed: Tile[];
  /** False when the swipe changed nothing, which is not a move and costs no tile. */
  moved: boolean;
  merges: number;
}

/** 4x4, as everyone else's. Small enough that a swipe is legible on a phone. */
export const SIZE = 4;

/** How many tiles a fresh board opens with. */
const START_TILES = 2;

/** The chance a new tile is a 2 rather than a 4. */
const TWO_CHANCE = 0.9;

/**
 * Ids only have to be unique among the tiles on screen at one time, so a
 * counter that runs for the life of the process is plenty. The one piece of
 * mutable state in the module, and it is deliberately not seeded or reset —
 * a reused id would let the view animate one tile into another's place.
 */
let nextId = 0;

function createTile(value: number, row: number, column: number): Tile {
  nextId += 1;
  return { id: nextId, value, row, column };
}

/** A board to start on: an empty grid with `START_TILES` dropped into it. */
export function createGrid(size = SIZE, random: () => number = Math.random): Tile[] {
  let tiles: Tile[] = [];
  for (let i = 0; i < START_TILES; i += 1) tiles = addTile(tiles, size, random);
  return tiles;
}

/**
 * The board with one new tile on a free square, or unchanged if there are none.
 *
 * `random` is a parameter rather than a call to `Math.random` so the rules can
 * be tested without the dice — every other function here is deterministic and
 * this is the only reason the module would otherwise be hard to pin down.
 */
export function addTile(
  tiles: readonly Tile[],
  size = SIZE,
  random: () => number = Math.random,
): Tile[] {
  const free = freeCells(tiles, size);
  if (free.length === 0) return [...tiles];

  const cell = free[Math.min(free.length - 1, Math.floor(random() * free.length))];
  const value = random() < TWO_CHANCE ? 2 : 4;

  return [...tiles, createTile(value, cell.row, cell.column)];
}

/** Every square with nothing on it, in reading order. */
export function freeCells(
  tiles: readonly Tile[],
  size = SIZE,
): { row: number; column: number }[] {
  const taken = new Set(tiles.map((tile) => `${tile.row},${tile.column}`));
  const cells = [];

  for (let row = 0; row < size; row += 1) {
    for (let column = 0; column < size; column += 1) {
      if (!taken.has(`${row},${column}`)) cells.push({ row, column });
    }
  }
  return cells;
}

/**
 * One swipe.
 *
 * Each of the `size` lines running along the direction of travel is handled on
 * its own: the tiles on it are read leading edge first, then packed back onto
 * the line from that edge, merging a pair as it is met. Reading in travel order
 * is what gives 2048 its one non-obvious rule for free — a row of `2 2 2` swiped
 * left leaves `4 2` rather than `2 4`, because the pair nearest the wall is the
 * pair that meets first.
 *
 * The surviving tile of a merge is the leading one, so both halves of the pair
 * end up travelling *toward* the wall on screen and neither appears to reverse.
 */
export function slide(
  tiles: readonly Tile[],
  direction: Direction,
  size = SIZE,
): Slide {
  const next: Tile[] = [];
  const absorbed: Tile[] = [];
  let moved = false;
  let merges = 0;

  for (let line = 0; line < size; line += 1) {
    const queue = lineOf(tiles, line, direction);

    let slot = 0;
    for (let i = 0; i < queue.length; i += 1) {
      const tile = queue[i];
      const behind = queue[i + 1];
      const at = coordinatesOf(line, slot, direction, size);

      // A tile made by a merge is not eligible again this swipe: `i` steps past
      // its partner, so the next tile considered is the one after the pair.
      if (behind && behind.value === tile.value) {
        next.push({ ...tile, ...at, value: tile.value * 2 });
        absorbed.push({ ...behind, ...at });
        i += 1;
        merges += 1;
        moved = true;
      } else {
        next.push({ ...tile, ...at });
        if (tile.row !== at.row || tile.column !== at.column) moved = true;
      }

      slot += 1;
    }
  }

  return { tiles: next, absorbed, moved, merges };
}

/**
 * Whether any of the four swipes would do something.
 *
 * Cheaper than trying all four: there is a move iff there is a free square or
 * two equal neighbours anywhere on the board.
 */
export function canMove(tiles: readonly Tile[], size = SIZE): boolean {
  if (tiles.length < size * size) return true;

  const board = toMatrix(tiles, size);
  for (let row = 0; row < size; row += 1) {
    for (let column = 0; column < size; column += 1) {
      const value = board[row][column];
      if (column + 1 < size && board[row][column + 1] === value) return true;
      if (row + 1 < size && board[row + 1][column] === value) return true;
    }
  }
  return false;
}

/**
 * Every tile of the smallest value on the board, gone.
 *
 * This is what happens instead of "game over", and it is the same answer the
 * falling-blocks puzzle already gives when its stack reaches the top — see
 * `dissolveLowest` in `session/puzzle/board.ts`. Wiping the board is not a
 * gentle continuation of anything: fifteen tiles the player spent four minutes
 * building disappear in a frame, and whatever the copy says, that reads as
 * losing. Taking the smallest tiles out leaves everything that was worth
 * building, opens room to carry on in, and looks like the board settling.
 *
 * It always frees at least one square and never empties the board, and neither
 * of those is luck: a board with no moves left has no two equal neighbours, so
 * the smallest value cannot be on every square, and it must be on at least one.
 */
export function dissolveLowest(tiles: readonly Tile[]): Tile[] {
  if (tiles.length === 0) return [];

  const lowest = Math.min(...tiles.map((tile) => tile.value));
  return tiles.filter((tile) => tile.value !== lowest);
}

/** The board as plain numbers, 0 for an empty square. For reading, not playing. */
export function toMatrix(tiles: readonly Tile[], size = SIZE): number[][] {
  const board = Array.from({ length: size }, () => Array.from({ length: size }, () => 0));
  tiles.forEach((tile) => {
    board[tile.row][tile.column] = tile.value;
  });
  return board;
}

/** The tiles on one line, ordered leading edge first — the order they pack in. */
function lineOf(tiles: readonly Tile[], line: number, direction: Direction): Tile[] {
  const across = direction === 'left' || direction === 'right';
  const along = (tile: Tile) => (across ? tile.column : tile.row);
  const toward = direction === 'right' || direction === 'down' ? -1 : 1;

  return tiles
    .filter((tile) => (across ? tile.row : tile.column) === line)
    .sort((a, b) => (along(a) - along(b)) * toward);
}

/** Where the `slot`th tile packed onto `line` from the leading edge ends up. */
function coordinatesOf(
  line: number,
  slot: number,
  direction: Direction,
  size: number,
): { row: number; column: number } {
  const across = direction === 'left' || direction === 'right';
  const along = direction === 'right' || direction === 'down' ? size - 1 - slot : slot;

  return across ? { row: line, column: along } : { row: along, column: line };
}
