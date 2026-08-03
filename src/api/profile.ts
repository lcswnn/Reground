import { supabase } from '@/lib/supabase';
import type { Profile } from '@/types/database';

export async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

/**
 * `birthDate` is `YYYY-MM-DD`.
 *
 * An upsert rather than an update, and that is not defensive coding for its own
 * sake. The birthday used to be collected on the sign-up form and written into
 * the row by the `handle_new_user()` trigger, so by the time Settings could edit
 * it the row was guaranteed to exist. There is no sign-up form any more — the
 * account is created by `signInAnonymously` — so Settings is now the *first*
 * write for a reader whose row the trigger never made. A plain `update` matches
 * zero rows in that case and reports success, which is the worst shape a bug can
 * take: the picker closes, the button says "Saved", and the birthday is gone on
 * the next launch.
 */
export async function updateBirthDate(userId: string, birthDate: string): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .upsert(
      { id: userId, birth_date: birthDate, updated_at: new Date().toISOString() },
      { onConflict: 'id' },
    );

  if (error) throw error;
}

export async function updateDisplayName(userId: string, displayName: string): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ display_name: displayName.trim(), updated_at: new Date().toISOString() })
    .eq('id', userId);

  if (error) throw error;
}
