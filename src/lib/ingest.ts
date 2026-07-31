import type { Story } from '@/types/database';

/**
 * What counts as one day's news.
 *
 * Split out of `@/api/stories` rather than living beside the queries it serves,
 * because that module reaches the Supabase client and therefore `react-native`,
 * and none of the rules below can be tested through it. They are all rules about
 * calendars and staleness — the two things in this app most likely to be quietly
 * wrong for a reader in the wrong timezone or on the wrong week.
 */

/**
 * How long a batch keeps its "New" tag, and how long it may still be called
 * *today's*.
 *
 * Matches the ingest job's own 36-hour window. The tag means "arrived in the
 * last run", and when the workflow fails or is skipped the honest reading of a
 * three-day-old batch is not "new" — it is the same news the reader has already
 * seen, and labelling it otherwise is how a badge stops meaning anything.
 */
export const INGEST_FRESH_HOURS = 36;

/** Whether a run is recent enough that its stories are still the day's news. */
export function isIngestFresh(ingestedAt: string, now = Date.now()): boolean {
  const age = now - Date.parse(ingestedAt);
  return Number.isFinite(age) && age >= 0 && age < INGEST_FRESH_HOURS * 60 * 60 * 1000;
}

/** Whether a story arrived in the most recent run, and that run was recent. */
export function isNewlyIngested(story: Story, latestIngestAt: string | null): boolean {
  if (!latestIngestAt || story.created_at !== latestIngestAt) return false;
  return isIngestFresh(latestIngestAt);
}

/**
 * UTC midnight of the day a run happened, as an ISO string.
 *
 * The grouping key for a batch, and it has to be the *day* rather than the run's
 * exact `created_at`, because a manual `news:refresh` after the cron has already
 * gone writes a second batch a few hours later. Keying on equality would make
 * that re-run hide the morning's stories — the reader would open the feed to
 * three items and be told that was the whole day.
 *
 * UTC because a batch belongs to the job's calendar, not the reader's: the
 * workflow runs on a UTC cron, and bucketing by device time would split one
 * run's output across two days for readers far enough east or west.
 */
export function ingestDayStart(ingestedAt: string): string {
  const at = new Date(ingestedAt);
  return new Date(
    Date.UTC(at.getUTCFullYear(), at.getUTCMonth(), at.getUTCDate()),
  ).toISOString();
}
