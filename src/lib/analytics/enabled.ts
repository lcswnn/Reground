/**
 * The master switch, off.
 *
 * One constant, checked in one place — `supabase()` returns `null` when this is
 * false, and null is the state the whole of `src/lib/analytics/` was already
 * written to survive, because it is what a build with no env keys produces. So
 * flipping this does not disable a feature so much as put the app back into a
 * configuration it already handles: no sign-in, no install row, no session
 * rows, no purchase rows, and nothing on screen any different.
 *
 * ## Why it is gated at the client rather than at the four call sites
 *
 * Because the call sites will grow and this will not. A check in
 * `recordSession`, `startAnalytics`, `recordPurchase` and `readPurchases` is
 * four things to remember when a fifth writer is added; a check in the one
 * function that hands out the client is a thing that cannot be forgotten.
 *
 * ## What it does not do
 *
 * It is not the user's switch and it does not touch their data. Turning this off
 * stops this build from writing anything new — it does not delete what is
 * already in the database, and it does not flip `shares_data` on any install
 * row. Those are `DataSharingRow`'s job, on the phone, at the user's choosing.
 *
 * It also leaves the queue alone. A session recorded before this was switched
 * off stays on that phone, unsent, and would flush if it were switched back on.
 * Nothing accumulates while it is false, because `recordSession` never reaches
 * the queue: the client is null, so `ensureInstall` returns null and `flush`
 * gives up before touching storage.
 *
 * ## Turning it back on
 *
 * Set this to `true` and rebuild. The server side is already in place and needs
 * nothing — the migrations are run, the trigger that was breaking sign-ins is
 * gone, and the tables have the rows from the test run in them. Worth clearing
 * those out first if you want a clean baseline:
 *
 *   delete from public.app_sessions;
 *   delete from public.app_installs;
 *   delete from auth.users where is_anonymous;
 */
export const ANALYTICS_ENABLED = false;
