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

export type GameId =
  | 'shapes'
  | 'rotations'
  | 'fold'
  | 'net'
  | 'cubes'
  | 'mirror'
  | 'silhouette'
  | 'bounce'
  | 'maze';

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
 * Order is the order on screen, and it is not accidental.
 *
 * The shapes puzzle is first because it is the one with the evidence behind it,
 * and it is what someone with no preference should land on. The mental-rotation
 * games follow, roughly in order of how directly they ask for a picture to be
 * generated and turned. `bounce` is last of the free list on purpose: it is the
 * one that is mostly a fidget, and it is here for the people who cannot face a
 * puzzle rather than as a recommendation.
 *
 * The single `premium` entry is not built. It is listed because the picker has
 * to show what a purchase would get you. Nothing can reach it while
 * `usePremiumAccess` returns false; if that changes, it needs an implementation
 * in `views.tsx` first — `isPlayable` is what keeps that honest.
 */
export const GAMES: readonly Game[] = [
  {
    id: 'shapes',
    title: 'Fit the shapes',
    blurb: 'Turn each piece and drop it where it fits. Nothing falls on a timer.',
    tier: 'included',
  },
  {
    id: 'rotations',
    title: 'Turn it around',
    blurb: 'Two shapes, one angle apart. Say whether they match.',
    tier: 'included',
  },
  {
    id: 'fold',
    title: 'Unfold the paper',
    blurb: 'A sheet is folded and punched. Say what it looks like opened out.',
    tier: 'included',
  },
  {
    id: 'net',
    title: 'Fold up the cube',
    blurb: 'Six faces laid flat. Say which one ends up opposite another.',
    tier: 'included',
  },
  {
    id: 'cubes',
    title: 'Count the blocks',
    blurb: 'A pile of cubes. Count them, including the ones out of sight.',
    tier: 'included',
  },
  {
    id: 'mirror',
    title: 'Finish the mirror',
    blurb: 'Half a pattern is drawn. Tap the other half in.',
    tier: 'included',
  },
  {
    id: 'silhouette',
    title: 'Fill the outline',
    blurb: 'Turn a piece, then drag it in. It stays where you drop it.',
    tier: 'included',
  },
  {
    id: 'bounce',
    title: 'Keep it in the air',
    blurb: 'One ball, one paddle. Drop it and you serve again.',
    tier: 'included',
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
