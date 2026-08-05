import { describe, expect, it } from 'vitest';

import {
  cubeFaces,
  faceBounds,
  geometry,
  project,
  shear,
  type Shear,
  type Vec2,
} from '@/session/games/cubes/iso';

const geo = geometry(40);
const radians = (degrees: number) => (degrees * Math.PI) / 180;

/**
 * The transform chain multiplied back out by hand, in the order React Native
 * applies it: scale, then skew, then rotate. If `shear` and this disagree, the
 * cubes come out as diamonds and nobody can say why.
 */
function applyShear(chain: Shear, square: number, point: Vec2): Vec2 {
  const scaledX = point.x * chain.scaleX;
  const scaledY = point.y * chain.scaleY;

  const skewedX = scaledX + Math.tan(radians(chain.skewX)) * scaledY;

  const cos = Math.cos(radians(chain.rotate));
  const sin = Math.sin(radians(chain.rotate));
  return { x: cos * skewedX - sin * scaledY, y: sin * skewedX + cos * scaledY };
}

const near = (actual: Vec2, expected: Vec2) => {
  expect(actual.x).toBeCloseTo(expected.x, 6);
  expect(actual.y).toBeCloseTo(expected.y, 6);
};

describe('shearing a square into a parallelogram', () => {
  const cases: readonly (readonly [string, Vec2, Vec2])[] = [
    ['the top of a cube', { x: 34.6, y: 20 }, { x: -34.6, y: 20 }],
    ['a face hanging off it', { x: -34.6, y: 20 }, { x: 0, y: 40 }],
    ['an axis-aligned square', { x: 25, y: 0 }, { x: 0, y: 25 }],
    ['something leaning the other way', { x: 10, y: -30 }, { x: 20, y: 5 }],
  ];

  it.each(cases)('lands on %s', (_, u, v) => {
    const square = 100;
    const chain = shear(u, v, square);

    near(applyShear(chain, square, { x: square, y: 0 }), u);
    near(applyShear(chain, square, { x: 0, y: square }), v);
    // The origin corner does not move, which is what the transform origin at
    // the top-left of the box is for.
    near(applyShear(chain, square, { x: 0, y: 0 }), { x: 0, y: 0 });
  });

  it('gives the classic isometric top face', () => {
    const chain = shear({ x: geo.halfW, y: geo.halfH }, { x: -geo.halfW, y: geo.halfH }, 40);

    expect(chain.rotate).toBeCloseTo(30, 6);
    expect(chain.skewX).toBeCloseTo(-30, 6);
    expect(chain.scaleX).toBeCloseTo(1, 6);
    expect(chain.scaleY).toBeCloseTo(Math.sqrt(3) / 2, 6);
  });
});

describe('the projection', () => {
  /**
   * The property the draw order depends on: stepping one along every axis at
   * once lands on the same pixel, which is what it means for the camera to be
   * looking down (1, 1, 1) — and therefore what makes sorting by
   * `column + row + level` a correct back-to-front order.
   */
  it('looks along the diagonal', () => {
    for (const [column, row, level] of [
      [0, 0, 0],
      [2, 1, 3],
      [1, 4, 2],
    ]) {
      near(project(column, row, level, geo), project(column + 1, row + 1, level + 1, geo));
    }
  });

  it('puts the axes 120° apart and foreshortens them equally', () => {
    const origin = project(0, 0, 0, geo);
    const axes = [
      project(1, 0, 0, geo),
      project(0, 1, 0, geo),
      project(0, 0, 1, geo),
    ].map((point) => ({ x: point.x - origin.x, y: point.y - origin.y }));

    const lengths = axes.map((axis) => Math.hypot(axis.x, axis.y));
    expect(lengths[1]).toBeCloseTo(lengths[0], 6);
    expect(lengths[2]).toBeCloseTo(lengths[0], 6);

    const angle = (a: Vec2, b: Vec2) =>
      (Math.acos((a.x * b.x + a.y * b.y) / (Math.hypot(a.x, a.y) * Math.hypot(b.x, b.y))) *
        180) /
      Math.PI;
    expect(angle(axes[0], axes[1])).toBeCloseTo(120, 4);
    expect(angle(axes[0], axes[2])).toBeCloseTo(120, 4);
  });
});

describe('a cube', () => {
  const faces = cubeFaces(0, 0, 0, geo);

  it('shows three faces and no more', () => {
    expect(faces.map((face) => face.kind)).toEqual(['top', 'right', 'left']);
  });

  it('draws its top face on the four corners the projection says', () => {
    const top = faces[0];
    near(top.origin, project(0, 0, 1, geo));
    near(
      { x: top.origin.x + top.u.x, y: top.origin.y + top.u.y },
      project(1, 0, 1, geo),
    );
    near(
      { x: top.origin.x + top.v.x, y: top.origin.y + top.v.y },
      project(0, 1, 1, geo),
    );
  });

  it('hangs its side faces off the top face, reaching one level down', () => {
    for (const face of faces.slice(1)) {
      expect(face.v).toEqual({ x: 0, y: geo.cubeH });
    }
    // Both side faces start at a corner of the top face.
    const topCorners = [
      project(1, 0, 1, geo),
      project(0, 1, 1, geo),
    ];
    near(faces[1].origin, topCorners[0]);
    near(faces[2].origin, topCorners[1]);
  });

  it('measures out to one cube', () => {
    const box = faceBounds(faces);
    expect(box.maxX - box.minX).toBeCloseTo(geo.halfW * 2, 6);
    expect(box.maxY - box.minY).toBeCloseTo(geo.halfH * 2 + geo.cubeH, 6);
  });
});
