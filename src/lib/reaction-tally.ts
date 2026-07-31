import type { ReactionId } from '@/lib/streak';

/**
 * What everyone else made of today's card.
 *
 * The point of the feature is the feeling of not being the only person here, so
 * the honest failure mode matters more than usual: with four users, "100% found
 * this hopeful" is not a finding, it is one person and a rounding error. An app
 * whose entire pitch is *statistics rather than vibes* cannot put a fabricated
 * percentage next to a real one and expect either to be believed.
 *
 * So there are two displays, and which one appears depends on how many people
 * have actually answered:
 *
 *   below `MIN_SAMPLE` — the count. "You and 3 others so far today." True at any
 *                        scale, delivers the same "somebody else is here"
 *                        feeling, and is the state this will be in for a while.
 *   at or above        — percentages, which by then mean something.
 *
 * The lower state is not a placeholder to be tolerated until real numbers
 * arrive. It is the better answer when the sample is small, and it is what makes
 * the percentages trustworthy on the day they do appear.
 */

export interface ReactionCounts {
  hope: number;
  surprised: number;
}

export const EMPTY_COUNTS: ReactionCounts = { hope: 0, surprised: 0 };

/**
 * Answers needed before a percentage is worth printing.
 *
 * Ten is a judgement, not a statistic — no threshold makes a percentage from a
 * self-selected sample rigorous. What it buys is that no single person can move
 * the number by more than ten points, which is enough that the figure describes
 * a group rather than an individual.
 */
export const MIN_SAMPLE = 10;

export function totalVotes(counts: ReactionCounts): number {
  return counts.hope + counts.surprised;
}

/** Whether there are enough answers to show percentages rather than a count. */
export function hasEnoughForPercent(counts: ReactionCounts): boolean {
  return totalVotes(counts) >= MIN_SAMPLE;
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
 * The line shown while the sample is too small for percentages.
 *
 * Phrased around the reader — "you and 3 others" rather than "4 reactions" —
 * because being counted among people is the feeling this exists to produce, and
 * a bare total reads as telemetry.
 *
 * `total` includes the reader, who has necessarily just answered to see this at
 * all, so the others are one fewer.
 */
export function companyLabel(total: number): string {
  const others = Math.max(0, total - 1);

  if (others === 0) return 'You are the first to react today.';
  if (others === 1) return 'You and one other person so far today.';
  return `You and ${others} others so far today.`;
}
