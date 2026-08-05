import { describe, expect, it } from 'vitest';

import {
  NETS,
  buildRound,
  flipNet,
  foldNet,
  isCubeNet,
  oppositeFace,
  parseNet,
  toGrid,
  turnNet,
  type Vec,
} from '@/session/games/net-fold/nets';

const nets = NETS.map((rows, index) => [index, parseNet(rows)] as const);

describe('the nets on offer', () => {
  /**
   * The check the whole game rests on. A hexomino that is not a cube net folds
   * two faces onto the same side of the cube, and "which face is opposite this
   * one?" then has either two answers or none — an item that cannot be answered
   * correctly, dressed up as one that can.
   */
  it.each(nets)('net %i folds into a cube', (_, cells) => {
    expect(isCubeNet(cells)).toBe(true);
  });

  it('rejects a hexomino that is not a net, so the check above means something', () => {
    // The 2×3 block: the classic one that looks foldable and is not.
    expect(isCubeNet(parseNet(['###', '###']))).toBe(false);
    // Six squares in a line — the fourth lands back on the first.
    expect(isCubeNet(parseNet(['######']))).toBe(false);
    // Not connected.
    expect(isCubeNet(parseNet(['###.', '...#', '.###']))).toBe(false);
    // Not six faces.
    expect(isCubeNet(parseNet(['####']))).toBe(false);
  });

  it.each(nets)('net %i still folds after being turned and flipped', (_, cells) => {
    let turned = cells;
    for (let i = 0; i < 4; i += 1) {
      turned = turnNet(turned);
      expect(isCubeNet(turned)).toBe(true);
      expect(isCubeNet(flipNet(turned))).toBe(true);
    }
  });

  it('comes back to where it started after four turns', () => {
    for (const [, cells] of nets) {
      let turned = cells;
      for (let i = 0; i < 4; i += 1) turned = turnNet(turned);
      expect(new Set(turned.map((cell) => `${cell.row},${cell.column}`))).toEqual(
        new Set(cells.map((cell) => `${cell.row},${cell.column}`)),
      );
    }
  });
});

describe('opposite faces', () => {
  it.each(nets)('net %i pairs every face with exactly one other', (_, cells) => {
    const partners = cells.map((_cell, index) => oppositeFace(cells, index));

    expect(new Set(partners).size).toBe(6);
    partners.forEach((partner, index) => {
      // Never itself, and the relationship runs both ways.
      expect(partner).not.toBe(index);
      expect(partners[partner as number]).toBe(index);
    });
  });

  it.each(nets)('net %i never calls two neighbours opposite', (_, cells) => {
    cells.forEach((cell, index) => {
      const partner = cells[oppositeFace(cells, index) as number];
      const distance =
        Math.abs(cell.row - partner.row) + Math.abs(cell.column - partner.column);
      // Faces that share an edge on the paper share an edge on the cube, and
      // two faces that share an edge are never opposite each other.
      expect(distance).toBeGreaterThan(1);
    });
  });

  it('reads the cross net the way a person folding it would', () => {
    // Centre face, its four neighbours, and the flap hanging off the bottom.
    const cells = parseNet(['.#..', '####', '.#..']);
    const at = (row: number, column: number) =>
      cells.findIndex((cell) => cell.row === row && cell.column === column);

    // The arm of the row two along from another is across the cube from it.
    expect(oppositeFace(cells, at(1, 0))).toBe(at(1, 2));
    expect(oppositeFace(cells, at(1, 1))).toBe(at(1, 3));
    // The square above the row and the square below it.
    expect(oppositeFace(cells, at(0, 1))).toBe(at(2, 1));
  });

  it('gives every face a different way to face', () => {
    for (const [, cells] of nets) {
      const normals = foldNet(cells) as Vec[];
      expect(new Set(normals.map((normal) => normal.join(','))).size).toBe(6);
      for (const normal of normals) {
        // Unit vectors along an axis, nothing in between.
        expect(normal.map(Math.abs).sort().join('')).toBe('001');
      }
    }
  });
});

describe('a round', () => {
  const rounds = Array.from({ length: 200 }, () => buildRound());

  it('asks about a face that is on the net, and answers with another one', () => {
    for (const round of rounds) {
      const pips = round.grid.flat().filter((pip): pip is number => pip !== null);

      expect(pips).toHaveLength(6);
      expect(new Set(pips).size).toBe(6);
      expect(pips).toContain(round.marked);
      expect(pips).toContain(round.answer);
      expect(round.answer).not.toBe(round.marked);
    }
  });

  it('offers four answers, all different, one of them right', () => {
    for (const round of rounds) {
      expect(round.options).toHaveLength(4);
      expect(new Set(round.options).size).toBe(4);
      expect(round.options).toContain(round.answer);
      // The marked face is never on the list: a face is not opposite itself,
      // and offering it is a free elimination.
      expect(round.options).not.toContain(round.marked);
    }
  });

  it('does not settle into one net, one orientation or one answer slot', () => {
    const shapes = new Set(rounds.map((round) => JSON.stringify(round.grid.map((row) => row.map((pip) => pip !== null)))));
    const slots = new Set(rounds.map((round) => round.options.indexOf(round.answer)));

    expect(shapes.size).toBeGreaterThan(8);
    expect(slots.size).toBe(4);
  });

  it('takes its randomness from the caller', () => {
    const fixed = () => 0.3;
    expect(buildRound(fixed)).toEqual(buildRound(fixed));
  });
});

describe('laying the net back out', () => {
  it('puts each pip count where its face was', () => {
    const cells = parseNet(['##.', '.##']);
    expect(toGrid(cells, [1, 2, 3, 4])).toEqual([
      [1, 2, null],
      [null, 3, 4],
    ]);
  });
});
