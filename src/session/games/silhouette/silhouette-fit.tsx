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
 * ## But a piece can be lifted back out
 *
 * Any placement that fits is allowed, including ones that make the puzzle
 * unfinishable, and there is no hint system to warn anybody. So tapping a piece
 * that is already down lifts it back to the tray. That is not a softening of the
 * rule above: lifting is deliberate, it costs the placement entirely, and the
 * piece comes back to the tray to be aimed again. What it prevents is the one
 * outcome this app cannot have — someone stuck in front of a puzzle that cannot
 * be finished, in a step whose whole purpose is that there is no way to fail it.
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
const TRAY_CELL = 9;
const CONTROL_HEIGHT = 52;
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

  const [tray, setTray] = useState<TrayPiece[]>(() => scramble(BOARDS[0]));
  const [placed, setPlaced] = useState<Placement[]>([]);
  const [held, setHeld] = useState<string | null>(null);
  const [drag, setDrag] = useState<{ row: number; column: number } | null>(null);
  const [done, setDone] = useState(false);
  const [box, setBox] = useState(BOX_ESTIMATE);

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

  const heldPiece = tray.find((piece) => piece.id === held) ?? null;
  const taken = useMemo(() => {
    const cells = new Set<string>();
    for (const placement of placed) {
      for (const cell of cellsAt(placement.cells, placement.row, placement.column)) {
        cells.add(`${cell.row},${cell.column}`);
      }
    }
    return cells;
  }, [placed]);

  /** Where the held piece's top-left corner goes, for a finger at (row, column). */
  const anchor = useCallback(
    (at: { row: number; column: number }, cells: Grid) => ({
      // Centred under the finger rather than hung from its top-left corner: a
      // piece that trails behind the touch by half its own width is a piece you
      // aim by trial and error.
      row: at.row - Math.floor((cells.length - 1) / 2),
      column: at.column - Math.floor((cells[0].length - 1) / 2),
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
      const corner = anchor(drag, heldPiece.cells);
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
    setTray(scramble(BOARDS[next]));
    setPlaced([]);
    setHeld(null);
    setDrag(null);
    setDone(false);
  }, [index]);

  const cellUnder = (event: GestureResponderEvent) => ({
    row: Math.max(
      0,
      Math.min(puzzle.rows - 1, Math.floor(event.nativeEvent.locationY / step)),
    ),
    column: Math.max(
      0,
      Math.min(puzzle.columns - 1, Math.floor(event.nativeEvent.locationX / step)),
    ),
  });

  /** Tapping a piece that is already down takes it back — see the note above. */
  const lift = (at: { row: number; column: number }) => {
    const found = placed.find((placement) =>
      cellsAt(placement.cells, placement.row, placement.column).some(
        (cell) => cell.row === at.row && cell.column === at.column,
      ),
    );
    if (!found) return;

    setPlaced((current) => current.filter((placement) => placement.id !== found.id));
    setTray((current) => [...current, { id: found.id, cells: found.cells }]);
    setHeld(found.id);
    tickDissolve();
  };

  const onGrant = (event: GestureResponderEvent) => {
    if (done) return;

    const at = cellUnder(event);
    if (heldPiece) setDrag(at);
    else lift(at);
  };

  const onMove = (event: GestureResponderEvent) => {
    if (done || !heldPiece) return;
    setDrag(cellUnder(event));
  };

  const onRelease = () => {
    if (!heldPiece || !drag) {
      setDrag(null);
      return;
    }

    const corner = anchor(drag, heldPiece.cells);
    setDrag(null);

    if (!fits(puzzle, taken, heldPiece.cells, corner.row, corner.column)) {
      // Nothing happens, and the piece stays in hand. No shake, no sound: a
      // placement that does not fit is a thing that did not happen, not a
      // mistake that needs marking.
      tickDissolve();
      return;
    }

    const placement: Placement = { ...heldPiece, row: corner.row, column: corner.column };
    setPlaced((current) => [...current, placement]);
    setTray((current) => current.filter((piece) => piece.id !== heldPiece.id));
    setHeld(null);
    tickPlacement();

    if (taken.size + cellsAt(heldPiece.cells, 0, 0).length === outlineSize(puzzle)) {
      setDone(true);
      timer.current = setTimeout(startNextPuzzle, SETTLE_MS);
    }
  };

  const turnHeld = () => {
    if (!heldPiece) return;

    tickSelection();
    setTray((current) =>
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
      <ThemedText type="small" themeColor="textMuted" style={styles.prompt}>
        {done ? SILHOUETTE.done : held ? SILHOUETTE.holding : SILHOUETTE.prompt}
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
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
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
          accessibilityLabel={SILHOUETTE.rotate}
          accessibilityState={{ disabled: !heldPiece }}
          disabled={!heldPiece}
          onPress={turnHeld}
          style={({ pressed }) => [
            styles.rotate,
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
  tray: {
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.one,
  },
  trayItem: {
    minWidth: CONTROL_HEIGHT,
    height: CONTROL_HEIGHT,
    paddingHorizontal: Spacing.two,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth * 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rotate: {
    width: CONTROL_HEIGHT,
    height: CONTROL_HEIGHT,
    borderRadius: Radius.md,
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
