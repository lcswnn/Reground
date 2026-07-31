import type { ReactionId } from '@/lib/streak';

/**
 * What everyone else made of today's card.
 *
 * The percentage shows from the first vote, at any sample size. That is a
 * deliberate call and not an oversight: an earlier version withheld it below ten
 * answers on the grounds that "100%" off one person is not a finding. True, but
 * a feature that shows nothing for the first months of an app's life is a
 * feature nobody experiences, and the point here is the feeling of not being
 * alone — which a withheld number cannot deliver.
 *
 * What keeps it honest instead is the denominator. The card prints how many
 * people have answered alongside the split, so "100%" is read next to "1 reader
 * today" and lands as what it is.
 */

export interface ReactionCounts {
  hope: number;
  surprised: number;
}

export const EMPTY_COUNTS: ReactionCounts = { hope: 0, surprised: 0 };

export function totalVotes(counts: ReactionCounts): number {
  return counts.hope + counts.surprised;
}

/**
 * Whole percentages that add up to 100.
 *
 * Rounding each share independently is what puts "67% / 34%" on screen, and two
 * numbers that visibly fail to add up undermine the one thing this component is
 * for. With two options the fix is exact rather than approximate: round one and
 * subtract.
 *
 * Returns zeroes for an empty tally rather than dividing by it — the caller is
 * expected to check `hasEnoughForPercent` first, but a NaN reaching the screen
 * would be a worse outcome than a meaningless zero.
 */
export function reactionPercents(counts: ReactionCounts): Record<ReactionId, number> {
  const total = totalVotes(counts);
  if (total === 0) return { hope: 0, surprised: 0 };

  const hope = Math.round((counts.hope / total) * 100);
  return { hope, surprised: 100 - hope };
}

/**
 * The denominator, printed under the split.
 *
 * This is what makes an unfiltered percentage honest rather than a boast: "100%"
 * above "1 reader today" reads as one person agreeing with themselves, which is
 * exactly what it is. Without it the same figure claims a consensus.
 *
 * Phrased around people rather than votes — "3 readers" not "3 reactions" —
 * because being counted among people is the feeling this exists to produce, and
 * a bare event count reads as telemetry.
 */
export function readersLabel(total: number): string {
  if (total <= 0) return 'No answers yet today.';
  if (total === 1) return 'Just you so far today.';
  return `${total} readers today.`;
}
