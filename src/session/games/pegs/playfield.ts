/**
 * Knock the Pegs Out, as data: where the pegs stand, and what a ball does when
 * it reaches one. Pure — no React, no timers, no theme.
 *
 * The game is the one everybody has played twice: aim from the top, let go, and
 * watch a ball rattle down through a field of pegs, taking out whatever it
 * touches. It is on the shelf for the same reason the match puzzle is — the
 * East Carolina work found brief sessions with casual arcade puzzles moving
 * anxiety and mood measurably — and it claims no more than that. See `GameKind`
 * in `games/catalog.ts` for why nothing on this shelf borrows the visuospatial
 * mechanism.
 *
 * ## Why there are no bricks and no paddle
 *
 * Because the paddle game is one card above it. `bounce` is already a ball, a
 * paddle and a hand that has to follow something, and a second game asking for
 * the same hand movement is a second copy of the same offer. What this one is
 * for is the other half of the genre: you make one decision, let go, and then
 * have nothing to do but watch — which is a different and much quieter thing to
 * be doing with three minutes.
 *
 * ## What is deliberately missing
 *
 * No score, no points per peg, no orange pegs to be chasing, no ball count, no
 * "last ball", and nothing that can be missed. A ball that leaves the bottom
 * having hit nothing costs a tap to send another one. Clearing a field is not a
 * win, it just means another field arrives.
 *
 * ## Two coordinate systems, on purpose
 *
 * The layout is in fractions of the board, for the reasons given at the top of
 * `bloom/field.ts` — a field survives a rotation. The physics is in points,
 * because the physics is about how fast something falls on a screen, which is a
 * question about pixels rather than about fractions. `peg-drop.tsx` converts
 * once, at layout, and nothing else in the game mixes the two.
 */

export interface Peg {
  readonly id: number;
  /** Across the board, 0 to 1. */
  readonly x: number;
  /** Down the board, 0 to 1. */
  readonly y: number;
}

/** Where a ball is and where it is going, in points and points per second. */
export interface Motion {
  readonly x: number;
  readonly y: number;
  readonly vx: number;
  readonly vy: number;
}

/** Rows of pegs, and how many sit in the wider of the two staggered rows. */
const ROWS = 5;
const ACROSS = 7;

/** The band of the board the field occupies, top and bottom, as fractions. */
const TOP = 0.3;
const BOTTOM = 0.78;
/** How far in from the side walls the outermost peg stands. */
const SIDE = 0.12;

/**
 * How far a peg is nudged off its lattice point, as a fraction of the spacing.
 *
 * Not decoration. A perfect lattice is symmetrical, and a ball dropped down the
 * middle of a symmetrical field falls through it in a straight line and comes
 * out having hit two things. The jitter is what makes every drop diverge.
 */
const JITTER = 0.3;

/** Ids only have to outlive the field they belong to. */
let nextId = 0;

/**
 * A field of pegs: staggered rows, each one nudged off its lattice point.
 *
 * Staggered rather than square because a square grid has clear columns running
 * all the way down it, and a ball that finds one falls to the bottom untouched.
 * Offsetting every other row by half a space means there is no straight way
 * through, whatever angle it is entered at.
 */
export function layField(random: () => number = Math.random): Peg[] {
  const pegs: Peg[] = [];
  const span = 1 - SIDE * 2;
  const gap = span / (ACROSS - 1);
  const drop = (BOTTOM - TOP) / (ROWS - 1);

  for (let row = 0; row < ROWS; row += 1) {
    // The short rows sit between the long ones, which is what makes the field
    // staggered rather than square.
    const short = row % 2 === 1;
    const count = short ? ACROSS - 1 : ACROSS;
    const start = SIDE + (short ? gap / 2 : 0);

    for (let index = 0; index < count; index += 1) {
      nextId += 1;
      pegs.push({
        id: nextId,
        x: start + index * gap + (random() - 0.5) * gap * JITTER,
        y: TOP + row * drop + (random() - 0.5) * drop * JITTER,
      });
    }
  }

  return pegs;
}

/**
 * A ball meeting a peg: where it ends up, and where it goes next. `null` when
 * the two are not touching, which is the answer nearly every time it is asked.
 *
 * Carries the `'worklet'` directive because it is called from the frame loop on
 * the UI thread — several times per peg per frame — and the directive is an
 * inert string off the device, so the test suite exercises the same function
 * the game runs rather than a copy of it. Same arrangement as `within` in
 * `bloom/field.ts`.
 *
 * The reflection is the standard one, split into the part of the velocity along
 * the line between the centres and the part across it: the first is reversed and
 * damped by `restitution`, the second is left alone. Damping the whole vector
 * instead would be friction as well as a bounce, and a ball that loses speed
 * along the surface it grazed stops rattling and starts trickling.
 *
 * The ball is also pushed back out to exactly touching before it is turned
 * around. Without that it can end a step inside the peg, be turned around again
 * on the next one, and sit there buzzing.
 */
export function bounceOff(
  x: number,
  y: number,
  vx: number,
  vy: number,
  pegX: number,
  pegY: number,
  contact: number,
  restitution: number,
): Motion | null {
  'worklet';
  const dx = x - pegX;
  const dy = y - pegY;
  const square = dx * dx + dy * dy;
  if (square >= contact * contact) return null;

  // Dead centre, which a ball at rest on a peg can reach. Any direction is as
  // correct as any other, so it goes back the way it came.
  const distance = Math.sqrt(square);
  const nx = distance === 0 ? 0 : dx / distance;
  const ny = distance === 0 ? -1 : dy / distance;

  const along = vx * nx + vy * ny;
  return {
    x: pegX + nx * contact,
    y: pegY + ny * contact,
    vx: vx - along * nx * (1 + restitution),
    vy: vy - along * ny * (1 + restitution),
  };
}

/**
 * Downward acceleration, in points per second squared, and the launch speed as
 * a multiple of `sqrt(gravity × board height)`.
 *
 * The speed is expressed against the board rather than fixed so a drop takes
 * about as long on a small phone as on a tablet — the same trick, and the same
 * reason, as `APEX_RATIO` in the paddle game. Slow enough that the ball is
 * followable and fast enough that it reaches the far side of the field if
 * aimed there.
 *
 * Both live here rather than in the component because two things now have to
 * agree about them: the ball, which is integrated frame by frame, and the guide
 * the player aims with, which is the same flight solved in closed form. A guide
 * drawn from one gravity and a ball falling under another is a game that does
 * not go where it is pointed.
 */
export const GRAVITY = 1100;
export const LAUNCH_RATIO = 0.42;

/** How fast a ball leaves the launcher on a board this tall. */
export function launchSpeed(height: number): number {
  'worklet';
  return Math.sqrt(GRAVITY * height) * LAUNCH_RATIO;
}

/**
 * Where the ball will be by the time it has travelled `distance` along the
 * direction it was aimed — relative to the launcher, in points.
 *
 * This is what the dotted guide is drawn from, and the reason it curves. The
 * ball leaves along the aim and then falls, so a straight line of dots is only
 * honest for the first few of them: by the end of one the ball was most of a
 * peg's width below the line, which reads as the game ignoring the aim. Same
 * flight, solved for time instead of stepped: `t = distance / speed` along the
 * aim, and gravity does what it does over that time.
 *
 * `aim` is the angle off straight down, positive to the right — the same
 * convention the launch reads it in, so the first dot and the ball's first
 * frame come out of the same two numbers.
 *
 * A speed of zero (an unmeasured board) puts every dot on the launcher, which
 * is drawn under the ball and so shows nothing at all.
 */
export function guidePoint(
  aim: number,
  speed: number,
  distance: number,
): { x: number; y: number } {
  'worklet';
  if (speed <= 0) return { x: 0, y: 0 };

  const t = distance / speed;
  return {
    x: Math.sin(aim) * distance,
    y: Math.cos(aim) * distance + 0.5 * GRAVITY * t * t,
  };
}
