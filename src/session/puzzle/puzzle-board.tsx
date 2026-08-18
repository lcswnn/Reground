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
 * 3. NO FAIL STATE. If the stack reaches the top, the oldest rows dissolve from
 *    underneath it and play continues — see `dissolveLowest`. There is no way
 *    to lose this and no way to be told you did badly at it.
 *
 * One thing that is deliberately NOT on this screen: the instruction to picture
 * how a piece will land before turning it. That instruction matters — it is what
 * the trials this borrows from actually said, and it is the difference between a
 * player who rotates the piece until it looks right and one who rotates it in
 * their head first — but it lives in the game's description on the picker, where
 * it is read once before starting. On the board it was a line of type and a row
 * of cells' worth of height, permanently, to say something nobody reads twice.
 *
 * ## The hover zone
 *
 * The piece waits in `HOVER_ROWS` of empty space above the playfield rather than
 * in the top rows of the playfield itself, and that is a fix rather than a
 * flourish. Drawn inside the board, the waiting piece was only rendered where it
 * did not collide with what was already there — so once the stack was seven or
 * so high, the piece being steered simply stopped being drawn, and its landing
 * ghost went with it. You were left rotating something invisible, which reads as
 * the piece having gone off the top of the screen.
 *
 * Above the board, the stack cannot reach it. The piece is always on screen,
 * always at the same size, and the missing ghost now says something true and
 * useful on its own: there is no room in this column, move it.
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
  clampColumn,
  clearFullRows,
  createBoard,
  dissolveLowest,
  landingRow,
  place,
} from '@/session/puzzle/board';
import { TALLEST_SHAPE, nextShape, rotateClockwise } from '@/session/puzzle/shapes';
import { tickDissolve, tickPlacement, tickSelection } from '@/session/ui/haptics';

/**
 * What a rendered cell is showing. `air` is the hover zone above the board — it
 * is drawn as nothing at all, so the playfield still reads as a rectangle and
 * the piece reads as floating over it.
 */
type CellState = 'air' | 'empty' | 'settled' | 'active' | 'ghost';

const MAX_BOARD_WIDTH = 320;
const CELL_GAP = 3;

/**
 * Rows of empty space above the playfield for the waiting piece.
 *
 * Exactly as many as the tallest piece needs and not one more: every row here
 * comes out of the same height budget as the playfield, so the board's cells
 * shrink to pay for it. Derived from the piece set rather than written as a 3,
 * so adding a taller shape cannot silently clip it.
 */
const HOVER_ROWS = TALLEST_SHAPE;
const TOTAL_ROWS = PUZZLE.rows + HOVER_ROWS;

/**
 * The height of the control bar, named rather than written into `styles` alone,
 * because the grid's height budget is whatever is left after it and the two
 * numbers have to agree. Change one and change the other.
 *
 * One bar, not two. Move/turn sat on one row and Place on a full-width pill
 * under it, which cost 128pt of a roughly 400pt column — nearly a third of the
 * screen, spent on four buttons. Everything vertical here is taken straight out
 * of the cells: at two rows the board ran at 20pt a cell with 200pt of unused
 * width beside it, because a 6×12 grid is taller than the space it is given and
 * can never spend that width. On one row it runs at 26.
 */
const CONTROL_HEIGHT = 56;

/**
 * The floor on a cell. A board that cannot fit its rows shrinks until it can,
 * and this is where the shrinking stops — below this the shapes stop reading as
 * shapes.
 *
 * Nothing hits it, but the margin is no longer comfortable: the hover zone put
 * three more rows through the same height, which took the smallest supported
 * screen from about 27px a cell to about 19. Anything that wants more rows, or
 * more height above the board, should check this number on a small phone before
 * it is added rather than after — past the floor the grid stops shrinking and
 * starts overflowing, and the controls under it are what goes.
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
const BOARD_HEIGHT_ESTIMATE = 0.44;

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
      : box - CONTROL_HEIGHT - Spacing.four;

  const availableWidth = Math.min(width - Spacing.four * 2, MAX_BOARD_WIDTH);
  const cellSize = Math.max(
    MIN_CELL,
    Math.floor(
      Math.min(
        (availableWidth - CELL_GAP * (PUZZLE.columns - 1)) / PUZZLE.columns,
        // Against every row that is drawn, hover zone included — sizing on the
        // playfield alone would put the waiting piece past the top of the box.
        (budget - CELL_GAP * (TOTAL_ROWS - 1)) / TOTAL_ROWS,
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

    // No room at the top. Rather than ending anything, the bottom rows dissolve
    // and the same piece gets another go — see the note at the top of the file.
    if (row < 0) {
      setBoard((current) => dissolveLowest(current, PUZZLE.overflowRows));
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
   * One matrix for the renderer: the hover zone, what has settled, where the
   * piece would land, and the piece itself. The ghost is what carries most of
   * the spatial feedback — it is why the task stays readable without gravity.
   *
   * Every row of the playfield is `HOVER_ROWS` further down this grid than it is
   * in `board`, which is the only bookkeeping the hover zone costs.
   */
  const display = useMemo<CellState[][]>(() => {
    const grid: CellState[][] = [
      ...Array.from({ length: HOVER_ROWS }, () =>
        Array.from({ length: PUZZLE.columns }, (): CellState => 'air'),
      ),
      ...board.map((row) => row.map((filled) => (filled ? 'settled' : 'empty'))),
    ];

    const ghostRow = landingRow(board, piece.cells, column);
    if (ghostRow >= 0) {
      for (let r = 0; r < piece.cells.length; r += 1) {
        for (let c = 0; c < piece.cells[r].length; c += 1) {
          if (piece.cells[r][c]) grid[HOVER_ROWS + ghostRow + r][column + c] = 'ghost';
        }
      }
    }

    // The piece itself, sitting in the hover zone with its feet on the top of
    // the board — so a tall piece and a flat one both hang from the same edge
    // rather than from the top of the screen. Drawn unconditionally: there is
    // nothing up here for it to collide with, which is the whole point of the
    // zone, and drawing it only when it fit is what used to make it disappear.
    const top = HOVER_ROWS - piece.cells.length;
    for (let r = 0; r < piece.cells.length; r += 1) {
      for (let c = 0; c < piece.cells[r].length; c += 1) {
        if (piece.cells[r][c]) grid[top + r][column + c] = 'active';
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
      // Nothing at all, so the hover zone is air rather than a few more rows of
      // board that pieces mysteriously cannot be placed in.
      case 'air':
        return 'transparent';
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

      {/* Move, turn, and place, on one bar. Place keeps the whole of whatever
          is left after the three glyphs, so it is still the widest thing here
          and still the only filled one — it reads as the action even though it
          no longer runs the width of the screen. */}
      <View style={styles.controls}>
        <ControlButton label={PUZZLE_COPY.left} glyph="‹" onPress={() => move(-1)} />
        <ControlButton label={PUZZLE_COPY.rotate} glyph="⟳" onPress={rotate} />
        <ControlButton label={PUZZLE_COPY.right} glyph="›" onPress={() => move(1)} />

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
  // `alignSelf: 'stretch'` is load-bearing, not tidiness: the parent centres its
  // children, so without it this column is only as wide as the widest thing in
  // it — the grid — and the control bar underneath has the board's width to lay
  // four buttons out in rather than the screen's. Place ends up a sliver with
  // its label broken across two lines.
  root: {
    flex: 1,
    alignSelf: 'stretch',
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
  // Held to the same width the board is allowed, so the bar cannot run away on
  // a tablet — stretched across 750pt, "Place" becomes a button the size of a
  // paragraph and the three glyphs end up a screen apart from each other. On a
  // phone this is barely a crop.
  controls: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: MAX_BOARD_WIDTH,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  control: {
    width: 56,
    height: CONTROL_HEIGHT,
    borderRadius: Radius.button,
    borderWidth: StyleSheet.hairlineWidth * 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glyph: {
    lineHeight: 32,
  },
  // Everything the three glyph buttons leave, which on a phone is still half
  // the bar.
  place: {
    flex: 1,
    height: CONTROL_HEIGHT,
    borderRadius: Radius.button,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
});
