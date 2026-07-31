import { dayNumber } from '@/lib/daily-card';
import { todayISO } from '@/lib/format';

/**
 * The sign-off at the bottom of the day's batch.
 *
 * This is the screen the rest of the app is arranged around. Every other feed a
 * reader opens is built so that reaching the bottom is impossible; the whole
 * argument for this one is that it ends, and an end that isn't *said* is
 * indistinguishable from a list that failed to load more. So the last thing on
 * the page is not a spinner and not whitespace — it is somebody telling you
 * you're finished and can go.
 *
 * The lines are written to give permission rather than to congratulate. "You've
 * read 9 of 9" is a completion meter, and a completion meter is the same
 * machinery as a streak: it makes tomorrow's batch an obligation. What this
 * should sound like is a friend closing a newspaper.
 */
export const SIGN_OFFS = [
  'Now go outside.',
  'The rest of the day is yours.',
  'Nothing else is waiting for you here.',
  'Go and be in the world a bit.',
  'Put the phone down — it will keep.',
  'The world will manage without you watching.',
  'Go make some news of your own.',
  'Take the good mood with you.',
  'Go look at something further than an arm away.',
  'No headlines required from here.',
  'Enjoy the unearned free time.',
  'Go and find someone to tell about one of these.',
  'That is genuinely all of it. Off you go.',
  'Sit somewhere with a window for a minute.',
  'Go and do something with your hands.',
];

/**
 * The line for a given day.
 *
 * Indexed by the date rather than randomised per render, for the same reason
 * `selectDailyCard` is: this sits at the bottom of a list the reader scrolls
 * back up through, and a sentence that rerolls itself on every pass reads as a
 * glitch. Once a day is also long enough that the rotation is noticeable at
 * all — a line the reader sees for a few seconds and never again is just noise.
 *
 * Fifteen lines against a daily index means a fortnight between repeats.
 *
 * Fifteen and not fourteen, which is where this started: plenty of readers open
 * an app like this on the same day each week, and a line count sharing a factor
 * with seven collapses to `count / gcd` lines for all of them — at fourteen, a
 * Sunday reader would have seen the entire rotation after a fortnight and then
 * met the same two sentences forever. Any count coprime with seven avoids it;
 * the test below is what actually holds the property, so adding or cutting a
 * line here will say so.
 */
export function signOffFor(isoDate = todayISO()): string {
  // Positive remainder, matching `daily-card`'s own rotation: `dayNumber` is
  // negative before 1970, and a negative index would return undefined and
  // render the sign-off as a blank line.
  const index = ((dayNumber(isoDate) % SIGN_OFFS.length) + SIGN_OFFS.length) % SIGN_OFFS.length;
  return SIGN_OFFS[index];
}
