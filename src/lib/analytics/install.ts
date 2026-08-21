/**
 * The random id, and everything that has to happen once per install to get one.
 *
 * It is an anonymous Supabase auth user: `signInAnonymously()` creates a real
 * `auth.users` row with a server-issued uuid and hands back a JWT, and that uuid
 * is the id for the life of the installation. `app_installs` then gets a row
 * with the same id and three facts about the build.
 *
 * Why an auth user rather than a uuid the phone makes up is argued at the top of
 * `supabase/migrations/0001_app_analytics.sql`. The short version: an id the
 * client picks is an id the client can pick again as somebody else's, which is
 * fine for counting sessions and useless the moment a purchase hangs off it.
 *
 * ## It needs a switch thrown in the dashboard
 *
 * Authentication → Sign In / Providers → **Anonymous sign-ins**. With it off,
 * every call in here fails, `ensureInstall` returns `null` for the rest of the
 * launch, and the app behaves exactly as it did before any of this existed.
 * That is the intended failure and it is silent on purpose — there is no screen
 * in this app that a message about analytics would be an improvement to.
 *
 * ## What it does and does not survive
 *
 * Survives: relaunches, updates, losing the network, the app being killed.
 * Does not survive: deleting the app, or "reset" on a device that clears app
 * storage. That is inherent to any honest install id — the alternative is a
 * hardware identifier, which is what the platforms took away and were right to.
 * A reinstall is a new person as far as this is concerned, and a report should
 * be read knowing that.
 */

import { Platform } from 'react-native';
import Constants from 'expo-constants';

import { supabase } from '@/lib/supabase';

/**
 * The whole bootstrap, memoised as a promise rather than as a value.
 *
 * Two things can ask for the id at once — the launch calls it to say hello and a
 * session ending calls it to write a row — and without this they would race into
 * two `signInAnonymously()` calls and two auth users, one of which would be
 * orphaned immediately. Sharing the promise means the second caller waits on the
 * first rather than repeating it.
 */
let pending: Promise<string | null> | null = null;

/**
 * The id for this install, signing in first if this is the first time.
 *
 * Null means "not available", which covers a build with no keys, the dashboard
 * switch being off, no network, and the anonymous sign-in rate limit — Supabase
 * caps these at 30 an hour per IP by default, which a single phone will never
 * reach and a lecture theatre on one NAT might. Every caller treats null as
 * "record nothing this time"; the queue keeps the row and tries again later.
 */
export function ensureInstall(): Promise<string | null> {
  pending ??= bootstrap().catch(() => null);

  return pending;
}

async function bootstrap(): Promise<string | null> {
  const client = supabase();
  if (!client) return null;

  const { data: existing } = await client.auth.getSession();
  let userId = existing.session?.user.id ?? null;

  if (!userId) {
    const { data, error } = await client.auth.signInAnonymously();
    if (error) return null;

    userId = data.user?.id ?? null;
  }

  if (!userId) return null;

  /**
   * Upsert rather than insert: this runs on every launch, and the row already
   * exists on all but the first. `last_seen_at` is the reason it runs at all —
   * without it there is no way to tell an install that stopped opening the app
   * from one that never existed, which is half of what a retention number is.
   *
   * `created_at` is deliberately not in the payload. The column defaults on
   * insert and must not be moved by an update, or every install looks new.
   */
  const { error } = await client.from('app_installs').upsert(
    {
      id: userId,
      last_seen_at: new Date().toISOString(),
      platform: Platform.OS,
      app_version: appVersion(),
      os_version: String(Platform.Version),
    },
    { onConflict: 'id' },
  );

  // A failed hello is not a failed install. The id is real either way, the row
  // will be written by the next launch or by the first session that records,
  // and there is nothing on screen this could usefully change.
  if (error) return userId;

  return userId;
}

/** The version in `app.json`, which is what a report groups builds by. */
export function appVersion(): string | null {
  return Constants.expoConfig?.version ?? null;
}

/**
 * Mirrors the switch onto the install row.
 *
 * The phone is the authority on this — it simply stops sending — so this is an
 * audit trail rather than a control. It matters for exactly one thing: a report
 * that wants to count how many people turned it off has to be able to see them.
 */
export async function setSharedFlag(shares: boolean): Promise<void> {
  const client = supabase();
  if (!client) return;

  const id = await ensureInstall();
  if (!id) return;

  await client.from('app_installs').update({ shares_data: shares }).eq('id', id);
}

/**
 * What the switch does when it goes off: everything already sent, deleted.
 *
 * Sessions only. The install row stays, marked as not sharing, and so do any
 * purchases — losing those would mean somebody who declined analytics also lost
 * the thing they paid for, which is a punishment for reading a settings row. It
 * holds a uuid, a platform and a version string and is what a restore would have
 * to be found by.
 *
 * The auth session is kept for the same reason. Signing out would strand the
 * purchases behind an id the phone can no longer prove it owns.
 *
 * Deliberately not awaited by its caller, and deliberately not retried: this is
 * a delete, so the failure mode of trying again later is a queue that keeps
 * trying to erase rows that are already gone. If it fails, the next flip of the
 * switch will do it.
 */
export async function forgetSharedData(): Promise<void> {
  const client = supabase();
  if (!client) return;

  const id = await ensureInstall();
  if (!id) return;

  await client.from('app_sessions').delete().eq('install_id', id);
  await client.from('app_installs').update({ shares_data: false }).eq('id', id);
}
