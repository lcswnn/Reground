# The random id, and the two things it carries

One row per install, one row per finished session, one row per purchase. That is
all of it. The schema is a single file — `migrations/0001_app_analytics.sql` —
and it is commented at length; this is the operator's side of it.

## Turning it on

Three steps, in order. Until all three are done the app behaves exactly as it did
before any of this existed: it signs in, fails, records nothing, and says nothing
about it on screen.

1. **Enable anonymous sign-ins.** Dashboard → Authentication → Sign In /
   Providers → *Anonymous sign-ins*. Every id in these tables is an
   `auth.users` row created by `signInAnonymously()`, so with this off there are
   no ids to key anything on.
2. **Run the migration.** Paste `migrations/0001_app_analytics.sql` into the SQL
   editor, or `supabase db push`. It is idempotent — every statement is
   `if not exists` or `or replace` — so re-run it freely after an edit.
3. **Check the app's env.** `EXPO_PUBLIC_SUPABASE_URL` and
   `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in `.env`, which the artifact fetch
   already uses. No new variables, and nothing here needs the service role.

Nothing on the phone needs a rebuild — no native module was added.

## What actually gets sent

Per install, once and then updated on launch: the id, `created_at`,
`last_seen_at`, platform, app version, OS version, and whether the switch is on.

Per finished session: the two mood ratings, the category / topic / game / last-
thing **ids**, whether the reactivation cue was skipped, when it started and
ended, and the app version.

That list is enforced by a test rather than by good intentions — see
`src/lib/analytics/row.test.ts`, which asserts the exact set of keys and that no
on-screen label sneaks in beside its id.

What is **not** sent, and why it is worth listing:

- **No country.** The crisis picker tells the user their answer "stays on this
  phone" (`REGION_PICKER.lead`). There is no column for it. If one ever appears,
  that sentence has to change first.
- **No name, email, account, device id, IP column, or free text.** There is no
  text field anywhere in this app, so there is nothing typed to send.
- **Nothing at all before the user has been shown the switch.** The first launch
  registers no install; see `startAnalytics`.

## The switch

Default on. It lives in the ⓘ sheet on every screen, and it is put in front of
the user once, on the door, in a panel with one button — `DataSharingSheet`.

Turning it off is retroactive: the phone deletes its own `app_sessions` rows
(there is a delete policy for exactly that) and flips `shares_data` to false.
Purchases and the install row stay, so a purchase can still be restored.

**If this ever ships to the EU or UK**, "default on" is not lawful for analytics
consent and the panel has to become a real two-button question. The change is
small and is written down where it would be made: `DEFAULT_SHARES` in
`src/lib/analytics/consent.tsx`.

**Before the next App Store submission**, the privacy nutrition label needs
updating: this now collects a *User ID* (the install id) and *Product
Interaction* / *Other Usage Data*, linked to that id, used for App Functionality
and Analytics. It is a form in App Store Connect, not code, and an inaccurate one
is a rejection.

## Reading the report

Four views, in a `reports` schema that PostgREST cannot see — Supabase exposes
`public` and `graphql_public` only, so these are reachable from the SQL editor
and from the service role, and not from the app. Aggregates are answers about
everybody, and no install should be able to ask them.

```sql
-- What helps, ranked. The number to read is avg_mood_drop: how far the rating
-- fell, on the 0–10 scale, between the two questions.
select * from reports.what_helps_by_game;

-- The same question asked of what they arrived with, rather than what they did.
select * from reports.what_helps_by_category;

-- Who takes the offer of one last thing. Note the caveat in the view's own
-- comment: /one-more happens after the second rating, so this is uptake, not
-- effect.
select * from reports.one_more_uptake;

-- The plainest question there is.
select * from reports.daily_activity limit 30;

-- And the raw pairs, if you want to do your own arithmetic.
select * from reports.session_outcomes order by ended_at desc limit 100;
```

`share_meaningfully_better` counts sessions that dropped by at least 2 points,
which is `MEANINGFUL_MOOD_DROP` in `src/config/session.ts` — one point on a
self-report scale is inside the margin of answering it differently the second
time. If that constant moves, move the `>= 2` in the views with it.

Two things to hold in mind before believing any of it:

- **A reinstall is a new person.** There is no identifier that survives deleting
  an app, and we are not going looking for one.
- **Nobody was assigned anything.** Users pick their own game, so a game that
  looks good may simply be the one people in less distress choose. `avg_mood_before`
  is in the view for that reason — read it beside the drop.

## Housekeeping

Supabase does not clean up anonymous users, so an install that signed in once and
never came back leaves an `auth.users` row forever. There is a `delete` at the
foot of the migration, left as a comment: run it occasionally, or don't — the
rows are tiny.

## Purchases

`app_purchases` is wired but nothing calls it yet: `usePremiumAccess` is still a
hard-coded `false`. Read the warning on the table before that changes — a row
there is written by a phone under a policy that only checks whose row it is, so
it records a claim and proves nothing. The paywall wants `verified_at`, and only
an Edge Function holding the service role may set it. `src/lib/analytics/purchases.ts`
has the four steps written out.
