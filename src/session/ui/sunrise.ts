/**
 * The colours of the banded sunrise, and how the stack is divided between them.
 *
 * Data only — no React, no theme, nothing that reaches for `react-native`. Split
 * out from `day-sky.tsx` for the same reason `playfield.ts` is split out from
 * `peg-drop.tsx`: these numbers were chosen against measured contrast and there
 * is a test that holds them there, and a test cannot import a component in this
 * project without dragging React Native's Flow source through the parser.
 *
 * The reasoning behind every value is in `day-sky.tsx`, which is where the thing
 * they describe is drawn. The short version, because it is the one rule that
 * must survive any retuning: **every band is lighter than the page.**
 *
 * A sunrise is brighter than the paper it falls on, not darker, and that is not
 * only truer to the picture — it is the whole of what makes this safe to put
 * behind text. `Colors.light.textMuted` is 4.79:1 on `#EDE6D6`, three tenths of
 * a point above the 4.5:1 floor, so a background that darkens the page at all
 * spends more headroom than there is. Going lighter instead *raises* contrast
 * against dark type, which is why every band reads better than the bare page
 * rather than worse. See `sunrise.test.ts`.
 */

/**
 * Horizon first, so `STOPS[0]` is the bottom of the screen and the last entry is
 * the top of the sky.
 *
 * Nine stops walking gold → warm neutral → pale blue: the light at the horizon,
 * the place where it gives out, and the sky above it. Sampled at *equal arc
 * length in CIELAB* along that path rather than at equal parameter, so
 * consecutive stops are all the same distance apart to look at — 4.0 to 4.5 ΔE,
 * near enough identical — instead of bunching wherever the path happens to move
 * slowly.
 *
 * Nine of them, for a gradient that could in principle be drawn from two. The
 * ends alone would give a straight line through RGB from gold to blue, and that
 * line runs through the grey in the middle of the colour wheel — the mid-sky
 * would come out dull and slightly dirty, which is the usual reason a two-stop
 * sunrise looks wrong. Handing the gradient the whole Lab path keeps it out
 * there where the colour is.
 *
 * Flat hex rather than a formula: they were checked one at a time against
 * measured contrast, and a formula that regenerated them would be one nobody had
 * checked.
 *
 * ## The blue end is as far as it is allowed to go; the gold is not
 *
 * `#dfe9f6` is the ceiling rather than a preference: about the bluest colour
 * that still has at least the paper's own luminance. One step further —
 * `#dce7f5` — drops below the page, takes muted copy from 4.79:1 to 4.76:1, and
 * the guarantee is gone.
 *
 * The gold is deliberately *short* of its own ceiling. It could go to `#ffedbc`
 * on the same rule and did, for a while; it has since been pulled back about a
 * fifth of the way toward neutral because at full strength it read as more gold
 * than a background wants to be.
 *
 * ## Why the warm end is yellow at all, which is not a choice
 *
 * Read on a real phone the gold kept coming back as *too yellow*, and the
 * obvious fix — rotate it toward peach — does not work here. It is worth writing
 * down why, because the reason is a hard limit rather than a preference.
 *
 * Everything in this ramp has to be lighter than the page, and sRGB has very
 * little chroma left up at that lightness. Asking for a peach at L* 93 returns a
 * colour with red already pinned at 255, so the request is silently clamped: a
 * genuine attempt at a* 13 came back as a* 7. Yellow is the one warm direction
 * with room left up there, because yellow is intrinsically the brightest hue.
 *
 * It compounds with the page being warm cream itself. Moving the horizon away
 * from yellow moves it *toward* `#EDE6D6`, so every degree of yellow given up is
 * also presence given up. A search over every in-gamut warm colour meeting both
 * of the guards below found that the least-yellow one available is `#ffe8c3` —
 * all of 8% less yellow than what it replaced, which is not a fix for anything.
 *
 * So `#ffe2c4` deliberately spends a little of the guard instead: b* 18.3 against
 * the old 22.8, which is a fifth less yellow, with a* lifted to 5.5 so what is
 * left leans apricot rather than lemon. It cost 3 ΔE of distance from the page.
 *
 * ## The floor underneath all of it
 *
 * The gold has come down in four steps — `#ffe79c` at 30.9 ΔE from the paper,
 * `#ffedbc` at 17.6, `#fdedc2` at 14.5, and now `#ffe2c4` at 11.3 — and there is
 * not much road left. Three numbers say when to stop:
 *
 *  - **The sweep, end to end: 26.5 ΔE.** Below about 25 the two ends stop being
 *    different enough for the page to read as a sky.
 *  - **The gap between neighbouring stops: 3.2 to 3.7 ΔE.** Below about 3 the
 *    stops stop being distinguishable and the ramp collapses toward one colour.
 *  - **The horizon's distance from the page: 11.3 ΔE.** This is the one with
 *    least margin now. An early version shipped invisible at 5.6, so there is
 *    still twice that in hand — but the next reduction of this size would spend
 *    most of it.
 *
 * Note what carries the sky now: the blue end is 16.1 ΔE from the paper and the
 * warm end is 11.3, so the cool half is doing more of the work than the warm
 * half. That is the opposite of where this started, and it is the direct cost of
 * four rounds of softening the gold.
 */
export const STOPS = [
  '#ffe2c4',
  '#fce5cb',
  '#f9e7d3',
  '#f5eada',
  '#f2ece1',
  '#edebe6',
  '#e9eaeb',
  '#e4eaf1',
  '#dfe9f6',
] as const;

/**
 * Where each stop sits up the screen, 0 at the bottom edge and 1 at the top.
 *
 * Not evenly spaced, and that is the whole of what makes it read as a sky rather
 * than as a colour ramp. The gaps widen steadily on the way up — 0.084 at the
 * horizon to 0.169 overhead — so the colour changes about twice as fast in the
 * bottom of the frame as in the top. That is what atmosphere actually does: a
 * real sunrise does all its work in the few degrees above the horizon and then
 * holds one blue for the rest of the sky.
 *
 * Evenly spaced stops were the obvious first thing and they look like a swatch
 * card stood on end — the eye reads a constant rate of change as manufactured,
 * because nothing outside changes colour at a constant rate.
 *
 * These came from the band layout this replaced, where they were heights rather
 * than positions: each stop sits at the centre of the band that used to carry
 * its colour, rescaled so the first lands on 0 and the last on 1.
 */
export const STOP_POSITIONS = [
  0, 0.0843, 0.1787, 0.2851, 0.4036, 0.5341, 0.6767, 0.8313, 1,
] as const;
