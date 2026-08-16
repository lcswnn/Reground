/**
 * The last question the app asks: one more thing, or nothing.
 *
 * The second menu in the session, and the only other one is the game picker —
 * which earns its place the same way this does. The session is nearly over and
 * what is left is not a step with a mechanism behind it; it is whatever this
 * particular person still needs. Nobody can be handed the right one of these
 * from a branch, because the branch was about what upset them half an hour ago
 * and this is about what would help them put the phone down.
 *
 * The list replaces what used to happen here: exactly one thing, chosen for the
 * user from their category group. That was the right call while there was one
 * option per group and no way to say "not that one". With five, choosing for
 * them is just hiding four.
 *
 * Plain data with no components in it, in the same shape and for the same
 * reasons as `games/catalog.ts`. The mapping from an id to something that runs
 * lives in `app/one-more.tsx`, and today only `grounding` has anything behind
 * it — every other id lands on the not-built-yet screen there. That is a fact
 * about the app, not about the option, which is why it isn't a field here: an
 * option is what it is whether or not it has been built.
 *
 * Order is the order on screen. The 5-4-3-2-1 is first because it is the one
 * with a name a person may already know and the one that works from a chair,
 * with nothing to fetch and nothing to put on.
 */

export type OneMoreId =
  | 'grounding'
  | 'breathing'
  | 'somatic'
  | 'soundscape'
  | 'pmr';

export interface OneMoreOption {
  id: OneMoreId;
  /** What it is. Named, not described — the blurb does that. */
  title: string;
  /** One line. What you actually do, not what it is supposed to achieve. */
  blurb: string;
}

export const ONE_MORE_OPTIONS: readonly OneMoreOption[] = [
  {
    id: 'grounding',
    // Written as the numbers rather than as "grounding exercise": it is the
    // name of the technique, it is what someone would search for, and it says
    // how long it is without a word about time.
    title: '5-4-3-2-1',
    blurb: 'Five things you can see, four you can feel, down to one.',
  },
  {
    id: 'breathing',
    // Not "more breathing". The session opened with a physiological sigh, and
    // the offer here is a different pattern, not a second helping of that one.
    title: 'Breathing, another way',
    blurb: 'Slower patterns than the sigh earlier. Even counts, long exhales.',
  },
  {
    id: 'somatic',
    // The only entry on this list that opens onto another list — six movements,
    // in `@/content/somatic`. The blurb names two of them rather than the
    // family, because "somatic" is a word most people have not met and a card
    // that only says it is a card that says nothing. The screen behind it
    // explains what they have in common; this has to earn the tap first.
    title: 'Somatic movements',
    blurb: 'Shake it out, unclench your jaw, look slowly around the room.',
  },
  {
    id: 'soundscape',
    title: 'Soundscapes',
    blurb: 'Rain, a fire, a room with people in it. Something to listen to.',
  },
  {
    id: 'pmr',
    // Spelled out rather than left as "PMR". The initials are what it is
    // called by people who already know what it is.
    title: 'Progressive muscle relaxation',
    blurb: 'Tense one muscle group, hold it, let go. Work up the body.',
  },
] as const;

export function findOneMore(id: OneMoreId): OneMoreOption | undefined {
  return ONE_MORE_OPTIONS.find((option) => option.id === id);
}
