/**
 * The pieces.
 *
 * Deliberately NOT tetrominoes — not one of the seven is in this set, and that
 * is a design constraint rather than an accident. The mechanic borrows the idea
 * of rotating a shape into a gap; it is not a Tetris clone, and a familiar
 * piece set would drag the whole competitive frame in with it.
 *
 * The mix is trominoes and pentominoes: three cells or five, never four. All
 * six need real mental rotation to place, which is the point of the task.
 *
 * ## Rotation-forced
 *
 * Every shape here has more than one distinct orientation, and that is checked
 * in `shapes.test.ts` rather than left to whoever adds the next one. A piece
 * that looks the same after a quarter-turn — the plus sign this set used to
 * carry, or a square — can be placed without ever picturing it turned, and a
 * turn of the bag that hands you one is a turn where the game does nothing it
 * is here to do. See `distinctRotations`.
 */

export type ShapeCell = 0 | 1;
export type ShapeGrid = readonly (readonly ShapeCell[])[];

export interface Shape {
  id: string;
  cells: ShapeGrid;
}

export const SHAPES: readonly Shape[] = [
  {
    id: 'notch',
    cells: [
      [1, 1],
      [1, 1],
      [1, 0],
    ],
  },
  {
    id: 'arrow',
    cells: [
      [1, 1, 1],
      [0, 1, 0],
      [0, 1, 0],
    ],
  },
  {
    id: 'step',
    cells: [
      [1, 0, 0],
      [1, 1, 0],
      [0, 1, 1],
    ],
  },
  {
    id: 'corner',
    cells: [
      [1, 0],
      [1, 1],
    ],
  },
  {
    id: 'bar',
    cells: [[1, 1, 1]],
  },
  // Replaces the plus sign that used to sit here, which was the one piece in
  // the set that a quarter-turn left unchanged — see the note above. This one
  // is chiral, so its two orientations are genuinely different gaps.
  {
    id: 'zag',
    cells: [
      [1, 1, 0],
      [0, 1, 0],
      [0, 1, 1],
    ],
  },
];

/** 90° clockwise. Rotating four times returns the original grid. */
export function rotateClockwise(cells: ShapeGrid): ShapeGrid {
  const rows = cells.length;
  const columns = cells[0].length;

  return Array.from({ length: columns }, (_, row) =>
    Array.from({ length: rows }, (_, column) => cells[rows - 1 - column][row]),
  );
}

/**
 * How many of a shape's four quarter-turns look different from each other.
 *
 * One means the rotate button does nothing visible to it, which is the property
 * the set is not allowed to have — a piece like that is placed by looking
 * rather than by turning it in your head.
 */
export function distinctRotations(cells: ShapeGrid): number {
  const seen = new Set<string>();
  let turned = cells;

  for (let i = 0; i < 4; i += 1) {
    seen.add(JSON.stringify(turned));
    turned = rotateClockwise(turned);
  }
  return seen.size;
}

/**
 * A piece at random, never the one just placed. Repeats feel like the game is
 * stuck rather than like luck, and there is no scoring here for a bag system
 * to be fair to.
 */
export function nextShape(previousId: string | null): Shape {
  const pool = SHAPES.filter((shape) => shape.id !== previousId);
  return pool[Math.floor(Math.random() * pool.length)];
}
