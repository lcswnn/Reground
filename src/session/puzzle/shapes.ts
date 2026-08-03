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
  {
    id: 'cross',
    cells: [
      [0, 1, 0],
      [1, 1, 1],
      [0, 1, 0],
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
 * A piece at random, never the one just placed. Repeats feel like the game is
 * stuck rather than like luck, and there is no scoring here for a bag system
 * to be fair to.
 */
export function nextShape(previousId: string | null): Shape {
  const pool = SHAPES.filter((shape) => shape.id !== previousId);
  return pool[Math.floor(Math.random() * pool.length)];
}
