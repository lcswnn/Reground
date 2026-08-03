/**
 * The games on offer at the visuospatial step, as data.
 *
 * Every one of them has to do the same job: occupy the part of the mind that
 * holds a picture. That is the whole mechanism — a task competing for visual
 * working memory is what stops an image from re-consolidating as sharply. So a
 * word game, a quiz or anything with a score would not belong on this list,
 * whatever else it had going for it.
 *
 * Kept as plain data with no components in it, so the tiering can be read and
 * tested without a renderer. The mapping from an id to something playable lives
 * next door in `views.tsx`.
 */

export type GameId = 'shapes' | 'bounce' | 'rotations' | 'maze';

/**
 * `included` is everything the app does today. `premium` is behind a purchase
 * that does not exist yet — see `usePremiumAccess` in `premium.ts`.
 */
export type GameTier = 'included' | 'premium';

export interface Game {
  id: GameId;
  title: string;
  /** One line, plain. What you actually do, not why it is good for you. */
  blurb: string;
  tier: GameTier;
}

/**
 * Order is the order on screen, and it is not accidental: the shapes puzzle is
 * first because it is the one with the evidence behind it, and it is what
 * someone who has no preference should land on.
 *
 * The two `premium` entries are not built. They are listed because the picker
 * has to show what a purchase would get you, and they are the two tasks worth
 * building next — both are visuospatial in the same way the first two are.
 * Nothing can reach them while `usePremiumAccess` returns false; if that ever
 * changes, they need implementations in `views.tsx` first.
 */
export const GAMES: readonly Game[] = [
  {
    id: 'shapes',
    title: 'Fit the shapes',
    blurb: 'Turn each piece and drop it where it fits. Nothing falls on a timer.',
    tier: 'included',
  },
  {
    id: 'bounce',
    title: 'Keep it in the air',
    blurb: 'One ball, one paddle. Drop it and you serve again.',
    tier: 'included',
  },
  {
    id: 'rotations',
    title: 'Turn it around',
    blurb: 'Two shapes, one angle apart. Say whether they match.',
    tier: 'premium',
  },
  {
    id: 'maze',
    title: 'Find the way out',
    blurb: 'Trace a path through with your finger. No clock.',
    tier: 'premium',
  },
] as const;

export function findGame(id: GameId): Game | undefined {
  return GAMES.find((game) => game.id === id);
}

export function isUnlocked(game: Game, hasPremium: boolean): boolean {
  return game.tier === 'included' || hasPremium;
}

/**
 * The list split the way the picker draws it: what can be played now, and what
 * is behind the purchase.
 */
export function partitionGames(hasPremium: boolean): { unlocked: Game[]; locked: Game[] } {
  return {
    unlocked: GAMES.filter((game) => isUnlocked(game, hasPremium)),
    locked: GAMES.filter((game) => !isUnlocked(game, hasPremium)),
  };
}
