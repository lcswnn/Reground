# News layer — feeds + curation

Fills the `stories` table the app reads. Runs once a day from the same workflow
as the metrics refresh, as a separate job.

Kept apart from `data-layer/` on purpose. That layer's README opens by promising
every number has a traceable lineage back to a structured source, and nothing in
it touches news articles or LLMs. This layer is the other kind of thing
entirely: an editorial judgement, made by a model, over prose. Mixing them would
quietly cost the metrics pipeline that guarantee.

## The pipeline

```
20 RSS/Atom feeds  →  window to 36h  →  drop what's already stored  →  curate  →  upsert
```

Stage three sits before the model, not after, and that ordering is most of the
cost control: roughly two thirds of any morning's feed items were already judged
on a previous run, and paying to re-read them buys nothing.

| Stage | Where | Notes |
|---|---|---|
| allowlist | `src/config/feeds.ts` | The editorial position, in the repo, changed by PR |
| fetch + parse | `src/feed.ts` | RSS 2.0, RDF, and Atom in one path |
| dedupe key | `src/url.ts` | Query string and fragment stripped — the same article arrives with fresh `utm_*` tags daily |
| curation | `src/curate.ts` | One `claude-opus-5` call per 40 candidates, JSON-schema constrained |
| write | `src/storage/supabase.ts` | `upsert` on `source_url`; re-running a day is a no-op |

## Commands

```sh
npm run news:preview            # fetch every feed, report health, no DB, no model, no cost
npm run news:refresh -- --dry   # full judgement, prints what it would write
npm run news:refresh            # write
npm test                        # feed parser + URL canonicalisation
```

Run `news:preview` after touching the allowlist. It is the only thing that
catches the way this pipeline actually rots — an outlet moves CMS, drops its
RSS, or starts 403ing bots, and none of that surfaces anywhere the app can see.
Four of the twenty feeds in the first draft were already dead.

## Environment

```
SUPABASE_URL=                 # or EXPO_PUBLIC_SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY=    # required: RLS blocks writes from the anon key
ANTHROPIC_API_KEY=            # required by the curator; not needed for news:preview
```

`.env.news-layer` holds the Anthropic key; the Supabase pair is read from
`.env` and `.env.data-layer`, since both layers write to the same database
under the same role.

## The bar

`SCORE_THRESHOLD = 60` in `src/curate.ts`, with a `DAILY_CAP` of 12. That lands
around six to twelve stories a day. The threshold is the tuning dial; the cap is
a circuit breaker for the morning a feed republishes its archive.

The prompt is written to be hard to please — measured outcomes only, and it
explicitly rejects pledges, targets, "may/could/suggests" hedging, mouse
studies, product launches, and feel-good human interest with no number in it. If
the feed starts filling with fluff, the prompt is the thing to change before the
threshold.

## Cost

One request per 40 candidates, roughly 100 candidates a day of which ~35 are new
after dedupe — so one or two calls, a few thousand tokens each. Pennies a day at
Opus pricing. `effort: 'medium'` is set on the call; judging a headline against
a stated bar does not reward deep deliberation.

## Two things about feeds that cost me time

**A feed that parses cleanly and yields nothing looks identical to a quiet news
day.** Freethink's `/feed` 301s to an HTML page, which the XML parser accepts
without complaint and returns zero items from. `news:preview` prints
`parsed, but no usable items` for exactly this case rather than a bare `0`.

**Atom entries carry several `<link>` elements.** `rel="replies"` is the comment
thread and `rel="enclosure"` is an image; taking the first one lands on the
wrong page about a third of the time. `atomLink` looks for `rel="alternate"`
first.

## Schema

`supabase/migrations/0001_news_ingest.sql` adds the unique index on
`stories.source_url` that the upsert requires, plus a `news_runs` log mirroring
`ingest_runs`. Run it once before the first `news:refresh`.
