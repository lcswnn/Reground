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
/**
 * How far in from the side walls the outermost peg would stand, if the ball
 * could always get there. It often cannot — see `reachableSide`, which is what
 * the field is actually laid to. This is the floor of that: the field is never
 * *wider* than this, only narrower.
 */
const SIDE = 0.12;

/**
 * The narrowest the field may be squeezed, whatever the board.
 *
 * A backstop rather than a number that is expected to bind — `columnsFor` is what
 * actually protects the spacing now, by dropping a column rather than crushing
 * seven of them into whatever width is left.
 */
const MAX_SIDE = 0.34;

/**
 * How far down the field may be pushed before narrowing is preferred instead.
 *
 * Lowering the top row is the *first* lever, because it is the one that costs
 * nothing anybody can see: the ball has longer to fall before it reaches the
 * first row, so it can be further sideways by the time it gets there, and the
 * field keeps its full width and all seven of its columns. It only moves down
 * the board.
 *
 * Narrowing was tried first and was the wrong choice. It buys reach by pulling
 * the outermost columns toward the middle, which packs the same seven columns
 * into less width — on a phone-shaped board that took the gap between pegs from
 * about 43 points to about 36, and a field that tight reads as a huddle rather
 * than as something to drop a ball through. Correct, and unpleasant.
 *
 * The cap is where lowering stops being free. Below this the five rows have to
 * crowd together vertically to fit above `BOTTOM`, and a field that is short of
 * room downward is the same complaint in the other axis.
 */
const MAX_TOP = 0.44;

/**
 * How much of a board's *natural* column spacing the guard rail may take, at
 * worst, before it drops a column instead.
 *
 * A share rather than a number of points, and that distinction was a bug on the
 * way here. Spacing is not an absolute: an unconstrained field puts its columns
 * `(1 − 2·SIDE) / (ACROSS − 1)` of the width apart, so a wide board is naturally
 * roomy and a narrow one is naturally tight, and both are correct. A fixed floor
 * of 40 points called a small phone's ordinary field crowded — it had never been
 * touched — while letting a large one lose a great deal before complaining.
 *
 * What the guard rail owes the player is that it does not make the field
 * noticeably tighter than the board would have been anyway. Eight percent is
 * about the most that goes unnoticed; past that, six columns properly spread
 * beat seven in a huddle.
 */
const GAP_KEEP = 0.92;

/** What the columns would be spaced at on this board with nothing constraining them. */
function naturalGap(width: number): number {
  return ((1 - SIDE * 2) / (ACROSS - 1)) * width;
}

/**
 * Below this a row is too thin to rattle a ball around. Five long rows is
 * 5+4+5+4+5 = 23 pegs, still a field worth several balls.
 */
const MIN_ACROSS = 5;

/** The largest gap between rows, used to bound the vertical jitter safely. */
const MAX_DROP = (BOTTOM - TOP) / (ROWS - 1);

/**
 * Slack between the outermost peg and the true edge of the ball's envelope, in
 * points.
 *
 * Without it the corner pegs would be exactly reachable, which means reachable
 * only by a shot at the precise limit of the aim — and an aim that has to be
 * held against its own stop to hit anything is not a shot, it is a stunt. This
 * buys the corner peg a real window: a little under a peg's width of aim either
 * side of perfect.
 */
const REACH_MARGIN = 14;

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
 * How far sideways of the launcher a ball can get by the time it has fallen
 * `depth` points, at the widest aim the game allows.
 *
 * The same flight `guidePoint` draws and the frame loop steps, solved a third
 * way: for the time at which it has fallen a given distance, rather than for a
 * position at a given time. `(G/2)t² + cos(aim)·s·t − depth = 0`, positive root,
 * and the sideways distance is `sin(aim)·s·t`.
 *
 * Evaluated at `MAX_AIM` because that is the widest shot on the board, and the
 * widest shot is the one that decides whether the corners are in play. Walls are
 * ignored: a peg that can only be reached by bouncing off a wall first is not
 * one the player can aim at, which is the distinction this whole function exists
 * to enforce.
 */
export function sidewaysReach(height: number, depth: number): number {
  if (depth <= 0 || height <= 0) return 0;

  const speed = launchSpeed(height);
  const down = Math.cos(MAX_AIM) * speed;
  const time =
    (-down + Math.sqrt(down * down + 2 * GRAVITY * depth)) / GRAVITY;

  return Math.sin(MAX_AIM) * speed * time;
}

/**
 * How deep the ball has to fall before it can be `across` points sideways of the
 * launcher, at the widest aim the game allows.
 *
 * The inverse of `sidewaysReach`, and the reason the field can be *lowered* into
 * reach rather than only narrowed into it: given how far out a peg stands, this
 * says how far down it has to be for the widest shot to arrive.
 */
function depthForReach(height: number, across: number): number {
  const speed = launchSpeed(height);
  const time = across / (Math.sin(MAX_AIM) * speed);

  return Math.cos(MAX_AIM) * speed * time + 0.5 * GRAVITY * time * time;
}

/** How far the outermost peg of a row stands from the centre line, as a fraction. */
function outermost(side: number, across: number): number {
  const gap = (1 - side * 2) / (across - 1);

  return 0.5 - side + 0.5 * gap * JITTER;
}

/** The top row's depth, in fractions, that puts its corners inside the envelope. */
function topForReach(
  width: number,
  height: number,
  side: number,
  across: number,
): number {
  const need = outermost(side, across) * width + REACH_MARGIN;
  const depth = depthForReach(height, need);

  // The jitter allowance uses the largest drop any layout can have, so that a
  // top solved here stays correct once the rows are actually spaced.
  return (depth + LAUNCH_Y) / height + 0.5 * MAX_DROP * JITTER;
}

/** The inset that puts the corners inside the envelope at a given top row. */
function sideForReach(
  width: number,
  height: number,
  top: number,
  across: number,
): number {
  const depth = (top - 0.5 * MAX_DROP * JITTER) * height - LAUNCH_Y;
  const usable = Math.max(0, sidewaysReach(height, depth) - REACH_MARGIN);
  const reach = usable / width;
  const k = JITTER / (2 * (across - 1));

  return Math.min(MAX_SIDE, Math.max(SIDE, (0.5 + k - reach) / (1 + 2 * k)));
}

/** As many columns as fit at the kept spacing, never more than `across`. */
function columnsFor(width: number, side: number, across: number): number {
  const span = (1 - side * 2) * width;
  const least = naturalGap(width) * GAP_KEEP;

  return Math.max(MIN_ACROSS, Math.min(across, Math.floor(span / least) + 1));
}

/** Where the pegs stand on a board of this shape. */
export interface FieldPlan {
  /** The top row, as a fraction down the board. */
  readonly top: number;
  /** How far in from the walls the outermost peg stands, as a fraction. */
  readonly side: number;
  /** Columns in a long row. */
  readonly across: number;
}

/**
 * Where to put the pegs on a board of this shape, so that every one of them can
 * actually be hit — the guard rail, and the reason `layField` has to be told how
 * big the board is.
 *
 * ## The bug this exists to end
 *
 * The field is laid in fractions of the board and the ball is flown in points,
 * and those two do not scale together. A peg's distance from the launcher grows
 * with the board's *width*; the time the ball has to cover that distance grows
 * with its *height*. So on a board that is wide for its height, the outermost
 * pegs of the top row sit outside the envelope: the widest shot the game allows
 * lands short of them every time, and the corners of the field are not a hard
 * shot but no shot at all.
 *
 * It had been treated twice as a tuning problem — `MAX_AIM` opened from 66° to
 * 77°, `LAUNCH_RATIO` from 0.42 to 0.48 — each time bringing the corner peg just
 * inside the possible on the one board it was measured against. It was never a
 * tuning problem. No fixed pair of numbers can work, because the requirement
 * moves with the aspect ratio of whatever box the game is handed, and there is
 * always a wider board. The two are nearly out of room besides: flatter than 77°
 * and the ball runs the ceiling wall to wall instead of coming down through
 * anything.
 *
 * So the field yields instead of the shooter.
 *
 * ## Three levers, in this order, and the order is the whole design
 *
 *  1. **Lower the top row.** Costs nothing visible: the ball gets longer to fall
 *     before the first row, so it can be further sideways when it arrives, and
 *     the field keeps its full width and every column. The field simply sits
 *     lower on the board. This alone settles every ordinary phone.
 *
 *  2. **Narrow the field**, once lowering has reached `MAX_TOP`. This one does
 *     cost something — the columns come toward the middle.
 *
 *  3. **Drop a column**, so that narrowing never turns into crowding. Six
 *     columns properly spread beat seven in a huddle, and `GAP_KEEP` is
 *     where that line is drawn.
 *
 * Narrowing was the first version of this fix and was the only lever, which is
 * how it earned its place as the second: it is correct — no peg was out of reach
 * — and it made a phone-shaped board look like a huddle, because seven columns
 * went into the width that reach allowed rather than the width they wanted.
 *
 * The loop re-solves the inset each time it drops a column, because the two
 * depend on each other: fewer columns means a wider gap, a wider gap means more
 * jitter on the outermost peg, and more jitter means a fraction more inset.
 */
export function planField(width: number, height: number): FieldPlan {
  if (width <= 0 || height <= 0) {
    return { top: TOP, side: SIDE, across: ACROSS };
  }

  // Lever one, and for most boards the only one that moves.
  const wanted = topForReach(width, height, SIDE, ACROSS);
  if (wanted <= MAX_TOP) {
    return { top: Math.max(TOP, wanted), side: SIDE, across: ACROSS };
  }

  // Levers two and three, for boards too wide for their height to be settled by
  // lowering alone.
  const top = MAX_TOP;
  let across = ACROSS;
  let side = sideForReach(width, height, top, across);

  const least = naturalGap(width) * GAP_KEEP;
  while (across > MIN_ACROSS) {
    if ((1 - side * 2) * width >= least * (across - 1)) break;

    across = columnsFor(width, side, across - 1);
    side = sideForReach(width, height, top, across);
  }

  return { top, side, across };
}

/**
 * A field of pegs: staggered rows, each one nudged off its lattice point.
 *
 * Staggered rather than square because a square grid has clear columns running
 * all the way down it, and a ball that finds one falls to the bottom untouched.
 * Offsetting every other row by half a space means there is no straight way
 * through, whatever angle it is entered at.
 *
 * The board's size is required rather than optional, and that is deliberate:
 * every field this returns is guaranteed to be one every peg of which can be
 * hit, and it can only make that promise about a board it has been shown. See
 * `reachableSide`. A field laid against a default would be a field with the old
 * bug in it, so there is no default to reach for.
 */
export function layField(
  board: { width: number; height: number },
  random: () => number = Math.random,
): Peg[] {
  const pegs: Peg[] = [];
  const { top, side, across } = planField(board.width, board.height);
  const span = 1 - side * 2;
  const gap = span / (across - 1);
  const drop = (BOTTOM - top) / (ROWS - 1);

  for (let row = 0; row < ROWS; row += 1) {
    // The short rows sit between the long ones, which is what makes the field
    // staggered rather than square.
    const short = row % 2 === 1;
    const count = short ? across - 1 : across;
    const start = side + (short ? gap / 2 : 0);

    for (let index = 0; index < count; index += 1) {
      nextId += 1;
      pegs.push({
        id: nextId,
        x: start + index * gap + (random() - 0.5) * gap * JITTER,
        y: top + row * drop + (random() - 0.5) * drop * JITTER,
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
 * That second half is what moved it from 0.42 to 0.48: at the old speed the
 * outermost pegs of the top row were beyond the ball at any aim it was allowed,
 * so the widest shot on the board was a shot at nothing. A seventh more speed
 * puts them a comfortable margin inside it on the smallest board this runs on,
 * and the ball still crosses the field slowly enough to be watched — which is
 * the whole of what this game asks anybody to do.
 *
 * Both live here rather than in the component because two things now have to
 * agree about them: the ball, which is integrated frame by frame, and the guide
 * the player aims with, which is the same flight solved in closed form. A guide
 * drawn from one gravity and a ball falling under another is a game that does
 * not go where it is pointed.
 */
export const GRAVITY = 1100;
export const LAUNCH_RATIO = 0.48;

/** How far down the board the ball is released from, in points. */
export const LAUNCH_Y = 26;

/**
 * How far off straight down a ball can be aimed, in radians. 1.35 is 77°.
 *
 * Still short of horizontal on purpose. A ball fired flat runs the ceiling from
 * wall to wall and takes several seconds to come down through anything, and the
 * aim that does it is easy to reach for by accident on a small board.
 *
 * It was 66°, which was short of horizontal by rather too much: at that angle a
 * ball had travelled only about 110 points sideways by the time it had fallen to
 * the top row, and the outermost pegs of that row stood about 130 points off the
 * middle. They could only be reached off a wall, and only by accident.
 *
 * Opening it to 77° — and `LAUNCH_RATIO` with it — brought that particular peg
 * on that particular board to about a point inside the possible, which is a
 * different way of being unreachable. Neither change fixed the actual problem,
 * because the actual problem was never the angle; see `reachableSide`, which
 * fixes it from the other end and is the reason this constant lives here rather
 * than in the component. The field has to know how wide a shot the shooter has.
 *
 * There is very little room left in this direction. Anything flatter is the
 * ceiling-runner above, so the angle is at its useful limit and the field is
 * what yields from here on.
 */
export const MAX_AIM = 1.35;

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
