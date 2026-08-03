import { describe, expect, it } from 'vitest';

import { GAMES, findGame, isUnlocked, partitionGames } from '@/session/games/catalog';

describe('the game catalog', () => {
  it('has unique ids', () => {
    expect(new Set(GAMES.map((game) => game.id)).size).toBe(GAMES.length);
  });

  it('offers something without paying', () => {
    expect(partitionGames(false).unlocked.length).toBeGreaterThan(0);
  });

  it('finds a game by id and nothing by a stale one', () => {
    expect(findGame('shapes')?.title).toBe('Fit the shapes');
    // @ts-expect-error — an id that isn't in the union, as a deep link would be.
    expect(findGame('solitaire')).toBeUndefined();
  });
});

describe('tiering', () => {
  it('keeps premium games out of the free list', () => {
    const { unlocked, locked } = partitionGames(false);
    expect(unlocked.every((game) => game.tier === 'included')).toBe(true);
    expect(locked.every((game) => game.tier === 'premium')).toBe(true);
  });

  it('unlocks everything once premium is held', () => {
    const { unlocked, locked } = partitionGames(true);
    expect(unlocked).toHaveLength(GAMES.length);
    expect(locked).toHaveLength(0);
    expect(GAMES.every((game) => isUnlocked(game, true))).toBe(true);
  });

  it('splits the catalog exactly — every game lands on one side', () => {
    for (const hasPremium of [false, true]) {
      const { unlocked, locked } = partitionGames(hasPremium);
      expect(unlocked.length + locked.length).toBe(GAMES.length);
    }
  });
});
