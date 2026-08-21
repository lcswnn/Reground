/**
 * Somewhere for a purchase to be written down, ready for the day there is one.
 *
 * Nothing calls this yet. `usePremiumAccess` in `session/games/premium.ts` is
 * still a hard-coded `false` and the locked cards still cannot be tapped, which
 * is the only honest version of a paywall with no store client behind it. What
 * this file changes is that the *identity* half of the problem is now solved:
 * there is a stable random id per install, issued by the server, and a table
 * keyed on it.
 *
 * ## Read this before wiring it to the paywall
 *
 * A row here is a record, not an entitlement. It is written by the phone, under
 * a policy that only checks whose row it is, so it says "this install claims it
 * bought X" and nothing stronger. Treating it as proof would mean a paywall that
 * anybody can walk through by inserting a row with the publishable key that
 * ships in the bundle.
 *
 * The missing half is verification, and it belongs on the server:
 *
 *  1. The phone finishes a purchase and gets a receipt / purchase token.
 *  2. It calls a Supabase Edge Function with it.
 *  3. That function — holding the service role, which is the only thing that may
 *     write `verified_at` — checks the receipt against Apple's or Google's
 *     endpoint and stamps the row.
 *  4. `usePremiumAccess` reads rows where `verified_at is not null`.
 *
 * Until step 3 exists, call `recordPurchase` for the bookkeeping and keep the
 * entitlement wherever the store client puts it.
 *
 * ## It ignores the sharing switch, and that is deliberate
 *
 * Every other write in this folder is analytics and stops the moment somebody
 * turns the switch off. A purchase is not analytics. It is the record of a
 * transaction they entered into, it is what a restore has to find, and losing it
 * because they declined to share mood ratings would be a punishment for reading
 * a settings row. The copy on the switch says as much — see `DATA_SHARING.off`.
 */

import { Platform } from 'react-native';

import { supabase } from '@/lib/supabase';
import { ensureInstall } from '@/lib/analytics/install';

export interface Purchase {
  /** The store's product identifier, as configured in App Store Connect / Play. */
  productId: string;
  /**
   * The store's own id for this transaction. Optional only because a store
   * client may not surface one for a restore; supply it whenever there is one,
   * because it is the unique key that stops a retry becoming a second row.
   */
  transactionId?: string;
  /** When the store says it happened. Defaults to now. */
  purchasedAt?: Date;
  /** Sandbox purchases are real rows and must not be counted as revenue. */
  environment?: 'production' | 'sandbox';
}

/** Which store this build buys from. */
function store(): 'app_store' | 'play_store' {
  return Platform.OS === 'android' ? 'play_store' : 'app_store';
}

/**
 * Writes the purchase down. Never throws, and never blocks the flow that is
 * handing the user what they bought.
 *
 * Returns whether the row landed, for a caller that wants to retry — unlike a
 * session, a purchase is not queued. A queue would need to survive a reinstall
 * to be worth anything here, and the thing that actually survives a reinstall is
 * the store's own restore flow, which is where a lost row should be recovered
 * from.
 */
export async function recordPurchase(purchase: Purchase): Promise<boolean> {
  const client = supabase();
  if (!client) return false;

  const installId = await ensureInstall();
  if (!installId) return false;

  const { error } = await client.from('app_purchases').insert({
    install_id: installId,
    product_id: purchase.productId,
    store: store(),
    transaction_id: purchase.transactionId ?? null,
    purchased_at: (purchase.purchasedAt ?? new Date()).toISOString(),
    environment: purchase.environment ?? 'production',
  });

  // A duplicate is a success: `unique (store, transaction_id)` is what makes a
  // retry safe, so hitting it means the row is already there.
  if (error) return error.code === '23505';

  return true;
}

/**
 * Every purchase this install has recorded.
 *
 * For a restore screen and for `usePremiumAccess` once verification exists. Note
 * again what `verified_at` means: filter on it before letting anything in here
 * unlock a feature.
 */
export async function readPurchases(): Promise<
  { product_id: string; verified_at: string | null; purchased_at: string }[]
> {
  const client = supabase();
  if (!client) return [];

  const installId = await ensureInstall();
  if (!installId) return [];

  const { data, error } = await client
    .from('app_purchases')
    .select('product_id, verified_at, purchased_at')
    .eq('install_id', installId);

  if (error || !data) return [];

  return data;
}
