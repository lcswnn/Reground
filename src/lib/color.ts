/**
 * Turns a hex color into an rgba string at the given alpha.
 *
 * Exists for gradients specifically. A fade has to end on a transparent version
 * of the *same* hue: ending on `transparent` fades toward rgba(0, 0, 0, 0)
 * instead, which drags the midpoint grey on a warm background and reads as a
 * dirty smudge rather than a fade.
 */
export function withAlpha(hex: string, alpha: number): string {
  const value = hex.replace('#', '');
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
