import { supabase } from '@/lib/supabase';
import type { CategoryWeights } from '@/lib/scoring';

/**
 * Remote copy of the reader's category weighting.
 *
 * The device remains the write path and the offline source of truth — see
 * `src/state/weighting.ts`. This exists so the weighting survives a reinstall or
 * follows the reader to a second device, which local storage alone cannot do.
 *
 * ## Every function here fails soft
 *
 * Losing the network, being signed out, or running against a database where the
 * migration has not been applied yet must never cost someone the weighting they
 * just set. So a failed read returns null and a failed write returns false; none
 * of them throw. The local copy is already correct by the time these are called.
 *
 * That last case is real rather than theoretical: `0002_category_weights.sql`
 * has to be applied by hand, and until it is, every query here comes back with
 * `column profiles.category_weights does not exist`. The app works throughout —
 * it just does not sync — and starts syncing the moment the column appears, with
 * no client release.
 */

export interface RemoteWeighting {
  weights: CategoryWeights;
  /** ISO timestamp, for resolving which device wrote last. */
  updatedAt: string | null;
}

/** True when the failure is "the migration has not been applied", not a fault. */
function isMissingColumn(error: { message?: string; code?: string } | null): boolean {
  if (!error) return false;
  // 42703 is Postgres `undefined_column`. PostgREST also reports its own schema
  // cache miss as PGRST204 with the column named in the message.
  return (
    error.code === '42703' ||
    error.code === 'PGRST204' ||
    /category_weights/.test(error.message ?? '')
  );
}

/** Only finite numbers survive — a NaN from anywhere would poison the score. */
function sanitise(value: unknown): CategoryWeights | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;

  const cleaned: CategoryWeights = {};
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    if (typeof raw === 'number' && Number.isFinite(raw)) {
      cleaned[key] = Math.min(100, Math.max(0, raw));
    }
  }

  // An object that parsed but held nothing usable is treated as "no weighting"
  // rather than as an empty one, matching the null-is-not-empty rule on device.
  return Object.keys(cleaned).length > 0 ? cleaned : null;
}

export async function fetchRemoteWeighting(userId: string): Promise<RemoteWeighting | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('category_weights, category_weights_updated_at')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    if (!isMissingColumn(error)) {
      console.warn(`[weighting] could not read remote weighting: ${error.message}`);
    }
    return null;
  }

  const weights = sanitise((data as { category_weights?: unknown } | null)?.category_weights);
  if (!weights) return null;

  return {
    weights,
    updatedAt:
      (data as { category_weights_updated_at?: string | null } | null)
        ?.category_weights_updated_at ?? null,
  };
}

/** Returns whether the write landed. Callers use it for the sync indicator. */
export async function saveRemoteWeighting(
  userId: string,
  weights: CategoryWeights,
  updatedAt: string,
): Promise<boolean> {
  const { error } = await supabase
    .from('profiles')
    .update({
      category_weights: weights,
      category_weights_updated_at: updatedAt,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);

  if (error) {
    if (!isMissingColumn(error)) {
      console.warn(`[weighting] could not save remote weighting: ${error.message}`);
    }
    return false;
  }

  return true;
}

/** Clears the remote copy when the reader resets to defaults. */
export async function clearRemoteWeighting(userId: string): Promise<boolean> {
  const { error } = await supabase
    .from('profiles')
    .update({
      category_weights: null,
      category_weights_updated_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);

  if (error) {
    if (!isMissingColumn(error)) {
      console.warn(`[weighting] could not clear remote weighting: ${error.message}`);
    }
    return false;
  }

  return true;
}
