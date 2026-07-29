/**
 * Re-examines stored stories for their progress-indicator tag.
 *
 *   npx tsx news-layer/src/jobs/retag.ts             # untagged stories only
 *   npx tsx news-layer/src/jobs/retag.ts --all       # every story
 *   npx tsx news-layer/src/jobs/retag.ts --all --dry # report, change nothing
 *
 * Two occasions call for this, and they want different flags:
 *
 *   a new indicator was added to `data-layer/src/config/metrics.ts` — the
 *   default is enough, since only stories that found no home before can gain
 *   one, and everything already tagged keeps its tag;
 *
 *   the tagging guidance was loosened or rewritten — use `--all`, because
 *   stories judged under the old wording may now belong somewhere else
 *   entirely, including ones that are already tagged.
 *
 * Deliberately not part of the daily refresh. Retagging is a migration, run
 * deliberately when the rules change, not a thing that quietly rewrites history
 * every morning.
 */

import '../env.js';

import { reportUsage, tagStories } from '../curate.js';
import { readStoriesForTagging, setStoryMetric } from '../storage/supabase.js';

const dry = process.argv.includes('--dry');
const all = process.argv.includes('--all');

/** Bounded so a large archive doesn't become one enormous request. */
const CHUNK = 40;

async function main() {
  const stories = await readStoriesForTagging(!all);
  console.log(`${stories.length} stories to examine${all ? '' : ' (untagged only)'}`);

  if (stories.length === 0) return;

  let changed = 0;

  for (let index = 0; index < stories.length; index += CHUNK) {
    const chunk = stories.slice(index, index + CHUNK);
    const assigned = await tagStories(chunk);

    for (const [position, story] of chunk.entries()) {
      const next = assigned[position];
      if (next === story.metricId) continue;

      const from = story.metricId ?? '—';
      console.log(`${from.padEnd(20)} → ${(next ?? '—').padEnd(20)} ${story.title}`);
      changed += 1;

      if (!dry) await setStoryMetric(story.id, next);
    }
  }

  console.log('');
  reportUsage();
  console.log(`\n${changed} tags ${dry ? 'would change' : 'changed'}`);
}

void main();
