/**
 * The one place an id from the catalog turns into something on screen.
 *
 * Partial on purpose: `maze` is in `catalog.ts` with no implementation behind
 * it, and this map is what makes that a fact the code can check rather than a
 * comment. The play screen sends anyone holding an id with no view back to the
 * picker instead of rendering a blank board, and the picker draws an unbuilt
 * game as locked whatever tier it claims.
 */

import type { ComponentType } from 'react';

import type { GameId } from '@/session/games/catalog';
import { BloomField } from '@/session/games/bloom/bloom-field';
import { BounceGame } from '@/session/games/bounce-game';
import { HiddenCubes } from '@/session/games/cubes/hidden-cubes';
import { MatchThree } from '@/session/games/match/match-three';
import { MergeTiles } from '@/session/games/merge/merge-tiles';
import { MirrorComplete } from '@/session/games/mirror/mirror-complete';
import { NetFold } from '@/session/games/net-fold/net-fold';
import { PaperFold } from '@/session/games/paper-fold/paper-fold';
import { PegDrop } from '@/session/games/pegs/peg-drop';
import { RotationMatch } from '@/session/games/rotations/rotation-match';
import { SilhouetteFit } from '@/session/games/silhouette/silhouette-fit';
import { PuzzleBoard } from '@/session/puzzle/puzzle-board';

export const GAME_VIEWS: Partial<Record<GameId, ComponentType>> = {
  shapes: PuzzleBoard,
  rotations: RotationMatch,
  fold: PaperFold,
  net: NetFold,
  cubes: HiddenCubes,
  mirror: MirrorComplete,
  silhouette: SilhouetteFit,
  bounce: BounceGame,
  pegs: PegDrop,
  bloom: BloomField,
  merge: MergeTiles,
  match: MatchThree,
};

export function isPlayable(id: GameId): boolean {
  return GAME_VIEWS[id] !== undefined;
}
