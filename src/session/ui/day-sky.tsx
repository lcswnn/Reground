/**
 * A sunrise behind the paper page, and only the paper page.
 *
 * The light scheme's half of what `NightSky` does for the dark one.
 * `SessionScreen` mounts exactly one of the two, on the same condition, in the
 * same place, and neither ever appears on the other's scheme. The dark page is a
 * lit screen in an unlit room and gets stars overhead; the light page is paper in
 * daylight and gets the sky.
 *
 * It fills the screen rather than sitting along the bottom, and it has to. The
 * ramp runs gold at the horizon, through the warm neutral where that light gives
 * out, into pale blue — and a sky that stops halfway up is a picture of a sky
 * pasted onto a page, with an edge to prove it. Running the full height, the
 * page *is* the sky, so there is no seam anywhere to find.
 *
 * ## A gradient, drawn from what used to be bands
 *
 * This was nine flat colours with hard edges, a screen-printed sunrise. It is
 * now one continuous blend through those same nine colours — `STOPS` in
 * `sunrise.ts`, with `STOP_POSITIONS` saying where each one sits up the screen.
 *
 * Keeping all nine matters more than it looks. A gradient like this could be
 * drawn from its two ends, and that is what makes most of them disappointing:
 * interpolating straight from gold to pale blue cuts across the middle of the
 * colour wheel, so the mid-sky comes out grey and faintly dirty. The nine stops
 * are samples along a path through CIELAB that stays out where the colour is,
 * and handing the gradient all of them keeps the blend on that path rather than
 * on the shortcut.
 *
 * The stops are also not evenly spaced — see `STOP_POSITIONS`. The colour moves
 * about twice as fast in the bottom of the frame as in the top, which is what
 * atmosphere does and what keeps the result from reading as a swatch card stood
 * on end.
 *
 * One number is worth carrying over from the banded version, because it was
 * learned the hard way: an earlier ramp was measured only for contrast and
 * shipped invisible — its horizon sat 5.6 ΔE from the paper and the page simply
 * looked like the page. The sweep from end to end is now 26.5 ΔE. On a large
 * flat area, a colour difference that is plainly visible in a swatch beside its
 * neighbour can be completely invisible spread across a screen. Measure it.
 *
 * ## Every colour in it is *lighter* than the page, and that is what makes it safe
 *
 * This is the part that took three attempts, and the first two were wrong in the
 * same way. The obvious way to warm a page is to lay a warm colour over it, and
 * every version of that darkens what it touches — which on this particular paper
 * is not affordable. `textMuted` is 4.79:1 on `#EDE6D6`, so the page starts with
 * about three tenths of a point of headroom over the 4.5:1 floor, and *any* warm
 * tint with enough presence to be seen spends more than that. Measured: a warm
 * wash strong enough to be noticed at all put muted copy at 3.8:1.
 *
 * So the light goes the other way. A sunrise is brighter than the page it falls
 * on, not darker — and a lighter background raises contrast against dark type
 * instead of lowering it. Every stop is above the paper's own luminance, and a
 * blend between two colours lighter than the page is itself lighter than the
 * page, so the guarantee covers every point of the gradient and not just the
 * nine that were measured:
 *
 *     plain paper    ink 6.83   muted 4.79
 *     dimmest stop   ink 6.84   muted 4.80   (the warm end, at the bottom)
 *     brightest stop ink 6.92   muted 4.86   (the blue, at the top)
 *
 * That is the brief — "it can't make text hard to read" — answered with a
 * guarantee rather than a judgement call. There is no screen, no tier and no
 * height up the page at which this makes text harder to read than the bare page
 * did. If these colours are ever retuned, that property is the one to preserve:
 * keep every stop lighter than `Colors.light.background` and the guarantee
 * holds.
 *
 * ## And why it is not distracting
 *
 * Nothing here moves and nothing animates. The axis is vertical, so the colour
 * is constant along every line of type — a diagonal would change colour across a
 * word, which is exactly the flicker the reading halo in `ThemedText` exists to
 * prevent.
 *
 * And no part of it is loud. The furthest stop from the page is the blue at
 * 16.1 ΔE and the warm end is nearer still at 11.3; what carries the sunrise is
 * the *sweep*, not any one colour in it. That is the difference between a background somebody notices
 * once and one they have to keep noticing.
 *
 * The blend also costs nothing the bands did not: it is one view with a shader
 * where there were nine views, and `expo-linear-gradient` was already a
 * dependency here.
 */

import { LinearGradient } from 'expo-linear-gradient';
import { memo } from 'react';
import { StyleSheet } from 'react-native';

import { STOPS, STOP_POSITIONS } from '@/session/ui/sunrise';

/**
 * The ramp, turned end for end.
 *
 * `STOPS` reads horizon-first because that is how a sky is described, and
 * `LinearGradient` paints from `start` to `end` — which here is top to bottom.
 * Reversed once at module load rather than in the render, and the positions have
 * to be mirrored as well as reversed: a stop that sat a tenth up from the bottom
 * sits nine tenths down from the top.
 */
type AtLeastTwo<T> = readonly [T, T, ...T[]];

const COLOURS = [...STOPS].reverse() as unknown as AtLeastTwo<string>;
const LOCATIONS = [...STOP_POSITIONS]
  .reverse()
  .map((at) => 1 - at) as unknown as AtLeastTwo<number>;

/**
 * Memoised because it takes no props and can never draw anything different.
 * `SessionScreen` re-renders on every route change and there is nothing here to
 * reconcile again when it does.
 */
export const DaySky = memo(function DaySky() {
  return (
    // Pinned to all four edges of the frame's root, which is outside its padding
    // — so the sky runs under the safe area and off every edge rather than
    // stopping at the gutter the text sits in. Pointer-transparent, like the
    // stars and the grain: nothing in the background of this app is a target.
    <LinearGradient
      colors={COLOURS}
      locations={LOCATIONS}
      // Straight down the middle. A vertical axis is the only one that keeps the
      // colour constant along each line of type — see the note above on why a
      // diagonal is the wrong shape for something drawn behind words.
      start={START}
      end={END}
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
    />
  );
});

const START = { x: 0.5, y: 0 } as const;
const END = { x: 0.5, y: 1 } as const;
