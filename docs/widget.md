# iOS home screen widget

**Status: not built.** This document is the plan, not a description of existing
code. Nothing in `src/` currently talks to a widget.

## Why it isn't scaffolded yet

A home screen widget is not React Native. It is a separate **WidgetKit app
extension**, written in Swift/SwiftUI, that iOS runs in its own process on its
own schedule. Your JS bundle never executes inside it. That means:

- **It cannot run in Expo Go.** Expo Go is a fixed prebuilt app; it has no
  extension target for your widget. You need a development build.
- **It requires native project files.** The project is currently
  [CNG](https://docs.expo.dev/workflow/continuous-native-generation/)-managed —
  `/ios` and `/android` are gitignored and generated on demand. Adding a widget
  means either running `npx expo prebuild` and committing native code, or using
  a config plugin that generates the target for you.
- **The two processes share no memory.** The app writes data; the widget reads
  it later, possibly hours later, with the app not running.

None of this is a blocker — it's just genuinely a separate workstream from the
React Native app, so I did not stub out files that would only look like progress.

## Recommended approach

Use [`@bacons/apple-targets`](https://github.com/EvanBacon/expo-apple-targets),
the config plugin for adding Apple extension targets to an Expo project without
ejecting.

### 1. Install and configure

```sh
npx expo install @bacons/apple-targets
```

Add to `app.json` plugins, and declare an App Group — the shared container that
lets the app and the widget see the same data:

```json
["@bacons/apple-targets", { "appleTeamId": "YOUR_TEAM_ID" }]
```

```json
"ios": {
  "entitlements": {
    "com.apple.security.application-groups": ["group.com.lucaswaunn.humanitas"]
  }
}
```

### 2. Create the target

```
targets/
  widget/
    expo-target.config.js   # type: 'widget'
    index.swift             # WidgetKit TimelineProvider + SwiftUI view
    Assets.xcassets
```

### 3. Share data from JS

The widget cannot call Supabase on your behalf using the app's session — it has
no access to the JS runtime or the SQLite-backed auth storage. Two options:

**Option A — app writes, widget reads (simplest).** When the app loads the daily
proof, write it into the shared App Group's `UserDefaults`. The widget reads that
and renders it. The widget shows whatever the app last saw, so it goes stale if
the user doesn't open the app for days.

**Option B — widget fetches directly (fresher).** The widget's
`TimelineProvider` makes its own HTTPS request in Swift. Because the daily proof
is the same for everyone, you can expose it through an unauthenticated Supabase
Edge Function that returns today's featured story — no user session needed in
the widget. This keeps the widget fresh even if the app hasn't been opened.

Option B is the better product; Option A is the faster first version.

### 4. Build and test

```sh
eas build --profile development --platform ios
```

Widgets only appear on a real device or simulator running a dev/production
build. `npx expo start` alone will never show one.

## Scheduling reality check

iOS decides when to refresh widgets. `TimelineProvider` requests a refresh
cadence, but the system throttles it based on battery, usage patterns, and how
often the user actually looks at the widget. A "daily proof" widget is a good
fit — asking for roughly one refresh per day is well within what iOS grants.
Do not design anything that needs minute-level freshness.
