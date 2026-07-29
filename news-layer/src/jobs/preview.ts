/**
 * Feed health check. No database, no model, no cost.
 *
 *   npx tsx news-layer/src/jobs/preview.ts
 *
 * Exists because the allowlist is the one part of this pipeline that rots on
 * its own: outlets move to a new CMS, drop their RSS, or start 403ing bots, and
 * none of that shows up as an error anywhere the app can see. Run this after
 * touching `config/feeds.ts`, and occasionally when the feed looks thin.
 */

import '../env.js';

import { FEEDS } from '../config/feeds.js';
import { fetchFeed } from '../feed.js';

const WINDOW_HOURS = 36;

async function main() {
  const cutoff = Date.now() - WINDOW_HOURS * 60 * 60 * 1000;
  let live = 0;
  let total = 0;

  for (const feed of FEEDS) {
    try {
      const items = await fetchFeed(feed);
      const recent = items.filter((item) => Date.parse(item.publishedAt) >= cutoff);
      live += 1;
      total += recent.length;

      console.log(`\nok     ${feed.id}  ${recent.length}/${items.length} in the last ${WINDOW_HOURS}h`);
      for (const item of recent.slice(0, 3)) {
        console.log(`       ${item.title}`);
      }
      // A feed that parses but yields nothing recent is the ambiguous case:
      // either a quiet week or a date format we are misreading. Say so rather
      // than letting it look identical to a healthy feed.
      if (items.length > 0 && recent.length === 0) {
        console.log(`       (newest: ${items[0].publishedAt})`);
      }
      if (items.length === 0) {
        console.log('       parsed, but no usable items — check the format');
      }
    } catch (error) {
      console.error(`\nFAIL   ${feed.id}  ${(error as Error).message}`);
    }
  }

  console.log(`\n${live}/${FEEDS.length} feeds live, ${total} items in window`);
}

void main();
