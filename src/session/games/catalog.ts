/**
 * The games on offer at the game step, as data, on two shelves.
 *
 * The `visuospatial` shelf is the one with the mechanism behind it: every game
 * on it occupies the part of the mind that holds a picture, which is what stops
 * an intrusive image from re-consolidating as sharply. It is shown to the one
 * group whose trouble *is* a picture — see `GameKind` below.
 *
 * The `calm` shelf makes no such claim and is not trying to. Someone anxious
 * about the news has no image to compete with, and handing them a mental
 * rotation task is asking for effort in exchange for a mechanism that does not
 * apply to them. What they get instead is something to do with their hands for
 * a few minutes. That is a smaller promise and an honest one.
 *
 * Nothing on either shelf keeps score. That rule predates the split and outlives
 * it: a number going up turns a distraction into a performance, and a number
 * that stops going up turns it into a loss.
 *
 * Kept as plain data with no components in it, so the shelves and the tiering
 * can be read and tested without a renderer. The mapping from an id to something
 * playable lives next door in `views.tsx`.
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
  | 'merge'
  | 'maze';

/**
 * Which shelf a game sits on, and — read the other way — which shelf a person
 * is shown.
 *
 * Carried on the category rather than derived from the group: see `games` in
 * `content/categories.ts`. "Something I saw" gets `visuospatial`; the news and
 * the personal/other answer both get `calm`, and those two do not share a
 * `CategoryGroup`, so there is nothing in the flow's own taxonomy that could
 * have expressed this.
 *
 * It is not a routing signal. Every branch in the session still keys off the
 * group — this decides what one screen offers and how long the step runs, not
 * which screens there are.
 */
export type GameKind = 'visuospatial' | 'calm';

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
  kind: GameKind;
  tier: GameTier;
}

/**
 * Order is the order on screen, and it is not accidental.
 *
 * One list rather than two, because a game belongs to a shelf the same way it
 * belongs to a tier — as a property of the game, not as a place it is filed.
 * The picker filters; the order it draws is the order here.
 *
 * The shapes puzzle is first because it is the one with the evidence behind it,
 * and it is what someone with no preference should land on. The mental-rotation
 * games follow, roughly in order of how directly they ask for a picture to be
 * generated and turned.
 *
 * `bounce` used to sit at the end of that list as the option for someone who
 * could not face a puzzle. It is now the head of the `calm` shelf, which is the
 * same idea given its own screen and a group of people it is actually the right
 * answer for.
 *
 * `merge` follows it, and the pair is the point: the ball is for someone who
 * cannot face thinking, the tiles are for someone who would rather have
 * something to think about than sit with what they were thinking about. Two
 * cards is the smallest number that makes the picker a question — it was one
 * for a while, and a question with one answer is a screen you tap through.
 *
 * The single `premium` entry is not built. It is listed because the picker has
 * to show what a purchase would get you. Nothing can reach it while
 * `usePremiumAccess` returns false; if that changes, it needs an implementation
 * in `views.tsx` first — `isPlayable` is what keeps that honest.
 */
export const GAMES: readonly Game[] = [
  {
    id: 'shapes',
    // The blurb carries the one instruction this game needs — picture the
    // landing before turning the piece — because that is the whole difference
    // between playing it and getting anything from it, and the board itself is
    // no place to keep saying so. See the note at the top of `puzzle-board.tsx`.
    title: 'Fit the shapes',
    blurb: 'Picture how a piece will land before you turn it. Nothing falls on a timer.',
    kind: 'visuospatial',
    tier: 'included',
  },
  {
    id: 'rotations',
    title: 'Turn it around',
    blurb: 'Two shapes, one angle apart. Say whether they match.',
    kind: 'visuospatial',
    tier: 'included',
  },
  {
    id: 'fold',
    title: 'Unfold the paper',
    blurb: 'A sheet is folded and punched. Say what it looks like opened out.',
    kind: 'visuospatial',
    tier: 'included',
  },
  {
    id: 'net',
    title: 'Fold up the cube',
    blurb: 'Six faces laid flat. Say which one ends up opposite another.',
    kind: 'visuospatial',
    tier: 'included',
  },
  {
    id: 'cubes',
    title: 'Count the blocks',
    blurb: 'A pile of cubes. Count them, including the ones out of sight.',
    kind: 'visuospatial',
    tier: 'included',
  },
  {
    id: 'mirror',
    title: 'Finish the mirror',
    blurb: 'Half a pattern is drawn. Tap the other half in.',
    kind: 'visuospatial',
    tier: 'included',
  },
  {
    id: 'silhouette',
    title: 'Fill the outline',
    blurb: 'Turn a piece, then drag it in. It stays where you drop it.',
    kind: 'visuospatial',
    tier: 'included',
  },
  {
    id: 'bounce',
    title: 'Keep it in the air',
    blurb: 'One ball, one paddle. Drop it and you serve again.',
    kind: 'calm',
    tier: 'included',
  },
  {
    // The blurb says "two of the same" rather than "2048" on purpose — naming
    // a tile to reach would put a target on a shelf that keeps no score. See
    // the note at the top of `merge/merge-tiles.tsx`.
    id: 'merge',
    title: 'Join the numbers',
    blurb: 'Swipe to slide the tiles. Two of the same become one, doubled.',
    kind: 'calm',
    tier: 'included',
  },
  {
    id: 'maze',
    title: 'Find the way out',
    blurb: 'Trace a path through with your finger. No clock.',
    kind: 'visuospatial',
    tier: 'premium',
  },
] as const;

export function findGame(id: GameId): Game | undefined {
  return GAMES.find((game) => game.id === id);
}

export function isUnlocked(game: Game, hasPremium: boolean): boolean {
  return game.tier === 'included' || hasPremium;
}

/** One shelf, in catalog order. */
export function gamesOfKind(kind: GameKind): Game[] {
  return GAMES.filter((game) => game.kind === kind);
}

/**
 * One shelf, split the way the picker draws it: what can be played now, and
 * what is behind the purchase.
 *
 * A shelf can come back with an empty `locked` half — the calm one has no paid
 * entry — and the picker draws no paid section at all in that case rather than
 * an empty heading.
 */
export function partitionGames(
  kind: GameKind,
  hasPremium: boolean,
): { unlocked: Game[]; locked: Game[] } {
  const shelf = gamesOfKind(kind);

  return {
    unlocked: shelf.filter((game) => isUnlocked(game, hasPremium)),
    locked: shelf.filter((game) => !isUnlocked(game, hasPremium)),
  };
}
