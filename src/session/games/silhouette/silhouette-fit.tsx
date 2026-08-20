/**
 * Silhouette Fit — turn a piece, then drag it into the outline.
 *
 * ## The rotation lock
 *
 * A piece is turned in the tray, before it is picked up, and cannot be turned
 * while it is being dragged. That single constraint is what keeps this a
 * spatial task: without it the fastest way to solve one of these is to hold a
 * piece over a gap and mash rotate until the ghost goes solid, which is a
 * search, not an act of imagination. Having to decide the orientation while the
 * piece is still over on the tray means picturing it in the gap first.
 *
 * A drop is likewise final — there is no nudging a piece a cell to the left
 * once it is down.
 *
 * ## But nothing is ever stuck
 *
 * Any placement that fits is allowed, including ones that make the puzzle
 * unfinishable, and there is no hint system to warn anybody. So taking a piece
 * back has to be easy, or this becomes the one thing the app cannot have —
 * someone stranded in front of a puzzle that cannot be finished, in a step whose
 * whole purpose is that there is no way to fail it.
 *
 * That is not a softening of the rule above. Taking a piece back costs the whole
 * placement: it returns to the tray to be aimed again, not to the cell next
 * door. There are three ways to do it, because one was not enough:
 *
 * - **Touch a placed piece and it comes up**, whatever else is selected. It used
 *   to be ignored while another piece was in hand, which was a dead end with no
 *   way out of it — nothing on screen deselects a piece, so a board with a
 *   misplaced piece and a piece in hand could not be untangled at all. Letting
 *   go without moving puts it straight back, so a stray touch costs nothing;
 *   this replaces a tap that used to remove a piece outright, which is the
 *   wrong thing for the clumsiest gesture on the screen to do.
 * - **Drag it off the outline and let go.** Out of bounds is just another
 *   placement that doesn't fit, so the piece stays in the tray. The board used
 *   to clamp the finger to the grid, which made dragging a piece away from the
 *   board mean nothing at all.
 * - **Undo**, next to the rotate button, which takes back the last placement.
 *   The two gestures above are only discoverable by trying them; this is a
 *   control that is simply there, and it is the only one a screen reader can
 *   reach.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type GestureResponderEvent,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { SILHOUETTE } from '@/content/strings';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { withAlpha } from '@/lib/color';
import { CellGrid } from '@/session/games/ui/cell-grid';
import { tickDissolve, tickPlacement, tickSelection } from '@/session/ui/haptics';
import {
  BOARDS,
  cellsAt,
  fits,
  outlineSize,
  rotateCells,
  type Grid,
  type Puzzle,
} from '@/session/games/silhouette/puzzles';

type CellState = 'outside' | 'empty' | 'settled' | 'ghost' | 'blocked';

interface TrayPiece {
  id: string;
  /** Already turned: what is in the tray is what will be dropped. */
  cells: Grid;
}

interface Placement extends TrayPiece {
  row: number;
  column: number;
}

/**
 * A drag in progress: the cell under the finger, and where in the piece the
 * finger took hold of it.
 *
 * The offset is the half that matters. A piece picked out of the tray is taken
 * by its middle, so it sits centred under the finger rather than trailing
 * behind it by half its own width. A piece picked up off the board is taken by
 * the cell that was actually touched, so it stays exactly where it was until
 * the finger moves — it used to snap its middle to the touch the instant it was
 * grabbed, which reads as the board rearranging itself rather than as picking
 * something up.
 *
 * `row` and `column` are not clamped to the grid, so dragging away from the
 * board gives coordinates outside it, and `fits` rejects them like any other bad
 * placement. That is the whole of "drag it off to take it back".
 */
interface Drag {
  row: number;
  column: number;
  offsetRow: number;
  offsetColumn: number;
}

const CELL_GAP = 2;
/**
 * The board takes the width it is given, up to this.
 *
 * Generous on purpose: the pieces are dropped with a finger, and a cell smaller
 * than a fingertip turns aiming into the difficulty. On a phone the five-column
 * puzzles hit the width limit well before this, so it only really binds on a
 * tablet, where a board that kept phone-sized cells would sit marooned in the
 * middle of the screen.
 */
const MAX_CELL = 64;
const MIN_CELL = 16;
/**
 * How big a tray piece's cells are drawn.
 *
 * Was 9, which put a three-cell piece inside 27 points and left the tray a row
 * of small dark smudges — and the shape of a piece in the tray is the entire
 * question this game asks. The tray scrolls, so the extra width costs nothing
 * but a scroll on the largest puzzle.
 */
const TRAY_CELL = 13;
const CONTROL_HEIGHT = 56;
const BOX_ESTIMATE = { width: 300, height: 260 };
/** How long a finished silhouette is left up before the next puzzle. */
const SETTLE_MS = 2_000;

/**
 * The pieces as the tray first shows them: turned at random, so that every one
 * of them has to be turned back.
 *
 * Never left in its solved orientation, which is what the retry is for — a
 * piece handed over already the right way up is a piece dropped without a
 * thought, and on a three-piece puzzle that is a third of the game gone.
 */
function scramble(puzzle: Puzzle): TrayPiece[] {
  return puzzle.pieces.map((piece) => {
    let cells = piece.cells;
    const turns = 1 + Math.floor(Math.random() * 3);

    for (let i = 0; i < turns; i += 1) cells = rotateCells(cells);
    // A piece with two-fold symmetry comes back to itself after two turns; one
    // more turn is guaranteed to move it, because the set has no piece that
    // every turn leaves alone (`puzzles.test.ts`).
    if (JSON.stringify(cells) === JSON.stringify(piece.cells)) cells = rotateCells(cells);

    return { id: piece.id, cells };
  });
}

export function SilhouetteFit() {
  const theme = useTheme();

  const [index, setIndex] = useState(0);
  const puzzle = BOARDS[index];

  /**
   * Every piece in the puzzle at its current orientation, placed or not — the
   * tray is derived from it rather than being its own list.
   *
   * Two lists is what it was, and taking a piece back meant appending it to the
   * tray, so the tray silently reordered itself every time. On a five-piece
   * puzzle that is the row of shapes you are choosing from shuffling underneath
   * you as a reward for changing your mind.
   */
  const [pieces, setPieces] = useState<TrayPiece[]>(() => scramble(BOARDS[0]));
  const [placed, setPlaced] = useState<Placement[]>([]);
  const [held, setHeld] = useState<string | null>(null);
  const [drag, setDrag] = useState<Drag | null>(null);
  const [done, setDone] = useState(false);
  const [box, setBox] = useState(BOX_ESTIMATE);

  const tray = pieces.filter(
    (piece) => !placed.some((placement) => placement.id === piece.id),
  );

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const cellSize = Math.max(
    MIN_CELL,
    Math.min(
      MAX_CELL,
      (box.width - CELL_GAP * (puzzle.columns - 1)) / puzzle.columns,
      (box.height - CELL_GAP * (puzzle.rows - 1)) / puzzle.rows,
    ),
  );
  const step = cellSize + CELL_GAP;
  const gridWidth = cellSize * puzzle.columns + CELL_GAP * (puzzle.columns - 1);
  const gridHeight = cellSize * puzzle.rows + CELL_GAP * (puzzle.rows - 1);

  // Looked up in `pieces` rather than in the derived tray: a held piece is never
  // a placed one — `held` is cleared the moment a placement lands — so the two
  // give the same answer, and this one is a read straight off state.
  const heldPiece = pieces.find((piece) => piece.id === held) ?? null;
  const taken = useMemo(() => {
    const cells = new Set<string>();
    for (const placement of placed) {
      for (const cell of cellsAt(placement.cells, placement.row, placement.column)) {
        cells.add(`${cell.row},${cell.column}`);
      }
    }
    return cells;
  }, [placed]);

  /** Where the dragged piece's top-left corner sits, given where it was taken by. */
  const anchor = useCallback(
    (at: Drag) => ({
      row: at.row - at.offsetRow,
      column: at.column - at.offsetColumn,
    }),
    [],
  );

  const display = useMemo<CellState[][]>(() => {
    const grid: CellState[][] = puzzle.outline.map((row) =>
      row.map((inside) => (inside ? 'empty' : 'outside')),
    );

    for (const key of taken) {
      const [row, column] = key.split(',').map(Number);
      grid[row][column] = 'settled';
    }

    if (heldPiece && drag) {
      const corner = anchor(drag);
      const legal = fits(puzzle, taken, heldPiece.cells, corner.row, corner.column);

      for (const cell of cellsAt(heldPiece.cells, corner.row, corner.column)) {
        // Cells outside the grid are simply not drawn; the illegal placement is
        // already being said by every other cell of the piece.
        if (grid[cell.row]?.[cell.column] === undefined) continue;
        grid[cell.row][cell.column] = legal ? 'ghost' : 'blocked';
      }
    }

    return grid;
  }, [anchor, drag, heldPiece, puzzle, taken]);

  const startNextPuzzle = useCallback(() => {
    const next = (index + 1) % BOARDS.length;
    setIndex(next);
    setPieces(scramble(BOARDS[next]));
    setPlaced([]);
    setHeld(null);
    setDrag(null);
    setDone(false);
  }, [index]);

  /**
   * Which cell the finger is over — deliberately not clamped to the board.
   *
   * Off the top or the side gives a negative row or one past the last column,
   * which `fits` rejects the same way it rejects any placement that isn't
   * wholly inside the outline. Clamping was what made dragging a piece away
   * from the board a no-op instead of the obvious way to put it back.
   */
  const cellUnder = (event: GestureResponderEvent) => ({
    row: Math.floor(event.nativeEvent.locationY / step),
    column: Math.floor(event.nativeEvent.locationX / step),
  });

  /** The placed piece covering a cell, if any. */
  const placedAt = (at: { row: number; column: number }) =>
    placed.find((placement) =>
      cellsAt(placement.cells, placement.row, placement.column).some(
        (cell) => cell.row === at.row && cell.column === at.column,
      ),
    );

  const onGrant = (event: GestureResponderEvent) => {
    if (done) return;

    const at = cellUnder(event);
    const under = placedAt(at);

    // Touching a piece that is down always picks that piece up, whatever is
    // selected — see the note at the top of the file. It takes hold of the exact
    // cell that was touched, so nothing moves until the finger does, and a touch
    // released without moving lands it back where it was. Picking up is a
    // selection rather than an impact; the tick for a piece actually leaving the
    // board is fired on release, by the drop that doesn't fit.
    if (under) {
      setPlaced((current) => current.filter((placement) => placement.id !== under.id));
      setHeld(under.id);
      setDrag({
        ...at,
        offsetRow: at.row - under.row,
        offsetColumn: at.column - under.column,
      });
      tickSelection();
      return;
    }

    // Otherwise this is the selected piece being aimed, taken by its middle: a
    // piece that trails behind the touch by half its own width is a piece you
    // aim by trial and error.
    if (heldPiece) {
      setDrag({
        ...at,
        offsetRow: Math.floor((heldPiece.cells.length - 1) / 2),
        offsetColumn: Math.floor((heldPiece.cells[0].length - 1) / 2),
      });
    }
  };

  const onMove = (event: GestureResponderEvent) => {
    if (done) return;
    setDrag((current) => (current ? { ...current, ...cellUnder(event) } : null));
  };

  const onRelease = () => {
    if (!heldPiece || !drag) {
      setDrag(null);
      return;
    }

    const corner = anchor(drag);
    setDrag(null);

    if (!fits(puzzle, taken, heldPiece.cells, corner.row, corner.column)) {
      // The piece stays in the tray, still selected, ready to be aimed again.
      // No shake and no sound beyond the one tick: a placement that does not fit
      // is a thing that did not happen, not a mistake that needs marking. This
      // is also the landing for a piece dragged off the board on purpose.
      tickDissolve();
      return;
    }

    const placement: Placement = { ...heldPiece, row: corner.row, column: corner.column };
    setPlaced((current) => [...current, placement]);
    setHeld(null);
    tickPlacement();

    if (taken.size + cellsAt(heldPiece.cells, 0, 0).length === outlineSize(puzzle)) {
      setDone(true);
      timer.current = setTimeout(startNextPuzzle, SETTLE_MS);
    }
  };

  /**
   * The last placement, back to the tray and into the hand.
   *
   * The button version of picking a piece up off the board. It exists because
   * both of the gestures that do the same thing have to be guessed at, and
   * because it is the only one of the three a screen reader can operate.
   */
  const undoLast = () => {
    const last = placed[placed.length - 1];
    if (done || !last) return;

    setPlaced((current) => current.slice(0, -1));
    setHeld(last.id);
    setDrag(null);
    tickDissolve();
  };

  const turnHeld = () => {
    if (!heldPiece || done) return;

    tickSelection();
    setPieces((current) =>
      current.map((piece) =>
        piece.id === heldPiece.id ? { ...piece, cells: rotateCells(piece.cells) } : piece,
      ),
    );
  };

  const fillFor = (state: CellState): string => {
    switch (state) {
      case 'settled':
        return withAlpha(theme.brand, 0.62);
      case 'ghost':
        return withAlpha(theme.brand, 0.3);
      case 'blocked':
        return withAlpha(theme.brand, 0.12);
      case 'empty':
        return theme.backgroundElement;
      default:
        // Outside the silhouette. Nothing at all, so the outline is a shape on
        // the page rather than a rectangle with a shape marked inside it.
        return 'transparent';
    }
  };

  return (
    <View style={styles.root}>
      {/* Four states, and the third is the one that was missing: someone who has
          put a piece down and let go is the only person for whom "you can take
          it back out" is useful information, so that is when it is said. */}
      <ThemedText type="small" themeColor="textMuted" style={styles.prompt}>
        {done
          ? SILHOUETTE.done
          : held
            ? SILHOUETTE.holding
            : placed.length > 0
              ? SILHOUETTE.lift
              : SILHOUETTE.prompt}
      </ThemedText>

      <View
        style={styles.stage}
        onLayout={(event) =>
          setBox({
            width: event.nativeEvent.layout.width,
            height: event.nativeEvent.layout.height,
          })
        }>
        {/* The responder sits on a view the exact size of the grid, so a touch's
            `locationX` is already in board coordinates — no measuring, and
            nothing to go stale when the layout changes. */}
        <View
          style={{ width: gridWidth, height: gridHeight }}
          accessibilityLabel={SILHOUETTE.boardLabel}
          onStartShouldSetResponder={() => true}
          onMoveShouldSetResponder={() => true}
          onResponderTerminationRequest={() => false}
          onResponderGrant={onGrant}
          onResponderMove={onMove}
          onResponderRelease={onRelease}
          onResponderTerminate={onRelease}>
          <CellGrid
            cells={display}
            cellSize={cellSize}
            gap={CELL_GAP}
            fillFor={fillFor}
            borderFor={(state) =>
              state === 'blocked' ? theme.brand : state === 'empty' ? theme.border : undefined
            }
          />
        </View>
      </View>

      <View style={styles.controls}>
        {/* `flexShrink` on the scroller, not just `flex`: without it the tray
            sizes to its contents and walks the two buttons off the right-hand
            edge on the five-piece puzzle. */}
        <ScrollView
          horizontal
          // Scrolls when the tray has more pieces than fit and sits still when
          // it does not — a tray that springs sideways under a finger looks
          // like it is hiding a piece.
          bounces={false}
          overScrollMode="never"
          showsHorizontalScrollIndicator={false}
          style={styles.trayScroll}
          contentContainerStyle={styles.tray}>
          {tray.map((piece) => (
            <Pressable
              key={piece.id}
              accessibilityRole="button"
              accessibilityState={{ selected: piece.id === held }}
              accessibilityLabel={SILHOUETTE.pieceLabel}
              onPress={() => {
                setHeld(piece.id);
                tickSelection();
              }}
              style={[
                styles.trayItem,
                {
                  backgroundColor:
                    piece.id === held ? theme.backgroundSelected : theme.background,
                  borderColor: piece.id === held ? theme.brand : theme.border,
                },
              ]}>
              <CellGrid
                cells={piece.cells}
                cellSize={TRAY_CELL}
                gap={1}
                fillFor={(cell) => (cell ? theme.brand : 'transparent')}
              />
            </Pressable>
          ))}
        </ScrollView>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={SILHOUETTE.undo}
          accessibilityState={{ disabled: placed.length === 0 || done }}
          disabled={placed.length === 0 || done}
          onPress={undoLast}
          style={({ pressed }) => [
            styles.control,
            { backgroundColor: theme.backgroundElement, borderColor: theme.border },
            (placed.length === 0 || done) && styles.disabled,
            pressed && styles.pressed,
          ]}>
          <ThemedText type="subtitle" style={styles.glyph}>
            {SILHOUETTE.undoGlyph}
          </ThemedText>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={SILHOUETTE.rotate}
          accessibilityState={{ disabled: !heldPiece }}
          disabled={!heldPiece}
          onPress={turnHeld}
          style={({ pressed }) => [
            styles.control,
            { backgroundColor: theme.backgroundElement, borderColor: theme.border },
            !heldPiece && styles.disabled,
            pressed && styles.pressed,
          ]}>
          <ThemedText type="subtitle" style={styles.glyph}>
            {SILHOUETTE.rotateGlyph}
          </ThemedText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignSelf: 'stretch',
    gap: Spacing.three,
  },
  prompt: {
    textAlign: 'center',
  },
  stage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  trayScroll: {
    flexGrow: 1,
    flexShrink: 1,
  },
  tray: {
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.one,
  },
  trayItem: {
    minWidth: CONTROL_HEIGHT,
    height: CONTROL_HEIGHT,
    paddingHorizontal: Spacing.two,
    borderRadius: Radius.button,
    borderWidth: StyleSheet.hairlineWidth * 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  control: {
    width: CONTROL_HEIGHT,
    height: CONTROL_HEIGHT,
    borderRadius: Radius.button,
    borderWidth: StyleSheet.hairlineWidth * 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glyph: {
    lineHeight: 32,
  },
  disabled: {
    opacity: 0.4,
  },
  pressed: {
    opacity: 0.7,
  },
});
