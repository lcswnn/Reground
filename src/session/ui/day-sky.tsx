/**
 * Clouds on the paper page, and only on the paper page.
 *
 * The light scheme's half of what `NightSky` does for the dark one.
 * `SessionScreen` mounts exactly one of the two, on the same condition, in the
 * same place, and neither ever appears on the other's scheme.
 *
 * The pairing is the idea: the dark page is a lit screen in an unlit room, so it
 * gets a night sky; the light page is paper in daylight, so it gets a day one.
 *
 * ## Darker than the paper, not lighter
 *
 * There is no room to go lighter. The page is `#EDE6D6` and the only thing above
 * it is white, so a pale cloud has about six percent of a channel to work in and
 * arrives as a faintly washed patch with no edge — which is the failure this
 * component was written after. The version before it was a warm gradient at 7%
 * alpha, and the honest report on it was that it did not seem to do anything.
 *
 * Downward there is the whole of the ink to draw on, and it is a tone the
 * palette already uses at exactly this strength: `backgroundElement` is ink at
 * 5% and `backgroundSelected` is ink at 9% — both real, visible surfaces in this
 * app. The nearest clouds sit in that range on purpose. They are the same
 * material as a pressed row, in the shape of weather.
 *
 * Darker clouds on a light page are also just what clouds are from underneath.
 *
 * ## Why these do not look like the clouds in a weather icon
 *
 * A cartoon cloud is three or four equal bumps in a symmetrical row. Nothing in
 * the sky looks like that, and the reason is worth writing down because it is
 * the whole of what this file does differently:
 *
 *  1. **The bottom is flat.** Real cumulus condense at one altitude, so they all
 *     share a level base — a whole sky of them is flat-bottomed at the same
 *     height. It is the single most recognisable thing about a cloud and the
 *     first thing a drawn one drops. Every lobe here is bottom-aligned to one
 *     line and a bar runs along it, so the silhouette is domed above and cut
 *     straight beneath.
 *
 *  2. **The top is off-centre.** The tallest lobe sits somewhere in the first
 *     half and the profile falls away more slowly behind it than in front, so
 *     each cloud has a head and a tail rather than a middle. That asymmetry is
 *     wind, and it is what stops a row of circles reading as a row of circles.
 *
 *  3. **They are wide.** Height is a bit under half of width. Drawn clouds are
 *     nearly square because that is what fits in an icon; the ones outside are
 *     long, because they are much further away than they are tall.
 *
 * ## One opacity, applied to the whole cloud at once
 *
 * The lobes and the base bar are fully opaque, and the *group* carries the
 * alpha. This is load-bearing rather than tidy: translucent shapes that overlap
 * composite into a darker patch at every seam, so a cloud built from six
 * see-through circles is a cloud with all its own construction lines drawn on
 * it. Setting `opacity` on the parent flattens the group first and fades it
 * once, which is what makes the result a silhouette instead of a diagram.
 *
 * It is also why clouds are laid out in separate horizontal bands. Two clouds
 * that overlapped would be two groups, and the overlap would show as a seam for
 * exactly the same reason.
 *
 * ## Everything is generated once, at module load
 *
 * Same as `NightSky`, for the same reason written out at more length there:
 * screens cross-fade into each other, so a sky that differed between them would
 * dissolve one set of clouds into another on every navigation. Seeded rather
 * than random so it also survives a restart. Nothing here moves — clouds that
 * drifted would be the one thing on screen asking to be watched, on pages built
 * to be looked away from.
 */

import { memo } from 'react';
import { StyleSheet, View, type DimensionValue } from 'react-native';

/**
 * The ink, which is `Colors.light.text`, written out rather than read from the
 * palette — the same call `NightSky` makes about the paper tone, for the same
 * reason. This exists in one scheme only, so there is no light/dark pair for it
 * to be a role in, and taking it from `theme.text` would say these are type.
 *
 * Fully opaque here. The alpha lives on the group — see the note above.
 */
const INK = '#4E4C50';

/**
 * The three distances, far to near, as they are laid out down the page.
 *
 * Size and alpha move together, which is the same depth cue the stars use: a
 * small faint cloud reads as far off, a large stronger one as overhead. Tying
 * the two means the sky has three legible distances rather than nine muddled
 * ones.
 *
 * The near tier at 0.1 is ink at ten percent — a shade past `backgroundSelected`
 * and therefore known to be visible on this paper rather than guessed at. The
 * far tier at 0.045 is under `backgroundElement` and is meant to sit at the edge
 * of being noticed, which is where the horizon belongs.
 *
 * `band` is the slice of screen height the cloud is placed in, top-down. Small
 * clouds ride high and large ones low, because that is what distance does to a
 * sky: the far ones crowd toward the horizon line and the near ones are the only
 * things with room to be big.
 */
const TIERS = [
  { width: 78, opacity: 0.045, band: [0.05, 0.14], zone: [0.46, 0.78] },
  { width: 104, opacity: 0.055, band: [0.17, 0.28], zone: [-0.1, 0.2] },
  { width: 150, opacity: 0.075, band: [0.34, 0.46], zone: [0.5, 0.92] },
  { width: 186, opacity: 0.09, band: [0.52, 0.63], zone: [-0.14, 0.16] },
  { width: 218, opacity: 0.1, band: [0.7, 0.79], zone: [0.34, 0.8] },
] as const;

/** Height as a share of width. Wide and low, which is what real cumulus are. */
const HEIGHT_RATIO = 0.44;

/** How much of the cloud's height the flat base bar takes. */
const BAR_SHARE = 0.34;

/**
 * Lobes per cloud. Enough to build a profile, few enough to stay a silhouette.
 *
 * Capped at five rather than six because six is where the profile stops being
 * one: spread across that many, the fall from the peak lands under a lobe's
 * width per step and every diameter comes out within a few points of its
 * neighbours, which is a row of equal circles — the exact thing the asymmetry
 * above exists to avoid. Fewer, larger lobes read as a mass with a shape.
 */
const MIN_LOBES = 4;
const MAX_LOBES = 5;

/** Fixed, so the sky is the same on every launch. */
const SEED = 0xc10d;

/**
 * mulberry32 again, copied rather than shared with `NightSky`.
 *
 * Four lines, and the two skies are otherwise independent — a `lib/random.ts`
 * holding one function for two callers in the same folder is a file to find
 * before either can be read. If a third sky ever wants it, that is the moment.
 */
function seeded(seed: number) {
  let state = seed;

  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Lobe {
  /** From the cloud's left edge. */
  x: number;
  diameter: number;
}

interface Cloud {
  left: DimensionValue;
  top: DimensionValue;
  width: number;
  height: number;
  barHeight: number;
  opacity: number;
  lobes: readonly Lobe[];
  /** Mirrored, so half the sky's tails point the other way. */
  flipped: boolean;
}

/**
 * The profile: how tall the cloud is at a given point across its width.
 *
 * `peak` is where the tallest lobe sits, always in the first half. In front of
 * it the height falls away over the short distance to the leading edge; behind
 * it the same fall is stretched over `TAIL_EASE`, so the cloud trails off rather
 * than ending. That is the asymmetry described at the top of the file, and it is
 * the one number here that would most change the character of the sky.
 *
 * The exponent keeps the shoulders full: at 1.4 the profile leaves the peak
 * slowly and drops away late, which reads as a mass with a shape. A linear
 * falloff gives a triangle of circles, which reads as a pile.
 */
const TAIL_EASE = 0.72;
const SHOULDER = 1.4;
/**
 * How tall the cloud still is at its furthest edge, as a share of the peak.
 *
 * 0.28, down from 0.38, which was flattening the whole profile: at the higher
 * floor the smallest lobe was two-thirds the largest and the cloud read as a bank
 * of similar circles. A quarter is enough that the ends still have a lobe rather
 * than a point, and little enough that the peak is visibly the peak.
 */
const FLOOR = 0.28;

const heightAt = (t: number, peak: number) => {
  const distance =
    t < peak ? (peak - t) / peak : ((t - peak) / (1 - peak)) * TAIL_EASE;

  return 1 - Math.min(distance, 1) ** SHOULDER * (1 - FLOOR);
};

/**
 * One cloud per tier, top to bottom, each jittered inside its own band.
 *
 * The draws are taken in a fixed order and the whole sky reshuffles if that
 * order, the seed, or any count above changes. Nothing depends on this exact
 * arrangement — but there is no such thing as a small edit here.
 */
const CLOUDS: readonly Cloud[] = TIERS.map((tier, index) => {
  const random = seeded(SEED + index * 0x9e37);

  const width = tier.width;
  const height = width * HEIGHT_RATIO;
  const barHeight = height * BAR_SHARE;

  const count = MIN_LOBES + Math.floor(random() * (MAX_LOBES - MIN_LOBES + 1));
  const peak = 0.28 + random() * 0.24;

  const lobes: Lobe[] = [];
  for (let i = 0; i < count; i += 1) {
    // Centres spread evenly across the width, then nudged. Even spacing is what
    // keeps the lobes overlapping into one mass; the nudge is what keeps them
    // from reading as evenly spaced.
    const t = (i + 0.5) / count;
    const jitter = (random() - 0.5) * (0.7 / count);
    const centre = Math.min(0.96, Math.max(0.04, t + jitter));

    // Capped at the box, and the jitter only ever shrinks. A lobe taller than
    // the cloud's own height would be clipped at the top by the group's opacity
    // layer, flattening the peak into a straight edge — which is the one part of
    // the silhouette that has to be a curve.
    const diameter = Math.min(
      height,
      height * heightAt(centre, peak) * (0.86 + random() * 0.14),
    );

    lobes.push({ x: centre * width - diameter / 2, diameter });
  }

  return {
    // Placed in the tier's own zone rather than anywhere across the width, and
    // the zones alternate sides down the page. Left to a free draw the five
    // clouds landed at 54%, 89%, 71%, 48% and 69% — the entire sky in the right
    // half with a bare column down the left, which is the clumping a small
    // sample always gives and which reads as a mistake rather than as weather.
    // The zones are the same answer `NightSky` reaches with its jittered grid:
    // deliberate coverage, random detail.
    //
    // Some zones start negative so a cloud runs off the edge. The sky should
    // carry on past the screen rather than be arranged inside it.
    left: `${((tier.zone[0] + random() * (tier.zone[1] - tier.zone[0])) * 100).toFixed(2)}%` as DimensionValue,
    // Bands stop at 0.79 so the lowest cloud is still a cloud. At 0.92 — where a
    // free draw put it — a 96pt cloud hangs most of the way off the bottom of
    // the screen and reads as a shape someone forgot to finish.
    top: `${((tier.band[0] + random() * (tier.band[1] - tier.band[0])) * 100).toFixed(2)}%` as DimensionValue,
    width,
    height,
    barHeight,
    opacity: tier.opacity,
    lobes,
    flipped: random() < 0.45,
  };
});

/**
 * Memoised for the same reason as `NightSky`: no props, nothing it can ever draw
 * differently, and `SessionScreen` re-renders on every route change.
 */
export const DaySky = memo(function DaySky() {
  return (
    // Pointer-transparent and pinned to all four edges of the frame's root,
    // which is outside its padding — so the sky runs under the safe area and off
    // every edge rather than stopping at the gutter the text sits in.
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {CLOUDS.map((cloud, index) => (
        <View
          key={index}
          style={{
            position: 'absolute',
            left: cloud.left,
            top: cloud.top,
            width: cloud.width,
            height: cloud.height,
            // The whole point. One alpha over a flattened group, so the lobes
            // and the bar fuse into a silhouette instead of showing every seam
            // where two of them overlap.
            opacity: cloud.opacity,
            transform: cloud.flipped ? [{ scaleX: -1 }] : undefined,
          }}
        >
          {cloud.lobes.map((lobe, lobeIndex) => (
            <View
              key={lobeIndex}
              style={{
                position: 'absolute',
                left: lobe.x,
                // Bottom-aligned, every one of them. This is the flat base.
                bottom: 0,
                width: lobe.diameter,
                height: lobe.diameter,
                borderRadius: lobe.diameter / 2,
                backgroundColor: INK,
              }}
            />
          ))}

          {/* The base: what turns a row of circles into one cloud with a level
              underside. Rounded at the ends and nearly square at the bottom
              corners, so the cloud sits on its line rather than floating as a
              pill. */}
          <View
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 0,
              height: cloud.barHeight,
              borderTopLeftRadius: cloud.barHeight / 2,
              borderTopRightRadius: cloud.barHeight / 2,
              borderBottomLeftRadius: 2,
              borderBottomRightRadius: 2,
              backgroundColor: INK,
            }}
          />
        </View>
      ))}
    </View>
  );
});
