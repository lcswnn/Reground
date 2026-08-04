/**
 * The artwork, indexed the way `frog-cycle.ts` addresses it.
 *
 * Outer index is the pose (0–7, matching `POSE`); inner index is which of the
 * three hand-drawn outlines is showing. The three are the same pose redrawn —
 * the wobble that keeps a still frog from looking like a sticker — so they are
 * interchangeable at any moment and the shimmer can run on its own clock.
 *
 * Relative paths rather than the `@/assets` alias: these go through Metro's
 * asset resolver rather than TypeScript's, and nothing else in the app has
 * exercised that alias for a `require` yet.
 *
 * The source art is 355×261 flattened GIF exports with no anti-aliasing and no
 * alpha. What is checked in here is that art:
 *
 *  - keyed — transparency flood-filled in from the canvas edge, which leaves
 *    the enclosed white of the eyes alone;
 *  - cropped to the union of all twenty-four frames' bounds. One crop for the
 *    whole set, never per-frame: the source canvas had 48px of padding on the
 *    left against 82px on the right, so the frog rendered visibly left of
 *    centre, but cropping each frame to its own bounds would re-centre every
 *    pose separately and make the frog jump as the breath changed it;
 *  - scaled 3× with nearest-neighbour, so the hard pixel edges survive being
 *    drawn at roughly 1:1 on a 3× screen instead of being resampled to mush.
 *
 * The result is 675×660 — an aspect of 1.02, which is why `BreathingFrog` can
 * treat it as square. If the art is ever re-exported with real alpha at a
 * higher resolution, the crop and the key stop being needed, but the union-crop
 * rule still applies: whatever lands here has to share one canvas across all
 * twenty-four frames.
 */

export const FROG_FRAMES = [
  [
    require('../../../assets/frog/pose-1-a.png'),
    require('../../../assets/frog/pose-1-b.png'),
    require('../../../assets/frog/pose-1-c.png'),
  ],
  [
    require('../../../assets/frog/pose-2-a.png'),
    require('../../../assets/frog/pose-2-b.png'),
    require('../../../assets/frog/pose-2-c.png'),
  ],
  [
    require('../../../assets/frog/pose-3-a.png'),
    require('../../../assets/frog/pose-3-b.png'),
    require('../../../assets/frog/pose-3-c.png'),
  ],
  [
    require('../../../assets/frog/pose-4-a.png'),
    require('../../../assets/frog/pose-4-b.png'),
    require('../../../assets/frog/pose-4-c.png'),
  ],
  [
    require('../../../assets/frog/pose-5-a.png'),
    require('../../../assets/frog/pose-5-b.png'),
    require('../../../assets/frog/pose-5-c.png'),
  ],
  [
    require('../../../assets/frog/pose-6-a.png'),
    require('../../../assets/frog/pose-6-b.png'),
    require('../../../assets/frog/pose-6-c.png'),
  ],
  [
    require('../../../assets/frog/pose-7-a.png'),
    require('../../../assets/frog/pose-7-b.png'),
    require('../../../assets/frog/pose-7-c.png'),
  ],
  [
    require('../../../assets/frog/pose-8-a.png'),
    require('../../../assets/frog/pose-8-b.png'),
    require('../../../assets/frog/pose-8-c.png'),
  ],
] as const;

/** How many outlines each pose was drawn with. */
export const SHIMMER_FRAMES = FROG_FRAMES[0].length;
