/**
 * Drawing a cube on a phone with no drawing library.
 *
 * This app has no SVG renderer and no canvas — every shape in it so far has
 * been a rectangle or a circle, because a `View` is a rectangle and a border
 * radius is the only curve there is. A cube in three-quarter view is three
 * parallelograms, which is not a shape a `View` comes in.
 *
 * It is, though, a shape a *square* comes in once it has been sheared, and
 * React Native will apply an arbitrary `rotate`/`skewX`/`scale` chain to any
 * view. So: `shear` solves that chain from the two edge vectors of the
 * parallelogram you actually want, and the rest of this file works out what
 * those vectors are for each face of a cube in an isometric projection. Pure
 * geometry — no React, and no `Platform` — so the awkward half of it can be
 * checked in a test rather than by squinting at a simulator.
 *
 * ## The projection
 *
 * A true isometric one: the three axes come out 120° apart and none of them is
 * foreshortened more than the others.
 *
 *   screen x = (column - row) * halfW
 *   screen y = (column + row) * halfH - level * cubeH
 *
 * with `halfW = (√3/2)·s`, `halfH = s/2` and `cubeH = s` for a cube of edge `s`.
 * Those three are not free parameters — they are what makes the view direction
 * exactly (1, 1, 1), which in turn is what makes `column + row + level` a
 * correct back-to-front draw order. Change one and the stack draws inside out.
 */

export interface Vec2 {
  x: number;
  y: number;
}

export interface Geometry {
  /** Half the width of a cube's top face. */
  halfW: number;
  /** Half its height on screen. */
  halfH: number;
  /** How far up the screen one level is. */
  cubeH: number;
}

/** Which side of the cube a face is: the top, or one of the two facing you. */
export type FaceKind = 'top' | 'right' | 'left';

export interface Face {
  kind: FaceKind;
  /** The corner the parallelogram is drawn from. */
  origin: Vec2;
  /** Its two edges, in screen space. */
  u: Vec2;
  v: Vec2;
}

/** The transform chain, in the order React Native has to be given it. */
export interface Shear {
  /** Degrees. */
  rotate: number;
  /** Degrees. */
  skewX: number;
  scaleX: number;
  scaleY: number;
}

export function geometry(edge: number): Geometry {
  return { halfW: (Math.sqrt(3) / 2) * edge, halfH: edge / 2, cubeH: edge };
}

/** A lattice corner, in screen space. */
export function project(
  column: number,
  row: number,
  level: number,
  geo: Geometry,
): Vec2 {
  return {
    x: (column - row) * geo.halfW,
    y: (column + row) * geo.halfH - level * geo.cubeH,
  };
}

const add = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x + b.x, y: a.y + b.y });

/**
 * The three faces of one cube that can be seen from here.
 *
 * The other three are always hidden by the cube itself, so they are never drawn
 * — which is what makes the painter's-algorithm pass at the call site enough on
 * its own, with no depth buffer and no per-face sorting.
 */
export function cubeFaces(
  column: number,
  row: number,
  level: number,
  geo: Geometry,
): Face[] {
  // The top corner of the cube's top face, and the two edges away from it: one
  // down-right along the column axis, one down-left along the row axis.
  const top = project(column, row, level + 1, geo);
  const alongColumn: Vec2 = { x: geo.halfW, y: geo.halfH };
  const alongRow: Vec2 = { x: -geo.halfW, y: geo.halfH };
  const down: Vec2 = { x: 0, y: geo.cubeH };

  return [
    { kind: 'top', origin: top, u: alongColumn, v: alongRow },
    // Hangs off the lower-right edge of the top face.
    { kind: 'right', origin: add(top, alongColumn), u: alongRow, v: down },
    // And off the lower-left one.
    { kind: 'left', origin: add(top, alongRow), u: alongColumn, v: down },
  ];
}

/**
 * The transform that turns a `square`-sided box into the parallelogram with
 * edges `u` and `v`, given a transform origin at the box's top-left corner.
 *
 * React Native composes the list left to right, so the matrix being solved is
 * `R(θ)·K(φ)·S(sx, sy)`. Its first column is `sx·(cos θ, sin θ)`, which has to
 * be `u` — that fixes the rotation and the x scale outright. Rotating `v` back
 * by the same θ leaves `sy·(tan φ, 1)`, which fixes the other two. There is
 * exactly one answer, and `iso.test.ts` multiplies the chain back out to check
 * it lands on the parallelogram it was asked for.
 */
export function shear(u: Vec2, v: Vec2, square: number): Shear {
  const theta = Math.atan2(u.y, u.x);
  const cos = Math.cos(theta);
  const sin = Math.sin(theta);

  // `v` seen from the rotated frame.
  const vx = v.x * cos + v.y * sin;
  const vy = -v.x * sin + v.y * cos;

  const scaleY = vy / square;
  return {
    rotate: (theta * 180) / Math.PI,
    // `atan` rather than a raw ratio: the transform wants the angle, and a
    // degenerate parallelogram (vy = 0) then comes out as a right angle instead
    // of an infinity.
    skewX: (Math.atan2(vx, vy) * 180) / Math.PI,
    scaleX: Math.hypot(u.x, u.y) / square,
    scaleY,
  };
}

/** The box a set of faces fits in, so a stack can be centred in its space. */
export function faceBounds(faces: readonly Face[]): {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
} {
  const xs: number[] = [];
  const ys: number[] = [];

  for (const face of faces) {
    for (const corner of [
      face.origin,
      add(face.origin, face.u),
      add(face.origin, face.v),
      add(add(face.origin, face.u), face.v),
    ]) {
      xs.push(corner.x);
      ys.push(corner.y);
    }
  }

  return {
    minX: Math.min(...xs),
    minY: Math.min(...ys),
    maxX: Math.max(...xs),
    maxY: Math.max(...ys),
  };
}
