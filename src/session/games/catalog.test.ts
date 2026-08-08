import { describe, expect, it } from 'vitest';

import { CATEGORIES } from '@/content/categories';
import {
  GAMES,
  findGame,
  gamesOfKind,
  isUnlocked,
  partitionGames,
  type GameKind,
} from '@/session/games/catalog';

const KINDS: GameKind[] = ['visuospatial', 'calm'];

describe('the game catalog', () => {
  it('has unique ids', () => {
    expect(new Set(GAMES.map((game) => game.id)).size).toBe(GAMES.length);
  });

  it('offers something without paying', () => {
    KINDS.forEach((kind) => {
      expect(partitionGames(kind, false).unlocked.length, kind).toBeGreaterThan(0);
    });
  });

  it('finds a game by id and nothing by a stale one', () => {
    expect(findGame('shapes')?.title).toBe('Fit the shapes');
    // @ts-expect-error — an id that isn't in the union, as a deep link would be.
    expect(findGame('solitaire')).toBeUndefined();
  });
});

describe('the two shelves', () => {
  it('puts every game on exactly one of them', () => {
    const shelved = KINDS.flatMap((kind) => gamesOfKind(kind));

    expect(shelved).toHaveLength(GAMES.length);
    expect(new Set(shelved.map((game) => game.id)).size).toBe(GAMES.length);
  });

  it('keeps catalog order within a shelf', () => {
    KINDS.forEach((kind) => {
      const shelf = gamesOfKind(kind).map((game) => game.id);
      const inOrder = GAMES.filter((game) => game.kind === kind).map((game) => game.id);

      expect(shelf, kind).toEqual(inOrder);
    });
  });

  /**
   * The calm shelf is the one that will grow, and this is what stops it growing
   * by accident: a visuospatial game listed as calm is a mental rotation task
   * handed to someone the mechanism does not apply to, and nothing else in the
   * app would notice.
   */
  it('leads the calm shelf with the ball, and keeps the puzzles off it', () => {
    const calm = gamesOfKind('calm').map((game) => game.id);

    expect(calm[0]).toBe('bounce');
    expect(calm).not.toContain('shapes');
  });

  it('keeps the evidence-backed puzzle at the head of the other one', () => {
    expect(gamesOfKind('visuospatial')[0]?.id).toBe('shapes');
  });

  /**
   * The picker draws whatever shelf the category asked for, so a category
   * pointing at an empty one is a screen with nothing on it — and it would only
   * show up by playing the session all the way to that step.
   */
  it('gives every category a shelf with something on it', () => {
    CATEGORIES.forEach((category) => {
      expect(gamesOfKind(category.games).length, category.id).toBeGreaterThan(0);
    });
  });

  // The split it was all built for: only the answer that describes a picture
  // gets the games that compete with one.
  it('sends only the witnessed image to the visuospatial games', () => {
    const visuospatial = CATEGORIES.filter((category) => category.games === 'visuospatial');

    expect(visuospatial.map((category) => category.id)).toEqual(['witnessed']);
  });
});

describe('tiering', () => {
  it('keeps premium games out of the free list', () => {
    KINDS.forEach((kind) => {
      const { unlocked, locked } = partitionGames(kind, false);
      expect(unlocked.every((game) => game.tier === 'included'), kind).toBe(true);
      expect(locked.every((game) => game.tier === 'premium'), kind).toBe(true);
    });
  });

  it('unlocks everything on a shelf once premium is held', () => {
    KINDS.forEach((kind) => {
      const { unlocked, locked } = partitionGames(kind, true);
      expect(unlocked, kind).toHaveLength(gamesOfKind(kind).length);
      expect(locked, kind).toHaveLength(0);
    });

    expect(GAMES.every((game) => isUnlocked(game, true))).toBe(true);
  });

  it('splits a shelf exactly — every game on it lands on one side', () => {
    for (const hasPremium of [false, true]) {
      KINDS.forEach((kind) => {
        const { unlocked, locked } = partitionGames(kind, hasPremium);
        expect(unlocked.length + locked.length, kind).toBe(gamesOfKind(kind).length);
      });
    }
  });

  // Not a rule, just where things stand: nothing paid has been written for the
  // calm shelf yet, so its picker draws no Reground Plus section at all.
  it('has no paid entry on the calm shelf yet', () => {
    expect(partitionGames('calm', false).locked).toHaveLength(0);
  });
});
