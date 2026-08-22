/**
 * Stars on the ink page, and only on the ink page.
 *
 * A fixed field of dots behind every session screen in dark mode. It is the one
 * decoration in an app that otherwise has none, and it earns the exception by
 * being the thing the dark scheme is *for*: the switch is used at night, by
 * someone who has the lights off, and a flat grey page is a screen where a sky
 * is what the eye expects. Light mode gets nothing — see `SessionScreen`, which
 * is the only thing that mounts this and mounts it on one condition.
 *
 * ## Dots, not stars
 *
 * There is no glow, no twinkle, no cross-flare and no animation of any kind.
 * Every star is a filled circle at a fixed opacity, and depth is carried
 * entirely by how big it is and how bright — four tiers, mostly the faint end.
 *
 * That restraint is the brief, and it is also the only version that survives
 * this app's rules. Something that shimmers is something to watch, on screens
 * whose whole job is to be looked away from; the breathing screen is a shape
 * you are asked to rest on for half a minute, and a sky flickering behind it
 * competes for exactly the attention the screen is trying to settle. A still
 * field reads as depth and then stops asking.
 *
 * ## The field is generated once, at module load
 *
 * `STARS` is computed from a seeded generator when this file is first imported,
 * so it is the same field for the whole process and the same field on every
 * screen. That is the point rather than an optimisation. Screens cross-fade
 * into each other (`animation: 'fade'` in `app/_layout.tsx`), so two screens
 * with different stars would dissolve one sky into another on every navigation
 * — the one moving thing on a page that is otherwise still. Identical fields
 * cross-fade into themselves and the sky simply holds while the words change.
 *
 * Seeded rather than hand-placed because sixty-odd coordinates are not worth
 * writing down, and seeded rather than `Math.random` because a field that
 * changes when the app restarts is a field somebody will notice changing.
 *
 * ## Positions are percentages
 *
 * So the field fills any window without measuring one: no `useWindowDimensions`,
 * no re-render on rotation, no re-render on an iPad split-view drag. The sky
 * stretches with the page, which for a scatter of dots is indistinguishable
 * from one laid out for the size it ended up.
 */

import { memo } from 'react';
import { StyleSheet, View, type DimensionValue } from 'react-native';

/**
 * The paper tone, which is `Colors.dark.text`, written out rather than read
 * from the palette.
 *
 * Not a theming oversight. Every other colour in the app is a role — text,
 * border, the accent — and is read through `useTheme` so it follows the scheme.
 * This one cannot be a role: it exists in one scheme only, so there is no light
 * value for it to have, and taking it from `theme.text` would say these dots are
 * type. They are the same ink the app writes in because that is the only bright
 * tone the dark page owns, and a second one would read as a colour cast rather
 * than as starlight.
 */
const STARLIGHT = '#F3F0E7';

/**
 * The four tiers, faintest first, with the share of the field each takes.
 *
 * Size and opacity move together on purpose — a large dim star and a small
 * bright one both read as "middle distance", so splitting the two axes would
 * only blur the depth the tiers exist to give. Tying them means the field has
 * four legible distances in it rather than sixteen muddled ones.
 *
 * The weighting is what keeps it a sky rather than a pattern. Half the field is
 * the faintest tier and the brightest is one star in twenty-five, which is the
 * ratio that makes the few bright ones read as near instead of as a scatter of
 * equals. An even split across four tiers looks like dust on the glass.
 *
 * The shares are cumulative thresholds against a 0–1 draw, so the last one has
 * to be 1 — see `tierFor`.
 */
const TIERS = [
  { size: 1.5, opacity: 0.2, upTo: 0.5 },
  { size: 2, opacity: 0.3, upTo: 0.79 },
  { size: 2.5, opacity: 0.42, upTo: 0.96 },
  { size: 3.5, opacity: 0.58, upTo: 1 },
] as const;

const tierFor = (draw: number) =>
  TIERS.find((tier) => draw < tier.upTo) ?? TIERS[TIERS.length - 1];

/**
 * A jittered grid rather than a free scatter, which is the difference between a
 * sky and a mess.
 *
 * Uniformly random points clump: at this count a free scatter reliably leaves a
 * bare quarter of the screen and a knot of five stars somewhere else, and on a
 * page this empty both read as a mistake — the gap looks like the field failed
 * to draw and the knot looks like a smudge. Placing one star per cell and
 * jittering it anywhere inside that cell keeps the coverage even while leaving
 * every position irregular, so no two stars line up and none of them are where
 * a grid would put them.
 *
 * Taller than wide, in cells, because the page is. Square-ish cells are what
 * make the spacing read as even in both directions rather than as rows.
 */
const COLUMNS = 6;
const ROWS = 13;

/**
 * The share of cells left empty, which is the other half of not looking like a
 * grid. Even jittered, a star in every cell still reads as a regular field at
 * the edges of vision; dropping a fifth of them at random breaks the rhythm and
 * leaves the real gaps a sky has, without opening one big enough to notice.
 */
const EMPTY_SHARE = 0.22;

/**
 * Fixed, so the field is the same on every launch. Any value works — this one
 * was picked by looking at a handful of them.
 */
const SEED = 0x5eed;

/**
 * mulberry32: a small, fast, well-distributed PRNG in four lines.
 *
 * Written out rather than pulled in, because a dependency for sixty numbers
 * generated once at import is a dependency to audit and update forever. The
 * quality bar here is "does not visibly band", which this clears by a distance
 * — it is a standard generator, not a hand-rolled hash.
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

interface Star {
  left: DimensionValue;
  top: DimensionValue;
  size: number;
  opacity: number;
}

/**
 * The field itself. Built at import, read forever, never rebuilt.
 *
 * The four draws per cell are taken in a fixed order — skip, tier, x, y — and
 * that order is load-bearing in the dull way seeded generation always is:
 * changing it, or the counts above, or the seed, gives a different sky. That is
 * fine and nothing depends on this exact arrangement, but it does mean there is
 * no such thing as a small tweak here. Any edit reshuffles the whole field.
 */
const STARS: readonly Star[] = (() => {
  const random = seeded(SEED);
  const field: Star[] = [];

  for (let row = 0; row < ROWS; row += 1) {
    for (let column = 0; column < COLUMNS; column += 1) {
      if (random() < EMPTY_SHARE) continue;

      const tier = tierFor(random());

      field.push({
        left: `${(((column + random()) / COLUMNS) * 100).toFixed(2)}%` as DimensionValue,
        top: `${(((row + random()) / ROWS) * 100).toFixed(2)}%` as DimensionValue,
        size: tier.size,
        opacity: tier.opacity,
      });
    }
  }

  return field;
})();

/**
 * Memoised because it takes no props and can never draw anything different.
 * `SessionScreen` re-renders whenever the route or the scheme changes, and
 * there is no reason for sixty leaf views to be reconciled again when it does.
 */
export const NightSky = memo(function NightSky() {
  return (
    // Pointer-transparent and pinned to all four edges of the frame's root —
    // which is outside its padding, so the field runs under the safe area and
    // off every edge rather than stopping at the gutter the text sits in.
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {STARS.map((star, index) => (
        <View
          key={index}
          style={{
            position: 'absolute',
            left: star.left,
            top: star.top,
            width: star.size,
            height: star.size,
            // Circles at these sizes are a formality — a 1.5pt square and a
            // 1.5pt circle are the same handful of pixels — but the largest
            // tier is 3.5 and does read as a square without it.
            borderRadius: star.size / 2,
            backgroundColor: STARLIGHT,
            opacity: star.opacity,
          }}
        />
      ))}
    </View>
  );
});
