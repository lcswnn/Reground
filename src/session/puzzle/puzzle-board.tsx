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

/**
 * The control heights, named rather than written into `styles` alone, because
 * the grid's height budget is whatever is left after them and the two numbers
 * have to agree. Change one and change the other.
 */
const CONTROL_HEIGHT = 56;
const PLACE_HEIGHT = 56;

/**
 * The floor on a cell. A board that cannot fit its rows shrinks until it can,
 * and this is where the shrinking stops — below this the shapes stop reading as
 * shapes. Nothing currently hits it: the smallest screen the app supports lands
 * around 27px.
 */
const MIN_CELL = 18;

/**
 * First-frame guess at the grid's share of the screen, used only until
 * `onLayout` reports the real box on the very next frame.
 *
 * This used to be the whole sizing rule, and it was the reason "I'm done" could
 * end up below the bottom of the screen. A share of the *window* is not a share
 * of what is going spare: the safe-area insets, the back button, the heading and
 * its framing copy, this board's own controls and the footer button all come out
 * of the same column, and none of them were in the 0.52. On a small phone the
 * total came to about 64px more than there was, and the footer is last in the
 * column, so the footer is what fell off. Hence the measurement below — the
 * board takes what is left rather than taking a cut off the top.
 */
const BOARD_HEIGHT_ESTIMATE = 0.42;

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

  /**
   * The height this whole component was given, measured rather than assumed.
   * `null` for one frame, before the first layout.
   */
  const [box, setBox] = useState<number | null>(null);

  // Sized off the shorter constraint of the two. Width alone overflows a small
  // phone once the controls and the framing copy are below it, and a board you
  // have to scroll to see all of is not a board.
  //
  // The height side is what is left of `box` once the controls underneath have
  // taken theirs. Because the root is `flex: 1`, `box` is decided entirely by
  // the parent and never by what is rendered into it, so measuring it here
  // cannot feed back into its own size.
  const budget =
    box === null
      ? height * BOARD_HEIGHT_ESTIMATE
      : box - (CONTROL_HEIGHT + Spacing.three + PLACE_HEIGHT) - Spacing.four;

  const availableWidth = Math.min(width - Spacing.four * 2, MAX_BOARD_WIDTH);
  const cellSize = Math.max(
    MIN_CELL,
    Math.floor(
      Math.min(
        (availableWidth - CELL_GAP * (PUZZLE.columns - 1)) / PUZZLE.columns,
        (budget - CELL_GAP * (PUZZLE.rows - 1)) / PUZZLE.rows,
      ),
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
    <View
      style={styles.root}
      onLayout={(event) => setBox(event.nativeEvent.layout.height)}>
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
  // `flex: 1` so the board is handed the space the screen has left rather than
  // asking for a share of the window — see `BOARD_HEIGHT_ESTIMATE`.
  //
  // Centred rather than spread: on a phone the grid very nearly fills its
  // budget and there is nothing to distribute either way, but on a tablet the
  // cell size is capped by width instead and a couple of hundred points go
  // spare. Spreading would pin the controls to the bottom of the screen and
  // leave them stranded from the board they drive; centring keeps the two
  // reading as one object and puts the slack around the outside.
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
    height: CONTROL_HEIGHT,
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
    height: PLACE_HEIGHT,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
});
