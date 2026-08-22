import { describe, expect, it } from 'vitest';

import {
  bounceOff,
  guidePoint,
  GRAVITY,
  launchSpeed,
  layField,
  LAUNCH_Y,
  planField,
  sidewaysReach,
  type Peg,
} from '@/session/games/pegs/playfield';

/**
 * A phone-shaped board, for the tests that only need *a* board.
 *
 * The awkward shapes are exercised on purpose in the reachability tests below —
 * this one is the ordinary case.
 */
const BOARD = { width: 360, height: 560 };

/**
 * The range of boards this game is ever handed, from a small phone in a short
 * content area to a tablet column, with the deliberately hostile corners of that
 * range included: wide-and-short is the shape the reachability bug lived in.
 */
const BOARDS = [280, 320, 360, 390, 430, 500].flatMap((width) =>
  [340, 400, 480, 560, 640, 760].map((height) => ({ width, height })),
);

/** Dice that walk a fixed list and repeat it. */
function dice(values: number[]): () => number {
  let index = 0;
  return () => {
    const value = values[index % values.length];
    index += 1;
    return value;
  };
}

/** Every pair of pegs, for the questions that are about the field as a whole. */
function pairs(pegs: readonly Peg[]): [Peg, Peg][] {
  return pegs.flatMap((peg, index) => pegs.slice(index + 1).map((other): [Peg, Peg] => [peg, other]));
}

describe('laying a field', () => {
  it('keeps every peg on the board and out of the corners', () => {
    layField(BOARD).forEach((peg) => {
      expect(peg.x).toBeGreaterThan(0.05);
      expect(peg.x).toBeLessThan(0.95);
      // Clear of the launcher at the top and the floor at the bottom.
      expect(peg.y).toBeGreaterThan(0.2);
      expect(peg.y).toBeLessThan(0.85);
    });
  });

  it('lays the same field twice from the same dice', () => {
    const places = (pegs: Peg[]) => pegs.map((peg) => `${peg.x},${peg.y}`);
    const roll = () => dice([0.2, 0.9, 0.45, 0.05, 0.7, 0.33]);

    expect(places(layField(BOARD, roll()))).toEqual(
      places(layField(BOARD, roll())),
    );
  });

  it('gives every peg its own id, across fields as well as within one', () => {
    const ids = [...layField(BOARD), ...layField(BOARD)].map((peg) => peg.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('lays a field worth several balls', () => {
    expect(layField(BOARD).length).toBeGreaterThan(20);
  });

  /**
   * The jitter is bounded by the spacing, so however the dice fall no peg can
   * be pushed into its neighbour. A field with two pegs on the same point has a
   * ball bouncing off both in one step and leaving in a direction neither of
   * them would have sent it.
   */
  it('never stands two pegs on top of one another, whatever the dice', () => {
    for (const roll of [() => 0, () => 0.999, Math.random, dice([0, 1, 0.5])]) {
      pairs(layField(BOARD, roll)).forEach(([peg, other]) => {
        expect(Math.hypot(peg.x - other.x, peg.y - other.y)).toBeGreaterThan(0.02);
      });
    }
  });

  /**
   * The rows are staggered so that there is no clear column through the field.
   * If every peg shared an x with a peg two rows down, a ball could fall between
   * two columns all the way to the floor.
   */
  it('offsets every other row, so nothing has a straight way through', () => {
    const rows = new Map<string, number[]>();
    layField(BOARD, () => 0.5).forEach((peg) => {
      const row = rows.get(peg.y.toFixed(4)) ?? [];
      row.push(peg.x);
      rows.set(peg.y.toFixed(4), row);
    });

    const counts = [...rows.values()].map((row) => row.length);
    expect(new Set(counts).size).toBe(2);
    expect(Math.max(...counts) - Math.min(...counts)).toBe(1);
  });
});

/**
 * The guard rail: no peg the game lays may be outside the ball's reach.
 *
 * This is the bug these tests exist for. The field is laid in fractions of the
 * board and the ball is flown in points, so a peg's distance from the launcher
 * scales with the board's width while the time the ball has to cover it scales
 * with the board's height. On a board that is wide for its height the corners of
 * the top row fell outside the widest shot the game allows — not a hard shot, no
 * shot at all — and it had twice been papered over by opening the aim and the
 * launch speed, which cannot work because there is always a wider board.
 *
 * `reachableSide` fixes it from the other end, and this is what holds it fixed.
 */
describe('every peg within reach', () => {
  /** The reach test itself: is this peg inside the envelope, on this board? */
  const inReach = (peg: Peg, board: { width: number; height: number }) => {
    const across = Math.abs(peg.x - 0.5) * board.width;
    const depth = peg.y * board.height - LAUNCH_Y;
    return across <= sidewaysReach(board.height, depth);
  };

  it.each(BOARDS)('leaves nothing unreachable on %o', (board) => {
    // Fixed extreme dice as well as the ordinary ones: the clamp has to hold for
    // the jitter that pushes the outermost peg as far out as it can go, which is
    // the case that actually broke.
    for (const roll of [Math.random, () => 0, () => 0.999, () => 0.5]) {
      layField(board, roll).forEach((peg) => {
        expect(inReach(peg, board), `${board.width}x${board.height} ${peg.x},${peg.y}`).toBe(true);
      });
    }
  });

  /**
   * A tall board never needed a guard rail, so it must come out exactly as it
   * always did: full width, all seven columns, top row at three tenths.
   */
  it('leaves a tall board exactly as it was', () => {
    expect(planField(320, 760)).toEqual({ top: 0.3, side: 0.12, across: 7 });
  });

  /**
   * The lever order is the design, so it is worth a test of its own. A board
   * that needs help should be *lowered* first and keep its width and its
   * columns — narrowing is what made the field look like a huddle, and it is
   * only allowed once lowering has run out.
   */
  it('lowers a phone-shaped board rather than narrowing it', () => {
    const plan = planField(342, 466);

    expect(plan.top).toBeGreaterThan(0.3);
    expect(plan.side).toBeCloseTo(0.12, 5);
    expect(plan.across).toBe(7);
  });

  /**
   * Spacing is the thing the player actually sees, and it is what the column
   * lever exists to protect: where reach will not allow seven columns properly
   * spread, the answer is six, never seven squeezed together.
   *
   * The promise is conditional, and honestly so. A field already down to its
   * five-column floor has nothing left to give — on a board narrower than any
   * real phone the columns do close up a little, and the alternative would be a
   * row of four, which is not a field. Everywhere above that floor, `MIN_GAP`
   * holds.
   */
  it('keeps the columns properly spread, or drops one rather than crowd them', () => {
    for (const board of BOARDS) {
      const { side, across } = planField(board.width, board.height);
      const gap = ((1 - side * 2) / (across - 1)) * board.width;
      const where = `${board.width}x${board.height}`;

      // Never more than a shade tighter than the board's own natural spacing,
      // which is what an unconstrained field would have given it.
      const natural = ((1 - 0.12 * 2) / 6) * board.width;
      if (across > 5) expect(gap, where).toBeGreaterThanOrEqual(natural * 0.92);
      // And never anywhere near touching, whatever else has had to give: pegs
      // are 18 points across, and a ball meeting two in one step leaves in a
      // direction neither would have sent it.
      expect(gap, where).toBeGreaterThan(30);
    }
  });

  /** Whatever it does to the field, there has to be a game left in it. */
  it('always lays a field worth several balls', () => {
    for (const board of BOARDS) {
      expect(layField(board).length, `${board.width}x${board.height}`)
        .toBeGreaterThan(20);
    }
  });
});

describe('a ball meeting a peg', () => {
  const PEG = { x: 100, y: 100 };
  const CONTACT = 12;

  it('says nothing when they are not touching', () => {
    expect(bounceOff(100, 60, 0, 200, PEG.x, PEG.y, CONTACT, 0.9)).toBeNull();
    // Exactly touching is not touching: the ball is on the surface, not in it.
    expect(bounceOff(100, 100 - CONTACT, 0, 200, PEG.x, PEG.y, CONTACT, 0.9)).toBeNull();
  });

  it('sends a ball dropped straight onto it straight back up, a little slower', () => {
    const hit = bounceOff(100, 92, 0, 200, PEG.x, PEG.y, CONTACT, 0.9);

    expect(hit).not.toBeNull();
    expect(hit!.vx).toBeCloseTo(0);
    expect(hit!.vy).toBeCloseTo(-180);
  });

  it('leaves the ball exactly touching, never inside', () => {
    const hit = bounceOff(103, 96, 40, 260, PEG.x, PEG.y, CONTACT, 0.9)!;

    expect(Math.hypot(hit.x - PEG.x, hit.y - PEG.y)).toBeCloseTo(CONTACT);
  });

  /**
   * The half of the velocity running along the surface is left alone. Damping
   * it as well would be friction rather than a bounce, and a ball that loses
   * speed sideways every time it grazes something stops rattling.
   */
  it('keeps the sideways half of a glancing hit', () => {
    const hit = bounceOff(108, 96, 150, 150, PEG.x, PEG.y, CONTACT, 0.9)!;
    const before = Math.hypot(150, 150);

    expect(Math.hypot(hit.vx, hit.vy)).toBeGreaterThan(before * 0.9);
    expect(Math.hypot(hit.vx, hit.vy)).toBeLessThan(before);
  });

  it('never gives a ball more speed than it arrived with', () => {
    for (let angle = 0; angle < Math.PI * 2; angle += 0.2) {
      const x = PEG.x + Math.cos(angle) * (CONTACT - 2);
      const y = PEG.y + Math.sin(angle) * (CONTACT - 2);
      const hit = bounceOff(x, y, 90, 240, PEG.x, PEG.y, CONTACT, 0.9)!;

      expect(Math.hypot(hit.vx, hit.vy)).toBeLessThanOrEqual(Math.hypot(90, 240) + 1e-9);
    }
  });

  /**
   * A ball that has come to rest exactly on a peg's centre has no line between
   * the centres to bounce along. It goes back the way it came rather than
   * dividing by zero and leaving the board at NaN, which is unrecoverable —
   * every later comparison against it is false and the ball never lands.
   */
  it('handles a ball sitting exactly on the centre', () => {
    const hit = bounceOff(PEG.x, PEG.y, 0, 200, PEG.x, PEG.y, CONTACT, 0.9)!;

    expect(Number.isFinite(hit.x)).toBe(true);
    expect(Number.isFinite(hit.y)).toBe(true);
    expect(hit.vy).toBeLessThan(0);
  });
});

/**
 * The ball's flight as `peg-drop.tsx` actually runs it: semi-implicit Euler,
 * one substep at a time, from the launcher and along the aim. A copy of the
 * frame loop's free-flight arithmetic with the collisions left out — which is
 * the only part of it the guide claims to predict.
 */
function fly(aim: number, speed: number, steps: number, step: number) {
  let x = 0;
  let y = 0;
  let vx = Math.sin(aim) * speed;
  let vy = Math.cos(aim) * speed;

  for (let i = 0; i < steps; i += 1) {
    vy += GRAVITY * step;
    x += vx * step;
    y += vy * step;
  }

  return { x, y };
}

describe('the aim guide', () => {
  /**
   * The whole point of the thing: a dot on the guide is where the ball will be,
   * not where it would be if nothing pulled it down. The guide used to be a
   * straight line rotated to the aim, and the ball left it immediately.
   */
  it('lands on the flight the ball actually takes', () => {
    const speed = launchSpeed(520);
    const step = 1 / 240;

    for (const aim of [-1.15, -0.6, 0, 0.35, 1.15]) {
      // Whole steps, so the two are compared at the same instant rather than a
      // fraction of a frame apart — the distance is read off the flight rather
      // than picked, which is what `guidePoint` is parameterised by anyway.
      for (const steps of [8, 30, 70]) {
        const flown = fly(aim, speed, steps, step);
        const dot = guidePoint(aim, speed, speed * steps * step);

        // Across is exact: gravity has nothing to add to it.
        expect(dot.x).toBeCloseTo(flown.x, 6);
        // Down carries the integrator's own drift — stepping gravity before the
        // position drops the ball half a step further each time — and a point
        // of it is a quarter of a dot.
        expect(Math.abs(dot.y - flown.y)).toBeLessThan(1);
      }
    }
  });

  it('leaves along the aim and falls away from it', () => {
    const speed = launchSpeed(500);

    // The first dot sits within a whisker of the straight line — the fall has
    // had no time to happen yet — and the far one is well under it.
    const near = guidePoint(0.5, speed, 11);
    const far = guidePoint(0.5, speed, 96);

    expect(near.y - Math.cos(0.5) * 11).toBeLessThan(1);
    expect(far.y - Math.cos(0.5) * 96).toBeGreaterThan(10);
    // Across the board it is exactly where the aim points, at every distance:
    // gravity has no sideways component to add.
    expect(far.x).toBeCloseTo(Math.sin(0.5) * 96, 6);
  });

  it('aims right for a positive angle and left for a negative one', () => {
    const speed = launchSpeed(500);

    expect(guidePoint(0.4, speed, 60).x).toBeGreaterThan(0);
    expect(guidePoint(-0.4, speed, 60).x).toBeLessThan(0);
    expect(guidePoint(0, speed, 60).x).toBe(0);
  });

  it('collapses onto the launcher before the board has been measured', () => {
    expect(guidePoint(0.4, launchSpeed(0), 60)).toEqual({ x: 0, y: 0 });
  });
});
