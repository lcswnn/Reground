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

function channels(hex: string): [number, number, number] {
  const value = hex.replace('#', '');
  return [
    parseInt(value.slice(0, 2), 16),
    parseInt(value.slice(2, 4), 16),
    parseInt(value.slice(4, 6), 16),
  ];
}
