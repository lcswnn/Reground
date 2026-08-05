/**
 * The mental-rotation task, as data.
 *
 * Two figures, one turned some number of quarter-turns from the other, and the
 * question is whether it is the *same* figure turned or its mirror image. That
 * is the Shepard–Metzler task, and it is the most literally visuospatial thing
 * in the app: there is no way to answer it except by turning a picture in your
 * head, which is exactly the faculty this step is meant to occupy.
 *
 * Kept as plain data with no React in it, for the same reason `puzzle/board.ts`
 * is — the one property this game depends on can then be asserted rather than
 * eyeballed. See `CHIRAL` below for what that property is.
 */

export type Cell = 0 | 1;
export type Figure = readonly (readonly Cell[])[];

/** Quarter-turns clockwise. Never zero — see `buildRound`. */
export type Turns = 1 | 2 | 3;

export interface Round {
  /** Drawn on the left, always in its given orientation. */
  figure: Figure;
  /** Drawn on the right: `figure` turned, and possibly flipped first. */
  candidate: Figure;
  /** The answer. `true` means the candidate cannot be turned back onto it. */
  mirrored: boolean;
}

/** One quarter-turn clockwise. */
export function rotate(figure: Figure): Figure {
  const rows = figure.length;
  const columns = figure[0].length;
  return Array.from({ length: columns }, (_, r) =>
    Array.from({ length: rows }, (_, c) => figure[rows - 1 - c][r]),
  );
}

/** Flipped left-to-right. The only flip needed: a vertical one is this turned. */
export function mirror(figure: Figure): Figure {
  return figure.map((row) => [...row].reverse());
}

export function turn(figure: Figure, turns: number): Figure {
  let out = figure;
  for (let i = 0; i < turns; i += 1) out = rotate(out);
  return out;
}

const same = (a: Figure, b: Figure): boolean =>
  a.length === b.length &&
  a[0].length === b[0].length &&
  a.every((row, r) => row.every((cell, c) => cell === b[r][c]));

/**
 * Whether a figure can be told apart from its own mirror image.
 *
 * The whole task rests on this. An achiral figure — one that lands on its own
 * reflection after some number of turns — makes the question unanswerable:
 * "same or mirrored?" has both answers at once, and a player who reasons
 * correctly is told they are wrong half the time. It is not a difficulty
 * problem, it is a broken question, and it is invisible by inspection once a
 * figure is more than about four cells. So it is checked here and asserted in
 * the tests rather than trusted to whoever adds the next shape.
 */
export function isChiral(figure: Figure): boolean {
  const reflected = mirror(figure);
  for (let turns = 0; turns < 4; turns += 1) {
    if (same(turn(figure, turns), reflected)) return false;
  }
  return true;
}

/**
 * The figures, all of them chiral and none of them symmetrical enough to be
 * read at a glance.
 *
 * Pentominoes rather than tetrominoes, mostly: the four-cell shapes have only
 * two chiral pairs between them (S/Z and L/J) and both are recognisable as
 * letters, which lets the task be answered by naming the shape instead of by
 * turning it. Five cells is where naming stops being quicker than rotating.
 */
export const FIGURES: readonly Figure[] = [
  // F
  [
    [0, 1, 1],
    [1, 1, 0],
    [0, 1, 0],
  ],
  // Y
  [
    [0, 1],
    [1, 1],
    [0, 1],
    [0, 1],
  ],
  // N
  [
    [0, 1],
    [0, 1],
    [1, 1],
    [1, 0],
  ],
  // P
  [
    [1, 1],
    [1, 1],
    [1, 0],
  ],
  // L
  [
    [1, 0],
    [1, 0],
    [1, 0],
    [1, 1],
  ],
  // J, which is L's mirror — both are here so that neither reflection is the
  // odd one out. A player who learns "the long one always points left" would
  // otherwise be right more often than chance without rotating anything.
  [
    [0, 1],
    [0, 1],
    [0, 1],
    [1, 1],
  ],
  // Z-pentomino (S)
  [
    [1, 1, 0],
    [0, 1, 0],
    [0, 1, 1],
  ],
] as const;

/**
 * A round, given a source of randomness.
 *
 * `random` is injected rather than reached for so the tests can pin it. The
 * turn count is never zero: an untouched copy makes the answer readable without
 * rotating anything, which is the one thing this task is for.
 *
 * Nor is a non-zero turn count enough on its own. The Z-pentomino at the bottom
 * of `FIGURES` has half-turn symmetry — turn it twice and it is back where it
 * started — so one round in forty-odd used to put two identical figures on
 * screen and ask whether they were the same. That is not a hard round, it is a
 * round with no work in it, and it looked like a bug in the drawing rather than
 * a question. Hence the loop below, which walks the turn count on until the
 * figure has visibly moved.
 */
export function buildRound(random: () => number = Math.random): Round {
  const figure = FIGURES[Math.floor(random() * FIGURES.length)];
  // Drawn before `mirrored` and kept, rather than being drawn where it is used:
  // the order these three come out of `random` is what the tests pin, and
  // shuffling it silently changes every seeded round.
  const drawnTurns = Math.floor(random() * 3) + 1;
  const mirrored = random() < 0.5;

  const source = mirrored ? mirror(figure) : figure;
  let turns = drawnTurns as Turns;
  // At most three steps: it is walking a cycle of three, and a figure that
  // looked the same at every one of them would have to be four-fold
  // symmetric — which is impossible here, since all of these are chiral.
  for (let i = 0; i < 3 && same(turn(source, turns), figure); i += 1) {
    turns = ((turns % 3) + 1) as Turns;
  }

  return { figure, candidate: turn(source, turns), mirrored };
}
