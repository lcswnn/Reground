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
 * No glow, no cross-flare, no shape but a circle. Every star is a filled dot,
 * and depth is carried entirely by how big it is and how bright — four tiers,
 * mostly the faint end.
 *
 * That restraint is the brief, and it is also the only version that survives
 * this app's rules. Something that shimmers is something to watch, on screens
 * whose whole job is to be looked away from; the breathing screen is a shape
 * you are asked to rest on for half a minute, and a sky flickering behind it
 * competes for exactly the attention the screen is trying to settle.
 *
 * ## Four of them twinkle, and the numbers are what keep that true
 *
 * Sixty-seven of the seventy-one never move at all. Four do, and each spends
 * between thirty and sixty seconds doing nothing for every two and a half it
 * spends twinkling — so any one of them is still about 95% of the time. That
 * ratio is the feature: what is wanted is the thing a real sky does, where you
 * catch something at the edge of vision and it has stopped by the time you look.
 *
 * Everything about the way it moves is chosen to stay under notice. It is
 * opacity only — nothing moves, nothing scales, because a star that grew would
 * be a star that changed distance. The fall is nearly twice the rise, which is
 * what separates a twinkle from a blink. And it is slower than anything else
 * that moves in this app, because a quick one would catch the eye properly,
 * which is the single thing it must not do.
 *
 * They are spread one per quarter of the screen's height rather than picked
 * freely — see `STARS`, where the reason is a specific bug — and Reduce Motion
 * stops all of it dead, leaving exactly the still field this was before.
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

import { memo, useEffect } from 'react';
import { StyleSheet, View, type DimensionValue, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

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
 * How many stars are ever allowed to twinkle, out of the seventy-odd on screen.
 *
 * Four, which is about one in eighteen. The rest are as fixed as they have
 * always been, and that is the point rather than a saving: a sky where
 * everything shimmers is a screensaver, and this app's screens are built to be
 * looked away from. What is wanted is the thing a real sky does — you catch one
 * out of the corner of your eye, and by the time you look it has stopped.
 */
const TWINKLERS = 4;

/**
 * How long one twinkle takes: up, then down.
 *
 * The fall is nearly twice the rise, because that asymmetry is what separates a
 * twinkle from a blink. Something that brightens and dims at the same rate reads
 * as a pulse — a thing with a mechanism behind it. Slow out is how light
 * actually leaves.
 *
 * Under three seconds all told, and deliberately slower than anything else that
 * moves in this app. A quick one would catch the eye properly, which is the one
 * thing it must not do.
 */
const RISE_MS = 900;
const FALL_MS = 1700;

/**
 * The quiet between one star's twinkles, drawn per star from this range.
 *
 * Half a minute to a minute each, against a twinkle lasting 2.6 seconds — so any
 * given star is doing nothing about 95% of the time, which is the "less than it
 * is happening" this was asked for, held per star rather than on average.
 *
 * Across four stars that works out at something visible roughly every ten
 * seconds somewhere on the screen. On a screen somebody sits with for half a
 * minute that is two or three; on one they pass through, often none at all.
 */
const REST_MIN_MS = 30_000;
const REST_MAX_MS = 58_000;

/**
 * How far into the first cycle each star starts, drawn from zero to this.
 *
 * Without it all four would rest, rise and fall in lockstep from the moment the
 * screen mounted, and four stars twinkling in unison is not a sky, it is a
 * light fitting. Spread across the range they never resynchronise, because
 * their rests differ too.
 */
const OFFSET_MAX_MS = 24_000;

/**
 * How much brighter a star gets at the top of a twinkle, as a share of its own
 * resting opacity.
 *
 * Proportional rather than absolute, so a faint star lifts a little and a bright
 * one lifts more — which is what keeps the tiers meaning what they mean. At 0.9
 * a 0.3 star reaches about 0.57: clearly something happened, and still only
 * halfway to solid.
 */
const TWINKLE_LIFT = 0.9;

/**
 * Only stars at this resting opacity or above may twinkle.
 *
 * The faintest tier is 0.2, and lifting one of those is a change of a fifth of
 * nothing — invisible on a phone, so it would spend an animation on an effect
 * nobody could see. The brighter three tiers are the ones with somewhere to go.
 */
const TWINKLE_FLOOR = 0.3;

/**
 * The least distance between two twinkling stars, as a share of the screen.
 *
 * The bands below already keep them roughly apart vertically; this is what
 * stops two in neighbouring bands meeting at the line between them. Two twinkles
 * close together read as one blinking object — a pair of eyes, or a fault. Kept
 * apart, each is its own event.
 */
const TWINKLE_SPACING = 0.3;

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

/** When a star twinkles, for the few that do. */
interface Twinkle {
  /** How far into the first cycle it starts, so the four never move together. */
  offsetMs: number;
  /** The quiet before each twinkle. */
  restMs: number;
}

interface Star {
  /** Across and down the screen, 0 to 1. Formatted as a percentage at render. */
  x: number;
  y: number;
  size: number;
  opacity: number;
  /** `null` for the sixty-odd that never move, which is nearly all of them. */
  twinkle: Twinkle | null;
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
        x: (column + random()) / COLUMNS,
        y: (row + random()) / ROWS,
        size: tier.size,
        opacity: tier.opacity,
        twinkle: null,
      });
    }
  }

  /**
   * The four that move, chosen after the field exists rather than while it is
   * being laid.
   *
   * One per horizontal band, top to bottom, rather than four taken from the
   * whole screen — and that is not tidiness, it is a fix. Drawn freely, all four
   * came out in the bottom third of the page (y of 0.68, 0.80, 0.94 and 0.96),
   * each far enough from the others to pass the spacing check and the lot of
   * them nowhere near the top. Four out of seventy is a small enough sample that
   * "random" clumps like that more often than not, and a sky where the twinkling
   * only ever happens near your thumb is a worse sky than one that never
   * twinkles at all.
   *
   * Within its band each is still picked at random from the eligible stars, so
   * the bands decide roughly where and the dice decide exactly where.
   */
  const order = field.map((_, index) => index).sort(() => random() - 0.5);
  const chosen: number[] = [];

  for (let band = 0; band < TWINKLERS; band += 1) {
    const from = band / TWINKLERS;
    const to = (band + 1) / TWINKLERS;

    const pick = order.find((index) => {
      const star = field[index];

      if (star.opacity < TWINKLE_FLOOR) return false;
      if (star.y < from || star.y >= to) return false;

      return !chosen.some(
        (other) =>
          Math.hypot(star.x - field[other].x, star.y - field[other].y) <
          TWINKLE_SPACING,
      );
    });

    // A band with nothing eligible in it simply goes without. Better a sky with
    // three than one that reaches into a neighbouring band to make up the count
    // and puts two twinkles side by side.
    if (pick === undefined) continue;

    chosen.push(pick);
    field[pick] = {
      ...field[pick],
      twinkle: {
        offsetMs: Math.round(random() * OFFSET_MAX_MS),
        restMs: Math.round(REST_MIN_MS + random() * (REST_MAX_MS - REST_MIN_MS)),
      },
    };
  }

  return field;
})();

/**
 * Memoised because it takes no props and can never draw anything different.
 * `SessionScreen` re-renders whenever the route or the scheme changes, and
 * there is no reason for sixty leaf views to be reconciled again when it does.
 */
export const NightSky = memo(function NightSky() {
  /**
   * Read here rather than in each twinkling star, so the four of them cannot
   * disagree, and so the answer is one hook rather than four.
   *
   * Reduce Motion stops the twinkling dead — not slowed, not shortened. It is
   * the one thing on these screens that moves without being asked to, which
   * makes it exactly what somebody who turned that setting on was turning off.
   * The field is still drawn; it is simply the still sky it was before any of
   * this, which loses nothing that was load-bearing.
   */
  const still = useReducedMotion();

  return (
    // Pointer-transparent and pinned to all four edges of the frame's root —
    // which is outside its padding, so the field runs under the safe area and
    // off every edge rather than stopping at the gutter the text sits in.
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {STARS.map((star, index) =>
        star.twinkle && !still ? (
          <TwinklingStar key={index} star={star} twinkle={star.twinkle} />
        ) : (
          <View key={index} style={[placeOf(star), { opacity: star.opacity }]} />
        ),
      )}
    </View>
  );
});

/** Everything about a star except how bright it is, which is the part that moves. */
function placeOf(star: Star): ViewStyle {
  return {
    position: 'absolute',
    // Cast because `toFixed` gives back a plain `string` and the style type
    // wants the `${number}%` template — the value is a percentage either way.
    left: `${(star.x * 100).toFixed(2)}%` as DimensionValue,
    top: `${(star.y * 100).toFixed(2)}%` as DimensionValue,
    width: star.size,
    height: star.size,
    // Circles at these sizes are a formality — a 1.5pt square and a 1.5pt circle
    // are the same handful of pixels — but the largest tier is 3.5 and does read
    // as a square without it.
    borderRadius: star.size / 2,
    backgroundColor: STARLIGHT,
  };
}

/**
 * One of the four, on its own long clock.
 *
 * Its own component because each needs its own shared value and its own
 * animated style, and hooks cannot be called in a loop over a list — but the
 * list is fixed at module load, so the number of these never changes and React
 * never sees the hook count move.
 *
 * The cycle is rest, rise, fall, and it repeats forever. The rest sits at the
 * *front* rather than the back on purpose: `withDelay` schedules rather than
 * animating, so through the thirty to sixty seconds of quiet there is no frame
 * callback running at all. A pause written as a timing to the value it already
 * holds would look identical and tick the whole way through it.
 *
 * `false` for `reverse`, so every cycle runs forwards. Reversing would play the
 * fall backwards into the rise and put the rest in the middle of the twinkle.
 */
function TwinklingStar({ star, twinkle }: { star: Star; twinkle: Twinkle }) {
  const glow = useSharedValue(0);

  useEffect(() => {
    glow.value = withDelay(
      twinkle.offsetMs,
      withRepeat(
        withSequence(
          withDelay(
            twinkle.restMs,
            withTiming(1, { duration: RISE_MS, easing: Easing.out(Easing.quad) }),
          ),
          withTiming(0, { duration: FALL_MS, easing: Easing.in(Easing.quad) }),
        ),
        -1,
        false,
      ),
    );
  }, [glow, twinkle.offsetMs, twinkle.restMs]);

  // Opacity only. Nothing moves, nothing scales: a star that grew would be a
  // star that changed distance, and these are meant to be very far away.
  const lit = useAnimatedStyle(() => ({
    opacity: star.opacity + glow.value * star.opacity * TWINKLE_LIFT,
  }));

  return <Animated.View style={[placeOf(star), lit]} />;
}
