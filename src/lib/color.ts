/**
 * Turns a hex color into an rgba string at the given alpha.
 *
 * Exists for gradients specifically. A fade has to end on a transparent version
 * of the *same* hue: ending on `transparent` fades toward rgba(0, 0, 0, 0)
 * instead, which drags the midpoint grey on a warm background and reads as a
 * dirty smudge rather than a fade.
 */
export function withAlpha(hex: string, alpha: number): string {
  const [r, g, b] = channels(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Two colours mixed, as an opaque one.
 *
 * The difference from `withAlpha` is the whole reason it exists: a translucent
 * fill lets whatever is behind it through, which is fine over a flat page and
 * wrong the moment things overlap. The cube stack in Hidden Cubes is drawn
 * back to front with no depth buffer — the near cubes are supposed to hide the
 * far ones — and at 50% ink the far ones show straight through, so a solid pile
 * looks like a wireframe of itself.
 *
 * `amount` is how much of `to` there is: 0 is `from`, 1 is `to`.
 */
export function mix(from: string, to: string, amount: number): string {
  const a = channels(from);
  const b = channels(to);
  const t = Math.max(0, Math.min(1, amount));

  const [r, g, blue] = a.map((channel, i) => Math.round(channel + (b[i] - channel) * t));
  return `rgb(${r}, ${g}, ${blue})`;
}

/**
 * A colour picked off a multi-stop ramp, as hex.
 *
 * `t` runs 0–1 across the ramp as a whole however many stops are behind it, so
 * a caller can hand over a fraction of its own scale and not have to know. Out
 * of range clamps to the ends rather than extrapolating: a ramp is a range of
 * colours somebody chose, and there is nothing sensible past either end of it.
 *
 * Hex out rather than `mix`'s `rgb()`, and that is the point of the difference:
 * the result of this is meant to be fed back into the other helpers here, and
 * `channels` only reads hex.
 *
 * Interpolated straight in sRGB rather than a perceptual space. That would give
 * a more even ramp between two arbitrary colours, but these stops are picked by
 * eye against the page they sit on and checked for contrast one value at a time
 * — the blend is being steered at every stop, not trusted to be even between
 * two of them.
 */
export function gradient(stops: readonly string[], t: number): string {
  if (stops.length === 0) throw new Error('gradient needs at least one stop.');
  if (stops.length === 1) return stops[0];

  const clamped = Math.max(0, Math.min(1, t));
  if (clamped === 1) return stops[stops.length - 1];

  // Which leg of the ramp `t` falls on, and how far along that leg it is.
  const span = 1 / (stops.length - 1);
  const leg = Math.floor(clamped / span);
  const local = (clamped - leg * span) / span;

  const from = channels(stops[leg]);
  const to = channels(stops[leg + 1]);

  const hex = from
    .map((channel, i) => Math.round(channel + (to[i] - channel) * local))
    .map((channel) => channel.toString(16).padStart(2, '0'))
    .join('');

  return `#${hex.toUpperCase()}`;
}

function channels(hex: string): [number, number, number] {
  const value = hex.replace('#', '');
  return [
    parseInt(value.slice(0, 2), 16),
    parseInt(value.slice(2, 4), 16),
    parseInt(value.slice(4, 6), 16),
  ];
}
