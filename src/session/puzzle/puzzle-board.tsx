/**
 * The visuospatial task.
 *
 * Three decisions worth knowing about, all of them in service of "calm":
 *
 * 1. NOTHING FALLS ON A TIMER. The piece waits at the top until the user drops
 *    it. Gravity is where the stress in this genre comes from, and the spatial
 *    work — rotate the shape, find where it fits — is entirely intact without
 *    it. The drop is still a drop; it just happens when you say so.
 * 2. NO SCORE, NO LEVELS, NO SPEED. Rows dissolve when they fill because a
 *    board that only fills up would end, not because clearing them is worth
 *    anything.
 * 3. NO FAIL STATE. If the stack reaches the top, the board quietly empties and
 *    play continues. There is no way to lose this and no way to be told you
 *    did badly at it.
 */

import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { PUZZLE } from '@/config/session';
import { PUZZLE_COPY } from '@/content/strings';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { withAlpha } from '@/lib/color';
import {
  canPlace,
  clampColumn,
  clearFullRows,
  createBoard,
  landingRow,
  place,
} from '@/session/puzzle/board';
import { nextShape, rotateClockwise } from '@/session/puzzle/shapes';
import { tickDissolve, tickPlacement, tickSelection } from '@/session/ui/haptics';

/** What a rendered cell is showing. */
type CellState = 'empty' | 'settled' | 'active' | 'ghost';

const MAX_BOARD_WIDTH = 320;
const CELL_GAP = 3;
/** Share of the screen height the grid is allowed. The rest is controls. */
const BOARD_HEIGHT_RATIO = 0.52;

export function PuzzleBoard() {
  const theme = useTheme();
  const { width, height } = useWindowDimensions();

  const [board, setBoard] = useState(() => createBoard(PUZZLE.rows, PUZZLE.columns));
  const [piece, setPiece] = useState(() => {
    const shape = nextShape(null);
    return { id: shape.id, cells: shape.cells };
  });
  const [column, setColumn] = useState(() =>
    Math.floor((PUZZLE.columns - piece.cells[0].length) / 2),
  );

  // Sized off the shorter constraint of the two. Width alone overflows a small
  // phone once the controls and the framing copy are below it, and a board you
  // have to scroll to see all of is not a board.
  const availableWidth = Math.min(width - Spacing.four * 2, MAX_BOARD_WIDTH);
  const cellSize = Math.floor(
    Math.min(
      (availableWidth - CELL_GAP * (PUZZLE.columns - 1)) / PUZZLE.columns,
      (height * BOARD_HEIGHT_RATIO - CELL_GAP * (PUZZLE.rows - 1)) / PUZZLE.rows,
    ),
  );
  const boardWidth = cellSize * PUZZLE.columns + CELL_GAP * (PUZZLE.columns - 1);

  const spawn = useCallback((previousId: string) => {
    const shape = nextShape(previousId);
    setPiece({ id: shape.id, cells: shape.cells });
    setColumn(Math.floor((PUZZLE.columns - shape.cells[0].length) / 2));
  }, []);

  const move = useCallback(
    (delta: number) => {
      setColumn((current) => {
        const next = clampColumn(piece.cells, current + delta, PUZZLE.columns);
        if (next !== current) tickSelection();
        return next;
      });
    },
    [piece.cells],
  );

  const rotate = useCallback(() => {
    const rotated = rotateClockwise(piece.cells);
    tickSelection();
    setPiece((current) => ({ ...current, cells: rotated }));
    setColumn((current) => clampColumn(rotated, current, PUZZLE.columns));
  }, [piece.cells]);

  const drop = useCallback(() => {
    const row = landingRow(board, piece.cells, column);

    // No room at the top. Rather than ending anything, the board empties and
    // the same piece gets another go — see the note at the top of the file.
    if (row < 0) {
      setBoard(createBoard(PUZZLE.rows, PUZZLE.columns));
      tickDissolve();
      return;
    }

    const settled = place(board, piece.cells, row, column);
    const { board: cleared, cleared: clearedCount } = clearFullRows(settled);

    tickPlacement();
    if (clearedCount > 0) tickDissolve();

    setBoard(cleared);
    spawn(piece.id);
  }, [board, column, piece.cells, piece.id, spawn]);

  /**
   * One matrix for the renderer: what has settled, where the piece would land,
   * and where the piece is sitting now. The ghost is what carries most of the
   * spatial feedback — it is why the task stays readable without gravity.
   */
  const display = useMemo<CellState[][]>(() => {
    const grid: CellState[][] = board.map((row) =>
      row.map((filled) => (filled ? 'settled' : 'empty')),
    );

    const ghostRow = landingRow(board, piece.cells, column);
    if (ghostRow >= 0) {
      for (let r = 0; r < piece.cells.length; r += 1) {
        for (let c = 0; c < piece.cells[r].length; c += 1) {
          if (piece.cells[r][c]) grid[ghostRow + r][column + c] = 'ghost';
        }
      }
    }

    // The piece itself, hovering at the top. Drawn last so it wins wherever it
    // overlaps its own ghost on a nearly empty board.
    if (canPlace(board, piece.cells, 0, column)) {
      for (let r = 0; r < piece.cells.length; r += 1) {
        for (let c = 0; c < piece.cells[r].length; c += 1) {
          if (piece.cells[r][c]) grid[r][column + c] = 'active';
        }
      }
    }

    return grid;
  }, [board, column, piece.cells]);

  const fillFor = (state: CellState): string => {
    switch (state) {
      case 'settled':
        return withAlpha(theme.brand, 0.55);
      case 'active':
        return theme.brand;
      case 'ghost':
        return withAlpha(theme.brand, 0.14);
      default:
        return theme.backgroundElement;
    }
  };

  return (
    <View style={styles.root}>
      <View style={[styles.grid, { width: boardWidth }]}>
        {display.map((row, rowIndex) => (
          <View key={rowIndex} style={styles.row}>
            {row.map((state, columnIndex) => (
              <View
                key={columnIndex}
                style={[
                  styles.cell,
                  {
                    width: cellSize,
                    height: cellSize,
                    backgroundColor: fillFor(state),
                  },
                ]}
              />
            ))}
          </View>
        ))}
      </View>

      <View style={styles.controls}>
        <View style={styles.controlRow}>
          <ControlButton label={PUZZLE_COPY.left} glyph="‹" onPress={() => move(-1)} />
          <ControlButton label={PUZZLE_COPY.rotate} glyph="⟳" onPress={rotate} />
          <ControlButton label={PUZZLE_COPY.right} glyph="›" onPress={() => move(1)} />
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={PUZZLE_COPY.place}
          onPress={drop}
          style={({ pressed }) => [
            styles.place,
            { backgroundColor: theme.brand },
            pressed && styles.pressed,
          ]}>
          <ThemedText type="defaultSemiBold" style={{ color: theme.textOnBrand }}>
            {PUZZLE_COPY.place}
          </ThemedText>
        </Pressable>
      </View>
    </View>
  );
}

function ControlButton({
  label,
  glyph,
  onPress,
}: {
  label: string;
  glyph: string;
  onPress: () => void;
}) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.control,
        { backgroundColor: theme.backgroundElement, borderColor: theme.border },
        pressed && styles.pressed,
      ]}>
      <ThemedText type="subtitle" style={styles.glyph}>
        {glyph}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    gap: Spacing.four,
  },
  grid: {
    gap: CELL_GAP,
  },
  row: {
    flexDirection: 'row',
    gap: CELL_GAP,
  },
  cell: {
    borderRadius: Radius.sm / 2,
  },
  controls: {
    alignSelf: 'stretch',
    alignItems: 'center',
    gap: Spacing.three,
  },
  controlRow: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  control: {
    width: 64,
    height: 56,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth * 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glyph: {
    lineHeight: 32,
  },
  place: {
    alignSelf: 'stretch',
    height: 56,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
});
