/**
 * Net Fold, as data.
 *
 * Six squares laid out flat, and the question is which face ends up opposite a
 * marked one when they are folded into a cube. Same family as Paper Fold and a
 * different flavour of it: there the object stays flat and you undo something
 * done to it, here you have to build a solid in your head and then look at the
 * side of it you cannot see. The two do not feel like the same game back to
 * back, which is why both are here.
 *
 * ## How the folding is worked out
 *
 * Every face carries a frame — three unit vectors saying which way is right,
 * which way is down, and which way it faces once folded — and stepping to a
 * neighbour on the net is a quarter-turn of that frame about the edge they
 * share. Walking the net from any starting face gives all six outward normals,
 * and "opposite" is then just the face whose normal is the negative of another's.
 *
 * That also decides, for free, whether a hexomino is a cube net at all: it is,
 * exactly when the walk reaches all six faces and no two of them end up facing
 * the same way. `isCubeNet` is that check, and the nets below are held to it in
 * the tests rather than being trusted — a hexomino that looks like a net and is
 * not is very easy to write down, and the failure is a question with no answer.
 */

export type Vec = readonly [number, number, number];

/** Where a face's own right, down and outward directions point once folded. */
export interface Frame {
  right: Vec;
  down: Vec;
  out: Vec;
}

export interface Cell {
  row: number;
  column: number;
}

export interface NetRound {
  /** The net as a grid: a pip count where there is a face, `null` where there isn't. */
  grid: readonly (readonly (number | null)[])[];
  /** The face the question is about. */
  marked: number;
  /** The face that ends up on the far side of the cube from it. */
  answer: number;
  /** Four pip counts, one of which is `answer`. */
  options: readonly number[];
}

const START: Frame = { right: [1, 0, 0], down: [0, 1, 0], out: [0, 0, 1] };

const neg = (vector: Vec): Vec => [-vector[0], -vector[1], -vector[2]];
const key = (vector: Vec): string => vector.join(',');

/**
 * The frame of the neighbour in a given direction.
 *
 * Folding a neighbour up brings its face onto the side of the cube that the
 * shared edge points at, so the direction of travel becomes the new outward
 * normal and the old normal falls back into the plane. The two axes along the
 * shared edge are untouched, which is the part worth checking against a real
 * piece of paper if this ever needs changing: a fold does nothing to the crease.
 */
export function step(frame: Frame, direction: 'right' | 'left' | 'down' | 'up'): Frame {
  switch (direction) {
    case 'right':
      return { right: neg(frame.out), down: frame.down, out: frame.right };
    case 'left':
      return { right: frame.out, down: frame.down, out: neg(frame.right) };
    case 'down':
      return { right: frame.right, down: neg(frame.out), out: frame.down };
    case 'up':
      return { right: frame.right, down: frame.out, out: neg(frame.down) };
  }
}

/** Reads a net from `#` and `.`, which is the only readable way to write one. */
export function parseNet(rows: readonly string[]): Cell[] {
  const cells: Cell[] = [];

  rows.forEach((line, row) => {
    [...line].forEach((mark, column) => {
      if (mark === '#') cells.push({ row, column });
    });
  });
  return cells;
}

/**
 * The outward normal of every face, indexed the same as `cells`, or `null` if
 * these six squares do not fold into a cube.
 */
export function foldNet(cells: readonly Cell[]): Vec[] | null {
  if (cells.length !== 6) return null;

  const indexAt = new Map(cells.map((cell, index) => [`${cell.row},${cell.column}`, index]));
  const frames: (Frame | null)[] = cells.map(() => null);

  frames[0] = START;
  const queue = [0];

  while (queue.length > 0) {
    const current = queue.shift() as number;
    const cell = cells[current];
    const frame = frames[current] as Frame;

    const neighbours = [
      { direction: 'right', row: cell.row, column: cell.column + 1 },
      { direction: 'left', row: cell.row, column: cell.column - 1 },
      { direction: 'down', row: cell.row + 1, column: cell.column },
      { direction: 'up', row: cell.row - 1, column: cell.column },
    ] as const;

    for (const neighbour of neighbours) {
      const index = indexAt.get(`${neighbour.row},${neighbour.column}`);
      if (index === undefined || frames[index]) continue;

      frames[index] = step(frame, neighbour.direction);
      queue.push(index);
    }
  }

  if (frames.some((frame) => frame === null)) return null;

  const normals = frames.map((frame) => (frame as Frame).out);
  // Six faces pointing six different ways is what being a cube means. Anything
  // that folds onto itself — the 2×3 block is the famous one — fails here.
  if (new Set(normals.map(key)).size !== 6) return null;

  return normals;
}

export function isCubeNet(cells: readonly Cell[]): boolean {
  return foldNet(cells) !== null;
}

/** The face across the cube from `index`, by position in `cells`. */
export function oppositeFace(cells: readonly Cell[], index: number): number | null {
  const normals = foldNet(cells);
  if (!normals) return null;

  const wanted = key(neg(normals[index]));
  const found = normals.findIndex((normal) => key(normal) === wanted);
  return found === -1 ? null : found;
}

/**
 * The nets in play.
 *
 * A subset of the eleven, not all of them: these are the ones that stay legible
 * at the size a phone can give them, and they cover the three families a player
 * has to be able to read — the long row with two flaps, the staircase, and the
 * two rows of three. Every one is checked by `nets.test.ts`, so adding a
 * twelfth here is safe in the only way that matters.
 */
export const NETS: readonly string[][] = [
  ['.#..', '####', '..#.'],
  ['#...', '####', '...#'],
  ['.#..', '####', '.#..'],
  ['..#.', '####', '#...'],
  ['##..', '.##.', '..##'],
  // Two rows of three, offset by two. Offset by one is the near-miss this
  // shipped with for about a minute: it looks like a net and folds two faces
  // onto the same side of the cube.
  ['###..', '..###'],
  ['#...', '###.', '..##'],
];

/** A quarter-turn of the whole net. Folds the same, looks different. */
export function turnNet(cells: readonly Cell[]): Cell[] {
  const height = Math.max(...cells.map((cell) => cell.row)) + 1;
  return cells.map((cell) => ({ row: cell.column, column: height - 1 - cell.row }));
}

/** The net flipped left-to-right. Also still a net. */
export function flipNet(cells: readonly Cell[]): Cell[] {
  const width = Math.max(...cells.map((cell) => cell.column)) + 1;
  return cells.map((cell) => ({ row: cell.row, column: width - 1 - cell.column }));
}

/** Cells laid back out as a grid, with the pip count of each face in place. */
export function toGrid(cells: readonly Cell[], pips: readonly number[]): (number | null)[][] {
  const rows = Math.max(...cells.map((cell) => cell.row)) + 1;
  const columns = Math.max(...cells.map((cell) => cell.column)) + 1;
  const grid: (number | null)[][] = Array.from({ length: rows }, () =>
    Array.from({ length: columns }, () => null),
  );

  cells.forEach((cell, index) => {
    grid[cell.row][cell.column] = pips[index];
  });
  return grid;
}

function shuffle<T>(items: readonly T[], random: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * A round.
 *
 * The net is turned and sometimes flipped before it is drawn, and the pips are
 * dealt fresh every time. Both are there for the same reason: without them the
 * same seven pictures come round again, and a player who has seen one before
 * answers from memory instead of by folding it — which looks like the game
 * working and is the opposite of it.
 */
export function buildRound(random: () => number = Math.random): NetRound {
  const base = parseNet(NETS[Math.floor(random() * NETS.length)]);

  let cells = random() < 0.5 ? flipNet(base) : base;
  const turns = Math.floor(random() * 4);
  for (let i = 0; i < turns; i += 1) cells = turnNet(cells);

  const pips = shuffle([1, 2, 3, 4, 5, 6], random);
  const marked = Math.floor(random() * 6);
  // Non-null by construction: every net in `NETS` folds, and turning or
  // flipping one cannot stop it — both are asserted in the tests.
  const answer = oppositeFace(cells, marked) as number;

  const others = pips.filter((pip, index) => index !== marked && index !== answer);
  const options = shuffle([pips[answer], ...shuffle(others, random).slice(0, 3)], random);

  return {
    grid: toGrid(cells, pips),
    marked: pips[marked],
    answer: pips[answer],
    options,
  };
}
