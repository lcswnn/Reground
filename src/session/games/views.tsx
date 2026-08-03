/**
 * The one place an id from the catalog turns into something on screen.
 *
 * Partial on purpose: the premium entries in `catalog.ts` have no
 * implementation yet, and this map is what makes that a fact the code can check
 * rather than a comment. The play screen sends anyone holding an id with no
 * view back to the picker instead of rendering a blank board.
 */

import type { ComponentType } from 'react';

import type { GameId } from '@/session/games/catalog';
import { BounceGame } from '@/session/games/bounce-game';
import { PuzzleBoard } from '@/session/puzzle/puzzle-board';

export const GAME_VIEWS: Partial<Record<GameId, ComponentType>> = {
  shapes: PuzzleBoard,
  bounce: BounceGame,
};

export function isPlayable(id: GameId): boolean {
  return GAME_VIEWS[id] !== undefined;
}
