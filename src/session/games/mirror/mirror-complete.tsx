/**
 * Mirror Complete — half a shape, and the half the player puts back.
 *
 * The only game here that is not a multiple choice, and deliberately so: it has
 * no wrong-answer moment at all. A cell tapped by mistake is tapped off again,
 * so at any point the pattern is either finished or not finished yet, and there
 * is nothing to be told about how you are doing. That makes it the gentlest
 * thing on the list, which is worth having on a list this long.
 *
 * Cells can be tapped one at a time or drawn through in a stroke. Both end up
 * in `change`; what the stroke adds is a mode, decided once by the cell it
 * starts on, so that dragging across the grid draws a shape rather than
 * inverting whatever it passes over. See `paint`.
 *
 * The axis is drawn, faintly, down the middle. It is not decoration — a
 * reflection needs a line to be a reflection about, and on a grid this small the
 * line between two columns is otherwise something the player has to take on
 * trust from the shape of the given half.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { MIRROR_COMPLETE } from '@/content/strings';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { withAlpha } from '@/lib/color';
import { CellGrid } from '@/session/games/ui/cell-grid';
import { tickDissolve, tickPlacement, tickSelection } from '@/session/ui/haptics';
import {
  buildPattern,
  isComplete,
  isGivenHalf,
  type Cell,
} from '@/session/games/mirror/pattern';

type CellState = 'given' | 'blank' | 'placed' | 'open';

const CELL_GAP = 3;
const MAX_CELL = 46;
const MIN_CELL = 18;
const BOX_ESTIMATE = { width: 300, height: 300 };
/** How long the finished pattern stays up before the next one. */
const SETTLE_MS = 1_600;

export function MirrorComplete() {
  const theme = useTheme();
  const [pattern, setPattern] = useState(() => buildPattern());
  const [placed, setPlaced] = useState<Cell[]>([]);
  const [done, setDone] = useState(false);
  const [box, setBox] = useState(BOX_ESTIMATE);

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const { size, axis } = pattern;
  const cellSize = Math.max(
    MIN_CELL,
    Math.min(
      MAX_CELL,
      (Math.min(box.width, box.height) - CELL_GAP * (size - 1)) / size,
    ),
  );
  const gridSize = cellSize * size + CELL_GAP * (size - 1);

  const filled = new Set(pattern.filled.map((cell) => `${cell.row},${cell.column}`));
  const taken = new Set(placed.map((cell) => `${cell.row},${cell.column}`));

  const cells: CellState[][] = Array.from({ length: size }, (_, row) =>
    Array.from({ length: size }, (_, column) => {
      const at = `${row},${column}`;
      if (isGivenHalf({ row, column }, axis, size)) {
        return filled.has(at) ? 'given' : 'blank';
      }
      return taken.has(at) ? 'placed' : 'open';
    }),
  );

  /**
   * The same two facts as `placed` and `done`, kept where a gesture can read
   * them. A drag crosses several cells between renders, so a handler working
   * from the state in its closure would decide each of them against the grid as
   * it looked when the stroke began — the second cell of a stroke would undo
   * the first. These are written at the same moment the state is.
   */
  const placedNow = useRef<Cell[]>([]);
  const doneNow = useRef(false);

  const change = useCallback(
    (row: number, column: number, intent: 'toggle' | 'place' | 'lift') => {
      // The given half is the question. Tapping it does nothing rather than
      // rubbing out what is being copied.
      if (doneNow.current || isGivenHalf({ row, column }, axis, size)) return;

      // Worked out against the current state rather than inside an updater:
      // this decides whether the pattern is finished, which starts a timer and
      // fires a haptic, and an updater that React chooses to run twice would do
      // both of those twice.
      const current = placedNow.current;
      const already = current.some((cell) => cell.row === row && cell.column === column);
      const fill = intent === 'toggle' ? !already : intent === 'place';
      // A stroke re-crossing its own cells, or a tap on a cell that is already
      // what the tap would make it. Silent — no state, no haptic.
      if (fill === already) return;

      const next = fill
        ? [...current, { row, column }]
        : current.filter((cell) => !(cell.row === row && cell.column === column));

      placedNow.current = next;
      setPlaced(next);
      if (fill) tickSelection();
      else tickDissolve();

      if (isComplete(next, pattern)) {
        tickPlacement();
        doneNow.current = true;
        setDone(true);
        timer.current = setTimeout(() => {
          placedNow.current = [];
          doneNow.current = false;
          setPattern(buildPattern());
          setPlaced([]);
          setDone(false);
        }, SETTLE_MS);
      }
    },
    [axis, pattern, size],
  );

  const toggle = useCallback(
    (row: number, column: number) => change(row, column, 'toggle'),
    [change],
  );

  /**
   * Fill or erase, fixed for the whole stroke by the first cell it reaches: a
   * drag that starts on an empty square fills, one that starts on a placed
   * square rubs out. Deciding per cell instead would make a stroke across a
   * half-drawn shape invert it rather than extend it, and a stroke that doubled
   * back would erase itself.
   *
   * Null between strokes. Cells in the given half are skipped without settling
   * it, so a drag that begins over the given half still picks up its mode from
   * the first cell it reaches that the player is allowed to change.
   */
  const stroke = useRef<'place' | 'lift' | null>(null);

  const paint = useCallback(
    (row: number, column: number) => {
      if (doneNow.current || isGivenHalf({ row, column }, axis, size)) return;

      if (stroke.current === null) {
        const already = placedNow.current.some(
          (cell) => cell.row === row && cell.column === column,
        );
        stroke.current = already ? 'lift' : 'place';
      }

      change(row, column, stroke.current);
    },
    [axis, change, size],
  );

  const endStroke = useCallback(() => {
    stroke.current = null;
  }, []);

  const fillFor = (state: CellState): string => {
    switch (state) {
      case 'given':
        return theme.brand;
      // A shade off the given half rather than the same ink: what the player
      // put there stays legible as theirs while they are checking it.
      case 'placed':
        return withAlpha(theme.brand, 0.62);
      case 'open':
        return theme.backgroundElement;
      default:
        return withAlpha(theme.brand, 0.06);
    }
  };

  return (
    <View style={styles.root}>
      <ThemedText type="small" themeColor="textMuted" style={styles.prompt}>
        {MIRROR_COMPLETE.prompt}
      </ThemedText>

      <View
        style={styles.stage}
        onLayout={(event) =>
          setBox({
            width: event.nativeEvent.layout.width,
            height: event.nativeEvent.layout.height,
          })
        }>
        <View>
          <CellGrid
            cells={cells}
            cellSize={cellSize}
            gap={CELL_GAP}
            fillFor={fillFor}
            borderFor={(state) => (state === 'open' ? theme.border : undefined)}
            onPressCell={toggle}
            onDragCell={paint}
            onDragEnd={endStroke}
            cellLabel={(row, column) =>
              MIRROR_COMPLETE.cellLabel(row + 1, column + 1)
            }
          />

          {/* Centred on the grid rather than on a column boundary, which for an
              even grid is the same line — see `SIZE` in `pattern.ts`. */}
          <View
            pointerEvents="none"
            style={[
              styles.axis,
              axis === 'vertical'
                ? { left: gridSize / 2 - 1, top: 0, width: 2, height: gridSize }
                : { top: gridSize / 2 - 1, left: 0, height: 2, width: gridSize },
              { backgroundColor: withAlpha(theme.brand, 0.3) },
            ]}
          />
        </View>
      </View>

      <ThemedText type="small" themeColor="textMuted" style={styles.status}>
        {done ? MIRROR_COMPLETE.done : ' '}
      </ThemedText>
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
  status: {
    textAlign: 'center',
  },
  axis: {
    position: 'absolute',
  },
});
