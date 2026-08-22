import { describe, expect, it } from 'vitest';

import { STOPS } from '@/session/ui/sunrise';

/**
 * The light scheme's page and its three text tiers, copied from `Colors.light`
 * in `constants/theme.ts` rather than imported from it.
 *
 * Not a shortcut. That module imports `react-native` for `Platform`, and a test
 * that pulls React Native's Flow source through the parser does not run at all —
 * which is also why `sunrise.ts` exists as data with no component attached.
 *
 * The duplication is the cost of the test existing, and it is a real one: if any
 * of these four change in the palette, they have to change here too, or this
 * file is checking the bands against a page that is no longer underneath them.
 * The first assertion below is the tripwire for the page colour at least — the
 * bands were sampled against this exact paper, so if it moves they are all wrong
 * and the test should be what says so.
 */
const PAPER = '#EDE6D6';
const INK = '#4E4C50';
const MUTED = '#656365';
const SECONDARY = '#4E4C50';

/**
 * The sunrise may never make any text harder to read than the bare page does.
 *
 * This is the promise the component is built around, and it is worth a test
 * because the obvious way to build a warm background breaks it silently: a warm
 * tint laid over the paper darkens it, and this paper has almost no contrast to
 * spare — `textMuted` sits at 4.79:1 on it, three tenths of a point over the
 * 4.5:1 floor. Two earlier versions of this background spent that and more, and
 * nothing about looking at the hex values says so.
 *
 * So the rule is mechanical: every band lighter than the page. A lighter
 * background raises contrast against dark type, which turns "did this hurt
 * legibility" from a judgement into arithmetic.
 */
const channels = (hex: string) =>
  [1, 3, 5].map((at) => parseInt(hex.slice(at, at + 2), 16));

/** sRGB relative luminance, per WCAG 2.1. */
function luminance(hex: string): number {
  const [r, g, b] = channels(hex).map((channel) => {
    const c = channel / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (high + 0.05) / (low + 0.05);
}

/**
 * CIELAB, so that "how different do these look" is a question with an answer.
 *
 * RGB distance is not that answer — it weighs a step of blue the same as a step
 * of green, which the eye does not — and the difference matters here because the
 * bands are separated by only a few units either way. ΔE of about 1 is the
 * threshold of seeing on a flat field, 3 is a clear edge, 20 is plainly a
 * different colour.
 */
function lab(hex: string): [number, number, number] {
  const [r, g, b] = channels(hex).map((channel) => {
    const c = channel / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });

  const white = [0.95047, 1, 1.08883];
  const xyz = [
    (0.4124 * r + 0.3576 * g + 0.1805 * b) / white[0],
    (0.2126 * r + 0.7152 * g + 0.0722 * b) / white[1],
    (0.0193 * r + 0.1192 * g + 0.9505 * b) / white[2],
  ].map((t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116));

  return [116 * xyz[1] - 16, 500 * (xyz[0] - xyz[1]), 200 * (xyz[1] - xyz[2])];
}

/** CIE76, which is plenty for colours this close together. */
function deltaE(a: string, b: string): number {
  const [la, aa, ba] = lab(a);
  const [lb, ab, bb] = lab(b);

  return Math.hypot(la - lb, aa - ab, ba - bb);
}

describe('the sunrise gradient', () => {
  const paper = PAPER;
  const readers = [
    ['body ink', INK],
    ['muted', MUTED],
    ['secondary', SECONDARY],
  ] as const;

  /**
   * The bands were sampled against this exact paper and every guarantee below is
   * measured from it, so this is the one value that cannot quietly drift.
   */
  it('was designed against the page it is drawn on', () => {
    expect(PAPER).toBe('#EDE6D6');
  });

  it.each(readers)('never reads worse than the bare page for %s', (_name, ink) => {
    const onPaper = contrast(paper, ink);

    STOPS.forEach((band: string) => {
      expect(contrast(band, ink), band).toBeGreaterThanOrEqual(onPaper);
    });
  });

  it.each(readers)('clears AA on every band for %s', (_name, ink) => {
    STOPS.forEach((band: string) => {
      expect(contrast(band, ink), band).toBeGreaterThanOrEqual(4.5);
    });
  });

  /** The mechanism behind both of the above, asserted directly. */
  it('keeps every band lighter than the page', () => {
    STOPS.forEach((band: string) => {
      expect(luminance(band), band).toBeGreaterThan(luminance(paper));
    });
  });

  /**
   * The sunrise has to be *visible*, which is the one thing the first version of
   * it was not.
   *
   * That version was measured only for contrast and shipped, and on a phone it
   * was indistinguishable from the plain cream page — its horizon sat about 5.6
   * ΔE from the paper and its faintest stops under 3. The lesson is that a
   * colour difference which is obvious in two swatches side by side can vanish
   * entirely when it is spread across half a screen, so "it looked fine in the
   * hex" is not evidence of anything. This is the number that would have caught
   * it.
   */
  it('is actually visible against the page', () => {
    // Both ends, because the sky reaches away from the paper in two directions —
    // warm below, cool above — and a ramp that only moved one way would be half
    // a sunrise.
    //
    // Ten, down from the twelve this was written with. That first figure was set
    // just under the values of the day (14.5 and 16.1) rather than against
    // anything measured, and successive rounds of softening the gold have since
    // spent it down to 11.3. Lowering a threshold to admit the change that broke
    // it is exactly how a guard stops guarding, so here is the evidence it is now
    // anchored to instead: the version of this background that shipped genuinely
    // invisible had a horizon 5.6 ΔE from the paper. Ten is comfortably clear of
    // that and 11.3 is comfortably clear of ten.
    //
    // There is not room to do this again. A further reduction of the same size
    // would land near the floor, and at that point the answer is not a smaller
    // number here — it is that the warm end has gone as far as it can and
    // something else has to change.
    expect(deltaE(STOPS[0], paper), 'horizon').toBeGreaterThan(10);
    expect(deltaE(STOPS[STOPS.length - 1], paper), 'sky').toBeGreaterThan(12);
  });

  /**
   * And the sweep from end to end is what actually carries it. No single band is
   * loud — the strongest is under 18 ΔE from the page — so if this number ever
   * collapses, the background goes back to looking like a plain cream card no
   * matter how respectable each individual colour looks in isolation.
   */
  it('sweeps far enough from gold to blue to read as a sky', () => {
    expect(deltaE(STOPS[0], STOPS[STOPS.length - 1])).toBeGreaterThan(25);
  });

  /** Warm at the bottom, cool at the top, and not the other way up. */
  it('runs warm at the horizon and cool at the sky', () => {
    const [, , horizonBlue] = lab(STOPS[0]);
    const [, , skyBlue] = lab(STOPS[STOPS.length - 1]);

    // b* is the yellow/blue axis: positive is yellow, negative is blue.
    expect(horizonBlue, 'horizon should be yellow').toBeGreaterThan(10);
    expect(skyBlue, 'sky should be blue').toBeLessThan(0);
  });

  /**
   * Consecutive stops have to stay close enough together that the blend between
   * them is smooth, and far enough apart that the ramp actually travels. This
   * bound was written when these were hard-edged bands and still earns its
   * keep: a stop that drifts far from its neighbour puts a visible seam in a
   * gradient just as surely as it put a loud edge in a stack of bands.
   *
   * Measured in CIELAB rather than RGB, because that is the space in which
   * "evenly spaced" means what it looks like it means. There is no step onto the
   * bare page to check any more — the sky fills the screen, so the paper is
   * never beside the gradient to be compared with it.
   */
  it('spaces its stops evenly, and neither too close nor too far', () => {
    for (let i = 1; i < STOPS.length; i += 1) {
      const step = deltaE(STOPS[i], STOPS[i - 1]);

      expect(step, `${STOPS[i - 1]} -> ${STOPS[i]}`).toBeGreaterThan(3);
      expect(step, `${STOPS[i - 1]} -> ${STOPS[i]}`).toBeLessThan(9);
    }
  });
});
