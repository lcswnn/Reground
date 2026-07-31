import { supabase } from '@/lib/supabase';
import { EMPTY_COUNTS, type ReactionCounts } from '@/lib/reaction-tally';
import type { ReactionId } from '@/lib/streak';

/**
 * The shared half of the daily card's reactions.
 *
 * The device still owns which button is lit — see `streak.ts`, which records the
 * reaction locally and works with no network at all. This module only answers
 * the second question: what did everyone else say. Keeping the two apart means
 * a failed write or a dead connection costs the reader the tally, never their
 * own choice.
 */

/**
 * Records the reader's reaction, replacing any earlier one for the same day.
 *
 * `onConflict` on the primary key rather than an insert-then-update: changing
 * your mind is a normal thing to do, and this is one round trip either way.
 */
export async function submitReaction(
  userId: string,
  cardDate: string,
  metricId: string,
  reaction: ReactionId,
): Promise<void> {
  const { error } = await supabase.from('card_reactions').upsert(
    {
      user_id: userId,
      card_date: cardDate,
      metric_id: metricId,
      reaction,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,card_date' },
  );

  if (error) throw error;
}

/**
 * How the day's readers split, for one indicator.
 *
 * Goes through the `card_reaction_tally` function rather than selecting from the
 * table, because row-level security correctly stops a reader seeing anybody
 * else's row. The function is `security definer` and returns only counts, so it
 * can answer the aggregate without ever exposing who voted.
 *
 * Rows arrive one per reaction *that has votes* — an option nobody has chosen is
 * absent rather than zero — so the result is folded onto `EMPTY_COUNTS` instead
 * of being read positionally.
 */
export async function fetchReactionTally(
  cardDate: string,
  metricId: string,
): Promise<ReactionCounts> {
  const { data, error } = await supabase.rpc('card_reaction_tally', {
    p_date: cardDate,
    p_metric_id: metricId,
  });

  if (error) throw error;

  return (data ?? []).reduce<ReactionCounts>(
    (counts, row) => ({ ...counts, [row.reaction]: Number(row.votes) }),
    { ...EMPTY_COUNTS },
  );
}
