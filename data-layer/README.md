# Data layer — ingest + nowcast

Produces a single JSON artifact the Expo app consumes. The client never calls
OWID, NOAA, or Ember; it fetches the built artifact and renders it.

Nothing in here touches news articles or LLMs. Every number has a traceable
lineage back to a structured source.

## Three cadences, kept distinct

| | what it means | where it lives |
|---|---|---|
| **source** | how often the upstream number actually changes — mostly annual | `SourceAdapter.sourceUpdateCadence` |
| **refresh** | how often we poll, per source | `SourceAdapter.refreshCadence`, gated by the source's own `nextUpdate` |
| **display** | how often the user-visible number moves — daily | `nowcast()` |

Conflating them is the mistake this design exists to avoid. Polling an annual
series daily is 364 wasted runs and a false impression of freshness.

## Commands

```sh
npm run data:backfill -- --dry   # fetch everything, report, write nothing
npm run data:backfill            # one-shot history load into Supabase
npm run data:refresh             # incremental; skips sources that aren't due
npm run data:preview             # composite from live sources, no database
npm run data:artifact -- --out public/humanity.json
npm test                         # 74 tests
```

Backfill first, then let refresh keep the tail current. Both are idempotent.

## Environment

```
SUPABASE_URL=                 # or EXPO_PUBLIC_SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY=    # required: RLS blocks writes from the anon key
EMBER_API_KEY=                # optional, free: https://ember-energy.org/data/api/
```

Without `EMBER_API_KEY`, renewable share falls back to OWID's annual series
instead of Ember's monthly one. Nothing else degrades.

## Two things about OWID that cost me time

**`csvType=filtered&country=OWID_WRL` does not reliably filter.** On charts whose
saved view is the map tab it ignores the country param entirely and returns every
country at a single year — which parses cleanly and is completely wrong. The
adapter uses `csvType=full` and filters on the ISO code in `csv.ts`, where a
missing World row raises instead of silently yielding zero observations.

**A blocked chart returns HTTP 200 with a JSON error body.** `homicide-rate` is
IHME-sourced and non-redistributable; the response parses as a one-row CSV with a
garbage header unless you check for it. `assertNotJsonError` does.

## Observed vs projected

Every value is tagged. Two ways a point becomes `projected`:

1. The source says so — OWID's *filtered* CSV carries a `__original_year`
   companion column marking carried-forward values.
2. `MetricConfig.observedThroughYear` says so. Needed because the *full* CSV
   drops that marker, and the World Bank poverty series ships nowcasts three
   years past its last survey with nothing left in the payload to detect them
   by. Without the cutoff we would ingest a projection as a measurement and then
   extrapolate from it.

`nowcast()` fits only `observed` points, so we never extrapolate from someone
else's extrapolation.

## The score can go down

This is enforced in two places and tested in both:

- `normalizeMetric` floors at **-0.5**, not 0. A metric that has regressed past
  its own baseline returns a negative number. The floor bounds how far one
  metric can drag the total; it does not stop it dragging.
- `nowcast` follows the slope it is given. A falling trailing window projects
  downward, past zero if that is where the line goes. No flooring at the last
  observed value, no `Math.abs`, no optimism term.

As of the last run, three of thirteen metrics are negative contributors.

## Adding a source

Implement `SourceAdapter`, add one line to `STANDALONE` in
`adapters/registry.ts`, point a metric's `sourceAdapterId` at it. OWID-backed
metrics need nothing here at all — the registry builds those from
`config/metrics.ts`.
