# Humanitas

Verified proof that humanity is improving — a daily positive-progress story, a
browsable feed of good news with sources, and the long-run metrics that rarely
make headlines because they move slowly.

Expo SDK 57 · React Native 0.86 · expo-router · Supabase

## Setup

### 1. Environment

```sh
cp .env.example .env
```

Both values ship inside the app bundle and are not secrets — Row Level Security
is what protects the data. Never put the `service_role` key here.

> Env vars are inlined at bundle time. After editing `.env` you must restart
> with `npx expo start --clear`; a hot reload will not pick up the change.

### 3. Run

```sh
npx expo start --clear
```

## Structure

```
src/
  app/                    file-based routes
    _layout.tsx           session provider + Stack.Protected auth gate
    (auth)/               sign-in, sign-up — shown only when signed out
    (tabs)/               Today, Feed, Progress, You — shown only when signed in
    story/[id].tsx        story detail, save, mark-as-read
  api/                    Supabase queries, one module per domain
  components/             presentational components
  constants/              theme tokens, category metadata
  hooks/                  useAsync, useTheme, useGradients
  lib/                    supabase client, session context, formatting
  types/database.ts       schema types (regenerate with supabase gen types)
supabase/                 schema.sql, seed.sql
docs/widget.md            iOS widget plan — not built yet, see below
```

Routing is gated by `Stack.Protected` in [src/app/_layout.tsx](src/app/_layout.tsx):
signed-out users can only reach `(auth)`, signed-in users can only reach
`(tabs)`. Sign-in and sign-out need no manual navigation — flipping the session
swaps the navigator.

## Not yet built

- **Home screen widget.** Requires a native WidgetKit target and a development
  build; it cannot work in Expo Go. See [docs/widget.md](docs/widget.md) for the
  full approach.
- **Story ingestion.** The feed reads whatever is in the `stories` table. There
  is no job pulling positive news from the web yet — a Supabase Edge Function on
  a cron schedule is the natural home for it, since it needs API keys that must
  not ship in the app.
- **Password reset**, avatar upload, and push notifications.

## Building for the App Store

```sh
eas build --platform ios --profile production
eas submit --platform ios
```
