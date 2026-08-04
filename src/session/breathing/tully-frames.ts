/**
 * The artwork, indexed the way `tully-cycle.ts` addresses it.
 *
 * Outer index is the pose (0–5, matching `POSE`); inner index is which of the
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
 *  - cropped to the union of all eighteen frames' bounds. One crop for the
 *    whole set, never per-frame: Tully inflates up and to the right out of a
 *    fixed corner, so cropping each frame to its own bounds would re-centre
 *    every pose separately and make Tully jump as the breath changed them. The
 *    shared canvas is what keeps their feet in one place;
 *  - scaled 3× with nearest-neighbour, so the hard pixel edges survive being
 *    drawn at roughly 1:1 on a 3× screen instead of being resampled to mush.
 *
 * The result is 711×594 — an aspect of 1.2, so `BreathingTully` draws it inside
 * a square with `contain` and leaves a little spare above and below. If the art
 * is ever re-exported with real alpha at a higher resolution, the crop and the
 * key stop being needed, but the union-crop rule still applies: whatever lands
 * here has to share one canvas across all eighteen frames.
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
] as const;

/** How many outlines each pose was drawn with. */
export const SHIMMER_FRAMES = TULLY_FRAMES[0].length;
