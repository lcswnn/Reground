import { describe, expect, it } from 'vitest';

import {
  REACH,
  SPACING,
  reachedBy,
  sowField,
  within,
  type Bud,
} from '@/session/games/bloom/field';

/** Dice that walk a fixed list and repeat it. */
function dice(values: number[]): () => number {
  let index = 0;
  return () => {
    const value = values[index % values.length];
    index += 1;
    return value;
  };
}

/** The distance between two buds, in the same width units the game measures in. */
function gap(a: Bud, b: Bud, aspect: number): number {
  return Math.hypot(a.x - b.x, (a.y - b.y) * aspect);
}

describe('sowing a field', () => {
  const ASPECT = 1.6;

  it('keeps every bud on the board with room around the edges', () => {
    const buds = sowField(14, ASPECT);

    buds.forEach((bud) => {
      expect(bud.x).toBeGreaterThan(0);
      expect(bud.x).toBeLessThan(1);
      expect(bud.y).toBeGreaterThan(0);
      expect(bud.y).toBeLessThan(1);
    });
  });

  it('never sows two within touching distance of each other', () => {
    for (let field = 0; field < 20; field += 1) {
      const buds = sowField(14, ASPECT);

      buds.forEach((bud, index) => {
        buds.slice(index + 1).forEach((other) => {
          expect(gap(bud, other, ASPECT)).toBeGreaterThanOrEqual(SPACING);
        });
      });
    }
  });

  /** Spacing wins over the count, and nothing downstream is allowed to mind. */
  it('sows no more than asked and gives up rather than crowding', () => {
    expect(sowField(14, ASPECT).length).toBeLessThanOrEqual(14);
    expect(sowField(1, ASPECT)).toHaveLength(1);
    // Far more than can fit at this spacing, so the tries run out.
    expect(sowField(400, ASPECT).length).toBeLessThan(400);
  });

  it('gives every bud its own id, across fields as well as within one', () => {
    const first = sowField(14, ASPECT);
    const second = sowField(14, ASPECT);
    const ids = [...first, ...second].map((bud) => bud.id);

    expect(new Set(ids).size).toBe(ids.length);
  });

  it('sows the same field twice from the same dice', () => {
    const roll = () => dice([0.11, 0.83, 0.42, 0.27, 0.65, 0.09, 0.94, 0.36]);
    const places = (buds: Bud[]) => buds.map((bud) => `${bud.x},${bud.y}`);

    expect(places(sowField(6, ASPECT, roll()))).toEqual(places(sowField(6, ASPECT, roll())));
  });

  it('draws them at a range of sizes, none of them silly', () => {
    const sizes = sowField(14, ASPECT).map((bud) => bud.size);

    expect(Math.min(...sizes)).toBeGreaterThan(0.5);
    expect(Math.max(...sizes)).toBeLessThan(1.5);
  });
});

describe('what the petal touches', () => {
  const bud = { id: 1, x: 0.5, y: 0.5, size: 1 };

  it('opens what it passes over and leaves the rest', () => {
    expect(within(bud, 0.5, 0.5, REACH, 1)).toBe(true);
    expect(within(bud, 0.5 + REACH * 0.9, 0.5, REACH, 1)).toBe(true);
    expect(within(bud, 0.5 + REACH * 1.1, 0.5, REACH, 1)).toBe(false);
  });

  /**
   * The bug this exists to keep fixed: on a board half as wide as it is tall, a
   * vertical gap of `REACH` in fractions is twice the distance on screen that
   * the same horizontal gap is, and the petal used to open flowers it had
   * visibly missed.
   */
  it('measures a tall board in the shape it is actually drawn', () => {
    const aspect = 2;

    expect(within(bud, 0.5, 0.5 + REACH * 0.9, REACH, 1)).toBe(true);
    expect(within(bud, 0.5, 0.5 + REACH * 0.9, REACH, aspect)).toBe(false);
    expect(within(bud, 0.5, 0.5 + REACH * 0.4, REACH, aspect)).toBe(true);
  });

  it('reports every bud under the petal at once, and only those', () => {
    const buds: Bud[] = [
      { id: 1, x: 0.2, y: 0.2, size: 1 },
      { id: 2, x: 0.22, y: 0.2, size: 1 },
      { id: 3, x: 0.8, y: 0.8, size: 1 },
    ];

    expect(reachedBy(buds, 0.21, 0.2, 1)).toEqual([1, 2]);
    expect(reachedBy(buds, 0.5, 0.5, 1)).toEqual([]);
  });
});
