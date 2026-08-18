/**
 * Open the Flowers, as data: where a field of buds sits, and what counts as
 * touching one. Pure — no React, no timers, no theme.
 *
 * The game it is the arithmetic for is the calmest thing on the shelf. A petal
 * follows your finger across a field and everything it passes opens; when the
 * whole field is open, another one drifts in. There is nothing to lose, nothing
 * to be quick about, and nothing to get right — which is the entire design, not
 * a shortage of ideas. It is here because of the clinical work on Flower, where
 * twenty minutes of an atmospheric game with no fail state moved heart rate and
 * blood pressure about as far as a body-scan meditation did. That is a claim
 * about what an unhurried, unlosable few minutes does to a body, so what was
 * copied is the unhurriedness rather than the plot.
 *
 * Nothing here counts anything. The field has no target, no timer and no tally
 * of fields finished — see the shelf-wide rule at the top of `games/catalog.ts`.
 *
 * ## Why the coordinates are fractions
 *
 * A bud sits at an `x` and `y` between 0 and 1, not at a pixel. The board is
 * whatever is left of the screen after the framing copy, which is a different
 * shape on a phone, on a tablet and after a rotation — and a field stored in
 * points would either be re-sown by a rotation, throwing away a half-open
 * field, or drift off the edge.
 *
 * Distance is measured in *width* units: an `aspect` of height over width scales
 * the vertical difference before it is squared. Without that, the same gap
 * counted for more vertically than horizontally on a tall board, and the petal
 * opened flowers it visibly missed.
 */

export interface Bud {
  readonly id: number;
  /** Across the board, 0 to 1. */
  readonly x: number;
  /** Down the board, 0 to 1. */
  readonly y: number;
  /**
   * How big this one is drawn, around 1. Cosmetic, and the only thing keeping a
   * field of identical circles from reading as a diagram.
   */
  readonly size: number;
}

/**
 * How close a bud has to be to the petal to open, in width units.
 *
 * Generous. The point of the game is a wandering line that leaves flowers
 * behind it, and a radius that demanded accuracy would turn that into aiming.
 */
export const REACH = 0.09;

/**
 * The least a bud may sit from its neighbours, in width units.
 *
 * Comfortably more than `REACH`, so that passing through a cluster still opens
 * them one after another rather than five at once — a field that answered a
 * single touch with a whole corner would be over before the hand had moved.
 */
export const SPACING = 0.19;

/** How far in from the edges a bud may be sown, so none of it is clipped. */
const INSET = 0.09;

/**
 * Sowing gives up after this many tries per bud rather than looping until the
 * spacing happens to work out. A field of fourteen that comes back with twelve
 * is a field with a little more room in it, which nothing downstream minds.
 */
const TRIES_PER_BUD = 24;

/** Ids only have to outlive the field they are in; a running counter is plenty. */
let nextId = 0;

/**
 * A field of up to `count` buds, none of them within `SPACING` of another.
 *
 * `random` is a parameter rather than a call to `Math.random` for the same
 * reason it is everywhere else in these games: it is the only thing that would
 * otherwise make this untestable.
 */
export function sowField(
  count: number,
  aspect: number,
  random: () => number = Math.random,
): Bud[] {
  const buds: Bud[] = [];

  for (let attempt = 0; attempt < count * TRIES_PER_BUD && buds.length < count; attempt += 1) {
    const x = INSET + random() * (1 - INSET * 2);
    const y = INSET + random() * (1 - INSET * 2);
    if (buds.some((bud) => within(bud, x, y, SPACING, aspect))) continue;

    nextId += 1;
    buds.push({ id: nextId, x, y, size: 0.85 + random() * 0.35 });
  }

  return buds;
}

/**
 * Whether a point is inside `radius` of a bud.
 *
 * Carries the `'worklet'` directive because the petal is animated on the UI
 * thread and this is the test each bud runs against it every frame — see
 * `bloom-field.tsx`. The directive is an inert string off the device, so this is
 * still an ordinary function to node and to the tests below it, and the check
 * the game runs is the check that is under test rather than a copy of it.
 */
export function within(
  bud: { x: number; y: number },
  x: number,
  y: number,
  radius: number,
  aspect: number,
): boolean {
  'worklet';
  const dx = bud.x - x;
  const dy = (bud.y - y) * aspect;
  return dx * dx + dy * dy <= radius * radius;
}

/** Every bud the petal is touching, by id. The screen-reader path and the tests. */
export function reachedBy(
  buds: readonly Bud[],
  x: number,
  y: number,
  aspect: number,
  radius = REACH,
): number[] {
  return buds.filter((bud) => within(bud, x, y, radius, aspect)).map((bud) => bud.id);
}
