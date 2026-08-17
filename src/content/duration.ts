/**
 * How long a thing takes, said the way a person says it.
 *
 * Extracted here once a second catalog needed it. There are two of these in the
 * app and they are not the same function, which is worth writing down so the
 * next one does not get merged into the wrong one:
 *
 *  - `describeDuration` in `somatic.ts` is exact. A somatic movement is a clock
 *    the user watches count down, so "90 seconds" is the truth and is what the
 *    screen says.
 *  - This one is hedged and rounded, because nothing it describes lands on a
 *    whole minute and nothing it describes is shown as a clock. Nine rounds of
 *    ten seconds is a minute and a half; four muscle groups at twenty-four
 *    seconds each is ninety-six of them. Reading "1 minute 36 seconds" back to
 *    somebody is a stopwatch talking.
 *
 * Both exist for the same reason and under the same rule: the length is derived
 * from the numbers that actually run rather than written into the copy, so a
 * screen cannot promise a minute and then take two. See `BREATHE_INTRO.shape`,
 * which was the first of these.
 */

const LENGTHS: Readonly<Record<string, string>> = {
  '0.5': 'about half a minute',
  '1': 'about a minute',
  '1.5': 'about a minute and a half',
  '2': 'about two minutes',
  '2.5': 'about two and a half minutes',
  '3': 'about three minutes',
  '3.5': 'about three and a half minutes',
  '4': 'about four minutes',
};

export function describeLength(ms: number): string {
  // Floored at one half-minute: a run this app would round to zero is a run it
  // should not be offering, and "about 0 minutes" is the worst way to find out.
  const halves = Math.max(1, Math.round(ms / 30_000));
  const minutes = halves / 2;
  return LENGTHS[String(minutes)] ?? `about ${Math.round(minutes)} minutes`;
}
