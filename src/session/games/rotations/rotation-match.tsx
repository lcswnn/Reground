/**
 * Rotation Match — two figures, one question.
 *
 * The rules and the guarantee that the question is answerable are next door in
 * `figures.ts`; this file only draws them. Three things it is careful about,
 * all of them ways the task can be made answerable without rotating anything:
 *
 * 1. BOTH FIGURES ARE DRAWN AT THE SAME CELL SIZE, from the same square box.
 *    Two grids sized to their own contents differ in scale as soon as a turn
 *    swaps the bounding box, and "the fatter one" becomes a tell.
 * 2. NEITHER IS LABELLED, and there is no highlight linking a cell to its
 *    partner. The comparison has to happen in the head or not at all.
 * 3. THE CANDIDATE IS ALWAYS TURNED — see `buildRound`. An untouched copy is
 *    answered by looking, which is the one thing this game is not for.
 */

import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ROTATION_MATCH } from '@/content/strings';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { CellGrid } from '@/session/games/ui/cell-grid';
import { TrialFrame, type TrialChoice } from '@/session/games/ui/trial';
import { buildRound, type Cell, type Figure } from '@/session/games/rotations/figures';

const CELL_GAP = 2;
/** Past this the figures stop looking like objects and start looking like walls. */
const MAX_CELL = 32;
const MIN_CELL = 8;
/** Inside each figure's panel. */
const PANEL_PADDING = Spacing.three;
/** First-frame guess, replaced by the measured box on the next frame. */
const BOX_ESTIMATE = { width: 320, height: 220 };

/**
 * Both figures on one square grid, centred.
 *
 * A quarter-turn transposes the bounding box, so drawn as-is the pair would be
 * one tall shape beside one wide one at two different scales. Padding both out
 * to the same square gives the comparison nothing to go on but the shape, which
 * is the point — and it leaks nothing, since a figure and its mirror have the
 * same bounding box either way round.
 */
function centreOnSquare(figure: Figure, size: number): Cell[][] {
  const top = Math.floor((size - figure.length) / 2);
  const left = Math.floor((size - figure[0].length) / 2);

  return Array.from({ length: size }, (_, row) =>
    Array.from({ length: size }, (_, column) => {
      const cell = figure[row - top]?.[column - left];
      return cell === 1 ? 1 : 0;
    }),
  );
}

export function RotationMatch() {
  const theme = useTheme();
  const [round, setRound] = useState(() => buildRound());
  const [index, setIndex] = useState(0);
  const [box, setBox] = useState(BOX_ESTIMATE);

  const next = useCallback(() => {
    setRound(buildRound());
    setIndex((count) => count + 1);
  }, []);

  const { left, right, cellSize } = useMemo(() => {
    const span = Math.max(
      round.figure.length,
      round.figure[0].length,
      round.candidate.length,
      round.candidate[0].length,
    );

    // Two panels side by side with a gutter between them, each with its own
    // padding — what is left over, divided by the grid, is the cell.
    const perPanel = (box.width - Spacing.three) / 2 - PANEL_PADDING * 2;
    const usable = Math.min(perPanel, box.height - PANEL_PADDING * 2);
    const size = Math.floor((usable - CELL_GAP * (span - 1)) / span);

    return {
      left: centreOnSquare(round.figure, span),
      right: centreOnSquare(round.candidate, span),
      cellSize: Math.max(MIN_CELL, Math.min(MAX_CELL, size)),
    };
  }, [box.height, box.width, round]);

  const choices: TrialChoice[] = [
    {
      key: 'same',
      label: ROTATION_MATCH.same,
      correct: !round.mirrored,
    },
    {
      key: 'mirror',
      label: ROTATION_MATCH.mirror,
      correct: round.mirrored,
    },
  ];

  const panel = (cells: Cell[][], label: string) => (
    <View
      style={[
        styles.panel,
        { backgroundColor: theme.backgroundElement, borderColor: theme.border },
      ]}>
      <CellGrid
        cells={cells}
        cellSize={cellSize}
        gap={CELL_GAP}
        accessibilityLabel={label}
        fillFor={(value) => (value === 1 ? theme.brand : 'transparent')}
      />
    </View>
  );

  return (
    <TrialFrame
      prompt={ROTATION_MATCH.prompt}
      roundKey={index}
      choices={choices}
      onNext={next}>
      <View
        style={styles.pair}
        onLayout={(event) =>
          setBox({
            width: event.nativeEvent.layout.width,
            height: event.nativeEvent.layout.height,
          })
        }>
        {panel(left, ROTATION_MATCH.figureLabel)}
        {panel(right, ROTATION_MATCH.candidateLabel)}
      </View>
    </TrialFrame>
  );
}

const styles = StyleSheet.create({
  pair: {
    flex: 1,
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
  },
  panel: {
    padding: PANEL_PADDING,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
});
