/**
 * A grid of squares, which is most of what the visuospatial games draw.
 *
 * Four of them are grids underneath — the rotation figures, the mirror pattern,
 * the punched sheet, the net's faces — and they were all going to grow their own
 * near-identical row-of-views loop with their own off-by-one on the gap. One
 * component instead, taking the matrix and a function that says what colour a
 * value is, so the games hold the rules and this holds the pixels.
 *
 * Deliberately not sized from the inside: the caller passes `cellSize` because
 * every game has a different thing competing for the same column of screen, and
 * a grid that measured itself would fight the layout it was dropped into.
 */

import { Fragment, useMemo, useRef } from 'react';
import {
  PanResponder,
  Pressable,
  StyleSheet,
  View,
  type GestureResponderEvent,
} from 'react-native';

import { Radius } from '@/constants/theme';

/**
 * How far the finger has to travel before a touch stops being a tap and becomes
 * a drag. Small, because the grid is the only thing under it and there is
 * nothing else the gesture could turn out to have meant — but not zero, or the
 * wobble in an ordinary tap would steal it from the cell's own press handler.
 */
const DRAG_SLOP = 3;

interface CellGridProps<T> {
  cells: readonly (readonly T[])[];
  cellSize: number;
  /** Space between cells. Zero makes a solid shape out of adjacent cells. */
  gap?: number;
  fillFor: (value: T, row: number, column: number) => string;
  /** A hairline around a cell, for grids where the empty squares still read. */
  borderFor?: (value: T, row: number, column: number) => string | undefined;
  /** Present makes every cell a button. Used by Mirror Complete. */
  onPressCell?: (row: number, column: number) => void;
  /**
   * Present also makes the grid drawable: a finger dragged across it reports
   * each cell it enters, once, in the order they are entered. Taps still go
   * through `onPressCell` — the drag only takes the gesture over once the touch
   * has moved past `DRAG_SLOP`, so the two do not both fire for one press.
   *
   * The caller decides what painting means. This says where the finger has
   * been, and nothing about fill or erase: a grid where dragging toggled each
   * cell it crossed would undo itself the moment a stroke doubled back.
   */
  onDragCell?: (row: number, column: number) => void;
  /** End of a stroke — lifted or interrupted. Pairs with `onDragCell`. */
  onDragEnd?: () => void;
  cellLabel?: (row: number, column: number) => string;
  accessibilityLabel?: string;
  radius?: number;
}

export function CellGrid<T>({
  cells,
  cellSize,
  gap = 3,
  fillFor,
  borderFor,
  onPressCell,
  onDragCell,
  onDragEnd,
  cellLabel,
  accessibilityLabel,
  radius = Radius.sm / 2,
}: CellGridProps<T>) {
  const grid = useRef<View>(null);
  /**
   * Where the grid sits in the window, so a touch can be turned into a cell.
   *
   * `pageX`/`pageY` rather than `locationX`/`locationY`: location is measured
   * against whichever view the touch is currently over, which during a drag is
   * one of the cells and not the grid, so the numbers would restart at every
   * boundary crossed. Page coordinates need an origin to subtract, and that is
   * what this is — refreshed on layout, which is the only thing that moves it.
   */
  const origin = useRef({ x: 0, y: 0 });
  /** The cell the stroke is in, so re-entering it does not report it twice. */
  const painted = useRef<string | null>(null);

  // Latest values, read inside a responder that is built once: the handlers
  // outlive any particular render, and a stale `cellSize` would map the finger
  // to the wrong square after the grid resizes.
  const layout = useRef({ cellSize, gap, cells });
  layout.current = { cellSize, gap, cells };
  const drag = useRef(onDragCell);
  drag.current = onDragCell;
  const dragEnd = useRef(onDragEnd);
  dragEnd.current = onDragEnd;

  const responder = useMemo(() => {
    const paint = (event: GestureResponderEvent) => {
      const { cellSize: size, gap: space, cells: rows } = layout.current;
      const pitch = size + space;
      const column = Math.floor((event.nativeEvent.pageX - origin.current.x) / pitch);
      const row = Math.floor((event.nativeEvent.pageY - origin.current.y) / pitch);

      // Off the edge: the finger has wandered out of the grid. Nothing is
      // painted and nothing is clamped — a stroke that leaves the side should
      // not smear down the last column.
      if (row < 0 || column < 0 || row >= rows.length) return;
      if (column >= (rows[row]?.length ?? 0)) return;

      const at = `${row},${column}`;
      if (at === painted.current) return;
      painted.current = at;
      drag.current?.(row, column);
    };

    const finish = () => {
      painted.current = null;
      dragEnd.current?.();
    };

    return PanResponder.create({
      // Never on touch-down. The cell's own `Pressable` owns taps, and taking
      // the gesture here would cost the grid its press feedback and its
      // accessibility actions.
      onStartShouldSetPanResponder: () => false,
      onStartShouldSetPanResponderCapture: () => false,
      // On movement, though, take it away from the cell — capture, because by
      // then the `Pressable` under the finger is already the responder and only
      // an ancestor claiming the gesture ahead of it can get it back.
      onMoveShouldSetPanResponderCapture: (_event, state) =>
        Math.abs(state.dx) + Math.abs(state.dy) > DRAG_SLOP,
      onPanResponderGrant: paint,
      onPanResponderMove: paint,
      onPanResponderRelease: finish,
      onPanResponderTerminate: finish,
    });
  }, []);

  return (
    <View
      ref={grid}
      // Android flattens plain container views into their parent, and a view
      // that is not in the tree cannot be measured — which is the one thing the
      // drag depends on.
      collapsable={false}
      accessible={!onPressCell}
      accessibilityLabel={accessibilityLabel}
      onLayout={() =>
        grid.current?.measureInWindow((x, y) => {
          origin.current = { x, y };
        })
      }
      style={{ gap }}
      {...(onDragCell ? responder.panHandlers : null)}>
      {cells.map((row, rowIndex) => (
        <View key={rowIndex} style={[styles.row, { gap }]}>
          {row.map((value, columnIndex) => {
            const style = [
              {
                width: cellSize,
                height: cellSize,
                borderRadius: radius,
                backgroundColor: fillFor(value, rowIndex, columnIndex),
              },
              borderFor?.(value, rowIndex, columnIndex)
                ? {
                    borderWidth: StyleSheet.hairlineWidth * 2,
                    borderColor: borderFor(value, rowIndex, columnIndex),
                  }
                : null,
            ];

            return (
              <Fragment key={columnIndex}>
                {onPressCell ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={cellLabel?.(rowIndex, columnIndex)}
                    onPress={() => onPressCell(rowIndex, columnIndex)}
                    style={({ pressed }) => [style, pressed && styles.pressed]}
                  />
                ) : (
                  <View style={style} />
                )}
              </Fragment>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
  },
  pressed: {
    opacity: 0.6,
  },
});
