# iOS home screen widget

**Status: built.** The target lives in `targets/widget/`, and
`@bacons/apple-targets` generates a real WidgetKit extension from it at prebuild.

## What it shows

- **Small** — the composite score, the progress bar, and the day's indicator.
- **Medium** — the same, plus that indicator's current value and its computed
  delta ("↓ 5.6 pts since 1990").

## The thing that made this simple

An earlier version of this document recommended building an unauthenticated
Supabase Edge Function so the widget could fetch without a user session. That is
no longer necessary and was never built: the humanity artifact is already a
**public static JSON** on Supabase Storage, so the extension's `TimelineProvider`
fetches it directly with `URLSession`.

The consequences are worth stating, because they are the whole reason this
widget is cheap to own:

- **No App Group.** The usual widget architecture shares a container because the
  extension cannot reach the app's session. This one has nothing to share.
- **No write path from JS.** Nothing in `src/` knows the widget exists.
- **It never goes stale.** The widget is correct after a fortnight of the app
  going unopened, which is precisely the case a widget exists to serve.

## What is duplicated, and why that is contained

Swift cannot import the app's TypeScript, so two small things are reimplemented
in `index.swift`:

- `formatValue` mirrors `formatMetricValue` in `src/api/humanity.ts`. If a unit
  case changes there, change it here.
- `metricOfDay` mirrors the _metric_ half of `selectDailyCard` — sort by id, index
  by days since the epoch.

Deliberately **not** duplicated: the six framing angles. The widget shows the
indicator and the artifact's own precomputed `delta` string rather than a
generated headline. This means that on days when the app's fallback scan skips to
a different metric — which happens when no framing fits that indicator's series —
the widget and the card name different indicators. Both are individually correct,
and closing that gap would mean a second copy of the angle engine to keep in step
forever.

## Gotchas already hit

- **`ios.appleTeamId` is required** in `app.json`. Without it the plugin warns and
  silently generates no target at all — you get a `WidgetKit.framework` reference
  and an `Info.plist`, but no `PBXNativeTarget`, and nothing to run.
- **The target name must differ from the app's.** Xcode derives each target's
  intermediates path from its name, so two targets called `Mellova` compile
  their asset catalogs to the same directory and the build fails with "multiple
  commands produce conflicting outputs". The gallery name comes from
  `configurationDisplayName` in Swift, not the target name.
- **`deploymentTarget: '17.0'`**, because `containerBackground(for: .widget)` does
  not exist below it — and from iOS 17 a widget that fails to declare a container
  background renders blank rather than merely unstyled.
- **Top-level `private` types cannot appear in internal declarations.** `Artifact`
  is internal for exactly this reason.

## Build and test

```sh
npx expo prebuild -p ios
npx expo run:ios
```

Then long-press the home screen → **+** → search "Mellova". Widgets never
appear under `npx expo start` alone; they need a real build.

## Scheduling reality check

iOS decides when to refresh widgets. The timeline asks for one every six hours —
already four times more often than the daily artifact can change, so the extra
attempts exist to recover from a failed fetch rather than to chase freshness. The
system throttles this based on battery, usage, and how often the widget is
actually looked at. Do not design anything needing minute-level freshness.
