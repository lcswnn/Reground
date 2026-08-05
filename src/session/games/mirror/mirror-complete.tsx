/**
 * Mirror Complete — half a shape, and the half the player puts back.
 *
 * The only game here that is not a multiple choice, and deliberately so: it has
 * no wrong-answer moment at all. A cell tapped by mistake is tapped off again,
 * so at any point the pattern is either finished or not finished yet, and there
 * is nothing to be told about how you are doing. That makes it the gentlest
 * thing on the list, which is worth having on a list this long.
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

  const toggle = useCallback(
    (row: number, column: number) => {
      // The given half is the question. Tapping it does nothing rather than
      // rubbing out what is being copied.
      if (done || isGivenHalf({ row, column }, axis, size)) return;

      // Worked out against the current state rather than inside an updater:
      // this decides whether the pattern is finished, which starts a timer and
      // fires a haptic, and an updater that React chooses to run twice would do
      // both of those twice.
      const already = placed.some((cell) => cell.row === row && cell.column === column);
      const next = already
        ? placed.filter((cell) => !(cell.row === row && cell.column === column))
        : [...placed, { row, column }];

      setPlaced(next);
      if (already) tickDissolve();
      else tickSelection();

      if (isComplete(next, pattern)) {
        tickPlacement();
        setDone(true);
        timer.current = setTimeout(() => {
          setPattern(buildPattern());
          setPlaced([]);
          setDone(false);
        }, SETTLE_MS);
      }
    },
    [axis, done, pattern, placed, size],
  );

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
