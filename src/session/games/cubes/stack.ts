/**
 * Hidden Cube Count, as data.
 *
 * A pile of cubes on a 3×3 footprint, drawn from one corner, and the question
 * is how many there are — including the ones the pile itself is hiding. That
 * last clause is the entire task: the faces you can see can be counted off the
 * screen, so the only way to the answer is to hold the solid in your head and
 * look at the parts of it that were never drawn.
 *
 * Which means a stack with nothing hidden in it is not an item at all, and
 * `buildRound` will not produce one — see `hiddenCubes`.
 *
 * Heights, not voxels: every column is solid from the ground up. Floating cubes
 * would make the count ambiguous in a way that has nothing to do with imagery —
 * "is that gap empty or is there something in it?" is a question about the
 * drawing, and the player would be right to refuse to answer it.
 */

export type Heights = readonly (readonly number[])[];

export interface Cube {
  column: number;
  row: number;
  level: number;
}

export interface CubeRound {
  heights: Heights;
  total: number;
  /** How many of them cannot be seen. Never zero. */
  hidden: number;
  options: readonly number[];
  answerIndex: number;
}

/** The footprint. Bigger than this and counting stops being imagery and starts being bookkeeping. */
export const BASE = 3;
const MAX_HEIGHT = 3;

/** Totals outside this are either trivial or a chore. */
const TOTAL_RANGE = { min: 7, max: 15 } as const;
/** Below this the pile reads as a few separate towers rather than one object. */
const MIN_COLUMNS = 6;

export function totalCubes(heights: Heights): number {
  return heights.flat().reduce((sum, height) => sum + height, 0);
}

/**
 * How many cubes are out of sight.
 *
 * The view looks down the (1, 1, 1) diagonal — see `iso.ts` — so a cube shows
 * three of its faces: the top, and the two pointing toward the viewer along the
 * column and row axes. It disappears exactly when all three are covered, which
 * is when there is a cube directly above it and the two neighbours in front of
 * it are at least as tall as it is.
 */
export function hiddenCubes(heights: Heights): number {
  let count = 0;

  for (let row = 0; row < heights.length; row += 1) {
    for (let column = 0; column < heights[row].length; column += 1) {
      for (let level = 0; level < heights[row][column]; level += 1) {
        const above = heights[row][column] > level + 1;
        const inFrontAlongColumn = (heights[row][column + 1] ?? 0) > level;
        const inFrontAlongRow = (heights[row + 1]?.[column] ?? 0) > level;

        if (above && inFrontAlongColumn && inFrontAlongRow) count += 1;
      }
    }
  }
  return count;
}

/**
 * Every cube, furthest first.
 *
 * The renderer has no depth buffer — it draws parallelograms into a stack of
 * absolutely positioned views, so what is drawn last is what is on top. Sorting
 * by `column + row + level` is a correct back-to-front order for this
 * projection specifically, and `iso.test.ts` pins the reason why.
 */
export function drawOrder(heights: Heights): Cube[] {
  const cubes: Cube[] = [];

  for (let row = 0; row < heights.length; row += 1) {
    for (let column = 0; column < heights[row].length; column += 1) {
      for (let level = 0; level < heights[row][column]; level += 1) {
        cubes.push({ column, row, level });
      }
    }
  }

  return cubes.sort(
    (a, b) => a.column + a.row + a.level - (b.column + b.row + b.level),
  );
}

function randomHeights(random: () => number): number[][] {
  return Array.from({ length: BASE }, () =>
    Array.from({ length: BASE }, () => Math.floor(random() * (MAX_HEIGHT + 1))),
  );
}

function isWorthAsking(heights: Heights): boolean {
  const total = totalCubes(heights);

  return (
    total >= TOTAL_RANGE.min &&
    total <= TOTAL_RANGE.max &&
    heights.flat().filter((height) => height > 0).length >= MIN_COLUMNS &&
    hiddenCubes(heights) > 0
  );
}

/**
 * The wrong answers: near misses, never wild ones.
 *
 * They sit within three of the truth, which is the range a real miscount lands
 * in — one cube forgotten under the overhang, one column counted twice. Options
 * that were far out would be crossed off at a glance and the four-way choice
 * would quietly become a two-way one.
 */
function nearMisses(total: number, random: () => number): number[] {
  const pool = [-3, -2, -1, 1, 2, 3]
    .map((offset) => total + offset)
    .filter((value) => value > 0);

  const chosen: number[] = [];
  while (chosen.length < 3 && pool.length > 0) {
    chosen.push(...pool.splice(Math.floor(random() * pool.length), 1));
  }
  return chosen;
}

export function buildRound(random: () => number = Math.random): CubeRound {
  let heights = randomHeights(random);

  // Bounded rather than a `while (true)`: about a third of random 3×3 piles
  // qualify, so forty attempts is far more than it takes, and a run of bad luck
  // gives a slightly easier item rather than a hang. Never an unanswerable one
  // — the fallback below has cubes hidden in it by construction.
  for (let attempt = 0; attempt < 40 && !isWorthAsking(heights); attempt += 1) {
    heights = randomHeights(random);
  }
  if (!isWorthAsking(heights)) {
    heights = [
      [1, 1, 1],
      [1, 2, 2],
      [1, 2, 3],
    ];
  }

  const total = totalCubes(heights);
  const options = [total, ...nearMisses(total, random)];
  for (let i = options.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [options[i], options[j]] = [options[j], options[i]];
  }

  return {
    heights,
    total,
    hidden: hiddenCubes(heights),
    options,
    answerIndex: options.indexOf(total),
  };
}
