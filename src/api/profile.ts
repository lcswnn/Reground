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

/** `birthDate` is `YYYY-MM-DD`. */
export async function updateBirthDate(userId: string, birthDate: string): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ birth_date: birthDate, updated_at: new Date().toISOString() })
    .eq('id', userId);

  if (error) throw error;
}

export async function updateDisplayName(userId: string, displayName: string): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ display_name: displayName.trim(), updated_at: new Date().toISOString() })
    .eq('id', userId);

  if (error) throw error;
}
