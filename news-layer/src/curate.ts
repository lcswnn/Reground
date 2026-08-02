import Anthropic from "@anthropic-ai/sdk";

import { METRICS } from "../../data-layer/src/config/metrics.js";
import { CATEGORY_VALUES } from "./categories.js";
import type { CuratedStory, FeedItem } from "./types.js";

/**
 * The editorial step, in two stages against two models.
 *
 * Stage 1 reads the whole morning — around a hundred headlines — and answers
 * one question per candidate: does this clear the bar, and how far. That is
 * rubric-following, not writing, so it runs on Haiku.
 *
 * Stage 2 sees only the survivors, typically ten or fifteen, and does the work
 * that reaches the user: the summary they read instead of the article, the
 * category the feed filters on, and the call on which of two outlets covering
 * the same event to keep. That runs on Opus.
 *
 * The split exists because the two stages have opposite shapes. Stage 1 is
 * ninety percent of the tokens and none of the prose; stage 2 is all of the
 * prose and almost none of the tokens. Running one model over both means either
 * paying Opus rates to reject a Phys.org listicle, or shipping Haiku's prose to
 * users. This way the expensive model never reads a story that was going to be
 * dropped anyway.
 *
 * Both stages are constrained by a JSON schema rather than parsed out of prose.
 * That is what makes `category` safe to write straight into a Postgres column
 * with eight legal values, with no normalisation layer in between.
 */

const TRIAGE_MODEL = "claude-haiku-4-5";
const WRITER_MODEL = "claude-opus-5";

const KNOWN_METRIC_IDS = new Set(METRICS.map((metric) => metric.id));

/** Stage 1: keep-or-drop, by index. No prose — that is stage 2's job. */
interface Verdict {
  id: number;
  keep: boolean;
  score: number;
}

/** Stage 2: the story as the user will see it, plus the duplicate call. */
interface Written {
  id: number;
  publish: boolean;
  summary: string;
  category: string;
  metric_id: string;
  duplicate_of: number;
}

/**
 * Stage 1 batch size.
 *
 * Small enough that the response fits comfortably in `MAX_TOKENS`, large enough
 * that the model is ranking against a real field rather than judging in
 * isolation — a story only looks significant next to the others that arrived
 * the same morning.
 */
const CHUNK = 40;

const MAX_TOKENS = 16_000;

/**
 * Ceiling on how many survivors reach the writer.
 *
 * A hard bound on the expensive stage. Set above `DAILY_CAP` so the duplicate
 * pass has slack to collapse a few without starving the day, but low enough
 * that a feed republishing its archive cannot turn one morning into a bill.
 */
const WRITE_LIMIT = 18;

/**
 * The bar.
 *
 * Set here rather than in the prompt so it is tunable without touching the
 * editorial voice, and so a run is reproducible against a stored score. 60
 * lands at roughly three to five stories a day against the current feed list.
 */
export const SCORE_THRESHOLD = 60;

const TRIAGE_PROMPT = `You are the editor of Mellova, an app that shows people evidence that the world is getting better — and only evidence that holds up.

You are given a morning's worth of headlines from a curated list of outlets. Most of them are not for us. Your job is to decide which are worth publishing, and score them.

Keep a story when it reports a concrete, verifiable improvement in human or planetary wellbeing:
- a measured decline in disease, poverty, hunger, violence, or emissions
- a treatment, vaccine, or technology that has cleared a real milestone (trial results, approval, deployment at scale)
- a law, treaty, or programme that has actually taken effect, with a stated scope
- a species, habitat, or ecosystem that has measurably recovered
- a durable record: renewables share, literacy, child mortality, protected area

Drop a story when:
- it is an announcement of intent — a pledge, a target, a plan, a commitment, a "vows to"
- the finding is hedged into meaninglessness: "may", "could", "suggests", "in mice", "early-stage", "researchers hope"
- it is a product launch, funding round, award, or corporate press release wearing a headline
- it is a feel-good human-interest story with no measurable outcome (a rescued dog, a kind stranger, a local fundraiser)
- the good news is a smaller decline in something still getting worse, framed as a win
- it is primarily political, and the "progress" depends on agreeing with one side
- it is an opinion piece, explainer, listicle, correction, or retrospective rather than news

Be hard to please. A day where you keep three stories is a good day. A day where you keep twenty means you have lowered the bar.

Score 0-100 on how much the story would genuinely change a well-informed reader's sense of how things are going. Global and measured scores high; local and anecdotal scores low. Use the full range, and score every story you drop below 40.

Return a verdict for every candidate. Do not write summaries — a later step does that.`;

const WRITER_PROMPT = `You are the editor of Mellova, an app that shows people evidence that the world is getting better. The stories below passed a first, deliberately generous screen. Your job is to make the final call on each, write the survivors up, and catch duplicate coverage.

Set publish to false when a story does not hold up on a second read:
- the outcome is real but local or small — one hospital, one town, one volunteer group, one season
- the number is impressive only because the base is tiny
- it is a nice thing that happened rather than evidence the world is improving
- on reflection it is a pledge, a plan, an early-stage finding, or a press release

Roughly three to six stories a day should survive this. If you are publishing ten, you are being too generous. Judge each story on its own merits, not against a quota.

For each story, write a summary of one or two sentences, in your own words, for a reader who will not open the link. Lead with the concrete outcome and its scale — the number, the population, the place. No preamble, no "this article discusses", no rhetorical questions, no exclamation marks. Do not simply reword the headline.

Assign exactly one category. The hint attached to each story is what its outlet usually covers — override it whenever the story itself says otherwise.

Several outlets often report the same event. When a story reports the same underlying news as an earlier entry — the same study, the same milestone, the same announcement, the same measurement — set duplicate_of to that earlier entry's id. Two stories on the same topic are not duplicates unless they report the same specific event. Set duplicate_of to -1 when the story is the first or only coverage of its event.

Write a summary for every story you publish, including ones you mark as duplicates. Leave summary empty for stories you do not publish.`;

/**
 * The tracked-indicator half of the writer prompt, built from the live config.
 *
 * Rendered from `METRICS` rather than written out here, and paired with an enum
 * generated from the same array, so adding a fourteenth indicator to
 * `data-layer/src/config/metrics.ts` is the entire change: the prompt learns
 * about it, the schema starts accepting it, and the app resolves its label from
 * the daily artifact. Nothing in this file needs touching.
 */
function metricGuidance(): string {
  const listing = METRICS.map((metric) => {
    const direction =
      metric.direction === "lower_is_better"
        ? "lower is better"
        : "higher is better";
    return `- ${metric.id}: ${metric.label} (${direction}, measured in ${metric.unit})`;
  }).join("\n");

  return `The app also tracks a set of long-run indicators of human progress. Set metric_id to the indicator a story belongs with, so a reader following that indicator can see the news behind the line on its chart.

${listing}

Tag generously. A story does not have to report a change in the measurement itself — the forces that move an indicator belong with it too. Falling solar manufacturing costs, a grid milestone, and a new wind build all belong with electricity from renewables. A malaria vaccine rollout, a new treatment reaching approval, and a country eliminating a disease all belong with child mortality or life expectancy, whichever it bears on more directly. A literacy programme reaching a million children belongs with adult literacy. If you can explain in one sentence why this story is part of that indicator's story, tag it.

Set metric_id to "" only when nothing on the list genuinely fits — a wildlife recovery, a rights ruling, or an archaeological find has no home among these, and an honest blank is better than a stretch. When two indicators fit, pick the one the story bears on most directly.

Never invent an id. Use one from the list exactly as written, or "".`;
}

const TRIAGE_SCHEMA = {
  type: "object",
  properties: {
    verdicts: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: {
            type: "integer",
            description: "The bracketed index of the candidate.",
          },
          keep: { type: "boolean" },
          score: { type: "integer", description: "0-100." },
        },
        required: ["id", "keep", "score"],
        additionalProperties: false,
      },
    },
  },
  required: ["verdicts"],
  additionalProperties: false,
} as const;

const WRITER_SCHEMA = {
  type: "object",
  properties: {
    stories: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: {
            type: "integer",
            description: "The bracketed index of the story.",
          },
          publish: { type: "boolean" },
          summary: {
            type: "string",
            description:
              "One or two sentences in your own words. Empty when publish is false.",
          },
          category: { type: "string", enum: CATEGORY_VALUES },
          metric_id: {
            type: "string",
            // Generated from the same array the prompt is rendered from, so the
            // model cannot name an indicator that no longer exists — and a new
            // one becomes selectable the moment it is added to the config.
            enum: [...METRICS.map((metric) => metric.id), ""],
            description:
              'Tracked indicator this story counts toward, or "" for none.',
          },
          duplicate_of: {
            type: "integer",
            description:
              "Id of the earlier entry covering the same event, or -1 if none.",
          },
        },
        required: [
          "id",
          "publish",
          "summary",
          "category",
          "metric_id",
          "duplicate_of",
        ],
        additionalProperties: false,
      },
    },
  },
  required: ["stories"],
  additionalProperties: false,
} as const;

/**
 * Token accounting for the run.
 *
 * Printed at the end of every run rather than kept for debugging, because the
 * cost of this pipeline is invisible otherwise — it is spent in CI, on a
 * schedule, against a card. A morning where a feed starts republishing its
 * archive should show up as a number here before it shows up on a bill.
 *
 * Tracked per model, since the whole point of the cascade is that the two cost
 * an order of magnitude apart.
 */
const PRICES: Record<string, { input: number; output: number }> = {
  [TRIAGE_MODEL]: { input: 1, output: 5 },
  [WRITER_MODEL]: { input: 5, output: 25 },
};

const usage = new Map<
  string,
  { input: number; output: number; calls: number }
>();

function record(model: string, response: Anthropic.Message): void {
  const entry = usage.get(model) ?? { input: 0, output: 0, calls: 0 };
  entry.calls += 1;
  entry.input += response.usage.input_tokens;
  entry.output += response.usage.output_tokens;
  usage.set(model, entry);
}

export function reportUsage(): void {
  let total = 0;

  for (const [model, entry] of usage) {
    const price = PRICES[model];
    const dollars =
      (entry.input / 1e6) * price.input + (entry.output / 1e6) * price.output;
    total += dollars;
    console.log(
      `${model.padEnd(16)} ${entry.calls} call${entry.calls === 1 ? " " : "s"}  ` +
        `${entry.input.toLocaleString().padStart(7)} in  ` +
        `${entry.output.toLocaleString().padStart(6)} out  ~$${dollars.toFixed(3)}`,
    );
  }

  console.log(`${"total".padEnd(16)} ~$${total.toFixed(3)}`);
}

let cached: Anthropic | null = null;

function client(): Anthropic {
  if (cached) return cached;
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error(
      "ANTHROPIC_API_KEY is not set — the curator cannot run without it",
    );
  }
  cached = new Anthropic();
  return cached;
}

/** Shared response handling: both stages fail the same three ways. */
function textOf(
  model: string,
  response: Anthropic.Message,
  context: string,
): string {
  record(model, response);

  if (response.stop_reason === "refusal") {
    throw new Error(
      `${context} refused (${response.stop_details?.category ?? "unknown"})`,
    );
  }
  if (response.stop_reason === "max_tokens") {
    // Truncated JSON parses as a short list and silently drops the tail, which
    // is indistinguishable from the editor rejecting those stories. Fail loudly
    // and bring the batch size down instead.
    throw new Error(`${context} hit max_tokens`);
  }

  const block = response.content.find((content) => content.type === "text");
  if (!block || block.type !== "text")
    throw new Error(`${context} returned no text block`);

  return block.text;
}

function describe(item: FeedItem, index: number): string {
  return [
    `[${index}] ${item.title}`,
    `    source: ${item.sourceName}`,
    item.categoryHint ? `    hint: ${item.categoryHint}` : null,
    item.excerpt ? `    excerpt: ${item.excerpt}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

/** Stage 1, one chunk. Returns scores against the chunk's own indices. */
async function triageChunk(items: FeedItem[]): Promise<Map<number, number>> {
  const listing = items.map(describe).join("\n\n");

  const response = await client().messages.create({
    model: TRIAGE_MODEL,
    max_tokens: MAX_TOKENS,
    system: TRIAGE_PROMPT,
    output_config: { format: { type: "json_schema", schema: TRIAGE_SCHEMA } },
    messages: [
      {
        role: "user",
        content: `Today's candidates:\n\n${listing}\n\nReturn a verdict for every candidate, keyed by the bracketed index.`,
      },
    ],
  });

  const parsed = JSON.parse(textOf(TRIAGE_MODEL, response, "triage")) as {
    verdicts: Verdict[];
  };

  const scores = new Map<number, number>();
  for (const verdict of parsed.verdicts) {
    // The schema constrains shape, not semantics: an out-of-range index is
    // still well-formed JSON, and indexing past the end would put `undefined`
    // into a story row.
    if (!items[verdict.id]) continue;
    if (!verdict.keep) continue;
    if (verdict.score < SCORE_THRESHOLD) continue;
    scores.set(verdict.id, verdict.score);
  }

  return scores;
}

/** Stage 2. Writes the survivors up and collapses duplicate coverage. */
async function write(
  survivors: { item: FeedItem; score: number }[],
): Promise<CuratedStory[]> {
  const listing = survivors
    .map(({ item }, index) => describe(item, index))
    .join("\n\n");

  const response = await client().messages.create({
    model: WRITER_MODEL,
    max_tokens: MAX_TOKENS,
    system: `${WRITER_PROMPT}\n\n${metricGuidance()}`,
    output_config: {
      effort: "medium",
      format: { type: "json_schema", schema: WRITER_SCHEMA },
    },
    messages: [{ role: "user", content: `Stories to write up:\n\n${listing}` }],
  });

  const parsed = JSON.parse(textOf(WRITER_MODEL, response, "writer")) as {
    stories: Written[];
  };

  /**
   * Follows `duplicate_of` to the entry that represents the event.
   *
   * Chased rather than read once because the model may point B at A and C at B
   * when all three cover the same announcement. Bounded by the list length so a
   * cycle — B at C and C at B — terminates instead of hanging the run.
   */
  const pointsAt = new Map<number, number>();
  for (const story of parsed.stories) {
    if (story.duplicate_of >= 0 && story.duplicate_of !== story.id) {
      pointsAt.set(story.id, story.duplicate_of);
    }
  }

  function representative(id: number): number {
    let current = id;
    for (let hop = 0; hop < parsed.stories.length; hop += 1) {
      const next = pointsAt.get(current);
      if (next === undefined || !survivors[next]) return current;
      current = next;
    }
    return current;
  }

  /** Best coverage of each event wins, by the score triage already assigned. */
  const best = new Map<number, CuratedStory>();
  let collapsed = 0;

  for (const story of parsed.stories) {
    const survivor = survivors[story.id];
    if (!survivor) continue;
    // Triage was the generous screen; this is where the bar is actually set.
    if (!story.publish) continue;
    if (!story.summary.trim()) continue;

    const curated: CuratedStory = {
      url: survivor.item.url,
      title: survivor.item.title,
      summary: story.summary.trim(),
      category: story.category as CuratedStory["category"],
      score: survivor.score,
      // The enum should make an unknown id impossible, but this is the value
      // that reaches a column the app renders a label from — checking it
      // against the config costs nothing and fails closed to an untagged story.
      metricId: KNOWN_METRIC_IDS.has(story.metric_id) ? story.metric_id : null,
    };

    const key = representative(story.id);
    const existing = best.get(key);
    if (!existing) {
      best.set(key, curated);
      continue;
    }

    collapsed += 1;
    if (curated.score > existing.score) best.set(key, curated);
  }

  if (collapsed > 0)
    console.log(`${collapsed} collapsed as duplicate coverage`);

  return [...best.values()];
}

const TAG_SCHEMA = {
  type: "object",
  properties: {
    assignments: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: {
            type: "integer",
            description: "The bracketed index of the story.",
          },
          metric_id: {
            type: "string",
            enum: [...METRICS.map((metric) => metric.id), ""],
            description:
              'Tracked indicator this story counts toward, or "" for none.',
          },
        },
        required: ["id", "metric_id"],
        additionalProperties: false,
      },
    },
  },
  required: ["assignments"],
  additionalProperties: false,
} as const;

/**
 * Assigns indicators to stories that are already written and stored.
 *
 * Separate from `write` because retagging is not re-curating: these stories
 * were judged and published under whatever prompt was current when they landed,
 * and the only question being reopened is which indicator they belong with.
 * Re-running the whole pipeline would re-judge them against today's bar and
 * quietly rewrite prose the user may already have read.
 *
 * This is the job to reach for after adding an indicator to the config — a new
 * fourteenth metric has no history behind it until something goes back over the
 * stories that predate it.
 */
export async function tagStories(
  stories: { title: string; summary: string }[],
): Promise<(string | null)[]> {
  const listing = stories
    .map((story, index) => `[${index}] ${story.title}\n    ${story.summary}`)
    .join("\n\n");

  const response = await client().messages.create({
    model: WRITER_MODEL,
    max_tokens: MAX_TOKENS,
    system: metricGuidance(),
    output_config: {
      effort: "medium",
      format: { type: "json_schema", schema: TAG_SCHEMA },
    },
    messages: [
      {
        role: "user",
        content: `Assign an indicator to each story, or "" where none fits.\n\n${listing}`,
      },
    ],
  });

  const parsed = JSON.parse(textOf(WRITER_MODEL, response, "retag")) as {
    assignments: { id: number; metric_id: string }[];
  };

  // Indexed by position rather than returned as a list, so a story the model
  // skips keeps its existing tag instead of silently becoming null.
  const assigned: (string | null)[] = stories.map(() => null);
  for (const assignment of parsed.assignments) {
    if (!stories[assignment.id]) continue;
    assigned[assignment.id] = KNOWN_METRIC_IDS.has(assignment.metric_id)
      ? assignment.metric_id
      : null;
  }

  return assigned;
}

/**
 * Runs the whole morning through both stages, highest score first.
 *
 * Chunks run sequentially rather than in parallel. There is no latency budget
 * on a cron job that fires once a day, and one request at a time keeps a rate
 * limit from turning a slow morning into a failed one.
 */
export async function curate(items: FeedItem[]): Promise<CuratedStory[]> {
  const survivors: { item: FeedItem; score: number }[] = [];

  for (let index = 0; index < items.length; index += CHUNK) {
    const chunk = items.slice(index, index + CHUNK);
    const scores = await triageChunk(chunk);
    for (const [id, score] of scores)
      survivors.push({ item: chunk[id], score });
  }

  console.log(
    `${survivors.length} survived triage (score >= ${SCORE_THRESHOLD})`,
  );
  if (survivors.length === 0) return [];

  // Sorted before the cut so the ceiling drops the weakest survivors rather
  // than whichever ones happened to arrive in the last chunk.
  survivors.sort((a, b) => b.score - a.score);
  const written = await write(survivors.slice(0, WRITE_LIMIT));

  return written.sort((a, b) => b.score - a.score);
}
