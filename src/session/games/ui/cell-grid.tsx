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

import { Fragment } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Radius } from '@/constants/theme';

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
  cellLabel,
  accessibilityLabel,
  radius = Radius.sm / 2,
}: CellGridProps<T>) {
  return (
    <View
      accessible={!onPressCell}
      accessibilityLabel={accessibilityLabel}
      style={{ gap }}>
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
