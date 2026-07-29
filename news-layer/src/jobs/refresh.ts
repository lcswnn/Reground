/**
 * Daily news refresh.
 *
 *   npx tsx news-layer/src/jobs/refresh.ts
 *   npx tsx news-layer/src/jobs/refresh.ts --dry   # judge, report, write nothing
 *
 * The order of the four stages is the design:
 *
 *   1. fetch every feed, isolating failures per feed
 *   2. window to the last day and a half
 *   3. drop anything already in the database  ← before the model, not after
 *   4. curate what's left, write it, feature the best one
 *
 * Stage 3 sitting where it does is what keeps this cheap. Most of a morning's
 * feed items were already judged yesterday, and paying to re-read them is the
 * one cost in this pipeline that buys nothing at all.
 */

import '../env.js';

import { FEEDS } from '../config/feeds.js';
import { curate, reportUsage } from '../curate.js';
import { fetchFeed } from '../feed.js';
import {
  featureStory,
  findExistingUrls,
  hasFeaturedStory,
  recordRun,
  writeStories,
} from '../storage/supabase.js';
import type { FeedItem, StoryRow } from '../types.js';

const dry = process.argv.includes('--dry');

/**
 * How far back to look.
 *
 * A day and a half rather than a day: the cron fires at a fixed hour, feeds
 * publish at their own, and a 24-hour window drops anything that landed in the
 * gap when a run is late or skipped. The overlap costs nothing because stage 3
 * removes everything already seen.
 */
const WINDOW_HOURS = 36;

/**
 * Ceiling on stories written per run.
 *
 * The score threshold does the real cutting; this is a circuit breaker. If a
 * feed starts republishing its archive, or the curator has an uncharacteristically
 * generous morning, the failure should be a quiet cap rather than two hundred
 * rows at the top of everyone's feed.
 */
const DAILY_CAP = 12;

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

async function collect(): Promise<{ items: FeedItem[]; failed: number }> {
  const cutoff = Date.now() - WINDOW_HOURS * 60 * 60 * 1000;
  const items: FeedItem[] = [];
  let failed = 0;

  for (const feed of FEEDS) {
    try {
      const fetched = await fetchFeed(feed);
      const recent = fetched.filter((item) => Date.parse(item.publishedAt) >= cutoff);
      items.push(...recent);
      console.log(`ok     ${feed.id.padEnd(24)} ${recent.length}/${fetched.length} in window`);
    } catch (error) {
      const message = (error as Error).message;
      failed += 1;
      if (!dry) await recordRun(feed.id, 'failed', 0, 0, message);
      // One dead feed must not cost us the other nineteen. The run log is
      // where a feed that has been quietly 404ing for a week becomes visible.
      console.error(`FAIL   ${feed.id.padEnd(24)} ${message}`);
    }
  }

  return { items, failed };
}

/** Same article from two feeds: keep the earliest, which is usually the source. */
function dedupe(items: FeedItem[]): FeedItem[] {
  const byUrl = new Map<string, FeedItem>();

  for (const item of items) {
    const existing = byUrl.get(item.url);
    if (!existing || Date.parse(item.publishedAt) < Date.parse(existing.publishedAt)) {
      byUrl.set(item.url, item);
    }
  }

  return [...byUrl.values()];
}

async function main() {
  const { items, failed } = await collect();
  const candidates = dedupe(items);
  console.log(`\n${candidates.length} candidates from ${FEEDS.length - failed} live feeds`);

  const seen = await findExistingUrls(candidates.map((item) => item.url));
  const fresh = candidates.filter((item) => !seen.has(item.url));
  console.log(`${fresh.length} not already in the database`);

  if (fresh.length === 0) {
    console.log('\nnothing new to judge');
    return;
  }

  const curated = await curate(fresh);
  console.log('');
  reportUsage();
  console.log(`\n${curated.length} stories ready\n`);

  const byUrl = new Map(fresh.map((item) => [item.url, item]));
  const selected = curated.slice(0, DAILY_CAP);

  const rows: StoryRow[] = selected.flatMap((story) => {
    const item = byUrl.get(story.url);
    return item ? [{ ...story, sourceName: item.sourceName, publishedAt: item.publishedAt }] : [];
  });

  for (const row of rows) {
    console.log(`${String(row.score).padStart(3)}  ${row.category.padEnd(13)} ${row.title}`);
    console.log(`     ${row.summary}`);
  }

  if (curated.length > selected.length) {
    console.log(`\n(${curated.length - selected.length} over the daily cap of ${DAILY_CAP}, not written)`);
  }

  if (dry) {
    console.log('\n--dry: nothing written');
    return;
  }

  const written = await writeStories(rows);

  // Attribute writes back to the feed that surfaced each story, so the run log
  // answers "which feeds are actually earning their place on the list".
  const writesByFeed = new Map<string, number>();
  for (const row of rows) {
    const feedId = byUrl.get(row.url)?.feedId;
    if (feedId) writesByFeed.set(feedId, (writesByFeed.get(feedId) ?? 0) + 1);
  }
  const foundByFeed = new Map<string, number>();
  for (const item of candidates) {
    foundByFeed.set(item.feedId, (foundByFeed.get(item.feedId) ?? 0) + 1);
  }
  for (const [feedId, found] of foundByFeed) {
    await recordRun(feedId, 'ok', found, writesByFeed.get(feedId) ?? 0);
  }

  // The daily proof is the highest-scoring story of the morning — but only if
  // the day is still open. A day that already has one was either set by an
  // earlier run or picked by hand, and neither should be overwritten.
  const date = todayISO();
  if (rows.length > 0 && !(await hasFeaturedStory(date))) {
    await featureStory(rows[0].url, date);
    console.log(`\nfeatured: ${rows[0].title}`);
  }

  console.log(`\n${written} stories written, ${failed} feeds failed`);
  if (failed > 0) process.exitCode = 1;
}

void main();
