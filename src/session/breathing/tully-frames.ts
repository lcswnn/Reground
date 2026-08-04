/**
 * The artwork, indexed the way `tully-cycle.ts` addresses it.
 *
 * Outer index is the pose (0–8, matching `POSE`); inner index is which of the
 * three hand-drawn outlines is showing. The three are the same pose redrawn —
 * the wobble that keeps a still Tully from looking like a sticker — so they are
 * interchangeable at any moment and the shimmer can run on its own clock.
 *
 * Relative paths rather than the `@/assets` alias: these go through Metro's
 * asset resolver rather than TypeScript's, and nothing else in the app has
 * exercised that alias for a `require` yet.
 *
 * The source art is `assets/tully-pngs/` — 355×261 flattened exports in three
 * flat colours, with no anti-aliasing and no alpha. What is checked in here is
 * that art:
 *
 *  - keyed — transparency flood-filled in from the canvas edge, which leaves
 *    the enclosed white of the eyes and the muzzle alone;
 *  - cropped to the union of all twenty-seven frames' bounds. One crop for the
 *    whole set, never per-frame: Tully inflates up and to the right out of a
 *    fixed corner, so cropping each frame to its own bounds would re-centre
 *    every pose separately and make Tully jump as the breath changed them. The
 *    shared canvas is what keeps their feet in one place;
 *  - scaled 2× with nearest-neighbour, which is the multiple that lands
 *    nearest 1:1 where Tully is actually drawn. `breathing-guide` caps them at
 *    190pt and a typical phone gives them ~162pt, so a 3× screen asks for about
 *    486px against the 522 here — near enough that the hard pixel edges survive
 *    instead of being resampled to mush. 3× was the first guess and it was
 *    wrong in both directions: a 0.62 downscale that crawled along the outlines,
 *    and, once `BreathingTully` began mounting every frame at once, more than
 *    twice the resident memory for the privilege.
 *
 * The result is 522×456 — an aspect of 1.15, so `BreathingTully` draws it inside
 * a square with `contain` and leaves a little spare above and below. If the art
 * is ever re-exported with real alpha at a higher resolution, the crop and the
 * key stop being needed, but the union-crop rule still applies: whatever lands
 * here has to share one canvas across every frame. Adding a pose that reaches
 * further than the current widest is not a matter of dropping files in — the
 * union grows, so the whole set has to be re-cropped together or the poses
 * drawn against the old canvas will sit at a different scale.
 */

export const TULLY_FRAMES = [
  [
    require('../../../assets/tully/pose-1-a.png'),
    require('../../../assets/tully/pose-1-b.png'),
    require('../../../assets/tully/pose-1-c.png'),
  ],
  [
    require('../../../assets/tully/pose-2-a.png'),
    require('../../../assets/tully/pose-2-b.png'),
    require('../../../assets/tully/pose-2-c.png'),
  ],
  [
    require('../../../assets/tully/pose-3-a.png'),
    require('../../../assets/tully/pose-3-b.png'),
    require('../../../assets/tully/pose-3-c.png'),
  ],
  [
    require('../../../assets/tully/pose-4-a.png'),
    require('../../../assets/tully/pose-4-b.png'),
    require('../../../assets/tully/pose-4-c.png'),
  ],
  [
    require('../../../assets/tully/pose-5-a.png'),
    require('../../../assets/tully/pose-5-b.png'),
    require('../../../assets/tully/pose-5-c.png'),
  ],
  [
    require('../../../assets/tully/pose-6-a.png'),
    require('../../../assets/tully/pose-6-b.png'),
    require('../../../assets/tully/pose-6-c.png'),
  ],
  [
    require('../../../assets/tully/pose-7-a.png'),
    require('../../../assets/tully/pose-7-b.png'),
    require('../../../assets/tully/pose-7-c.png'),
  ],
  [
    require('../../../assets/tully/pose-8-a.png'),
    require('../../../assets/tully/pose-8-b.png'),
    require('../../../assets/tully/pose-8-c.png'),
  ],
  [
    require('../../../assets/tully/pose-9-a.png'),
    require('../../../assets/tully/pose-9-b.png'),
    require('../../../assets/tully/pose-9-c.png'),
  ],
] as const;

/** How many outlines each pose was drawn with. */
export const SHIMMER_FRAMES = TULLY_FRAMES[0].length;
