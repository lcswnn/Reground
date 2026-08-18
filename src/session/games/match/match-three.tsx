/**
 * Line Up Three — the casual match puzzle, on the calm shelf.
 *
 * The rules are the ones nearly everybody has already played somewhere: tap two
 * neighbours to swap them, three in a line clears, the rest falls in. That
 * familiarity is most of the argument for it being here. Both branches that get
 * this shelf — the news, and the personal one — are reaching for something to do
 * with their hands, not a task to learn, and a game whose whole instruction is
 * "swap two" starts on the first tap rather than after a demonstration.
 *
 * The evidence behind it is the East Carolina work on PopCap's casual puzzles:
 * short sessions with one of these produced measurable drops in anxiety and
 * lifts in mood. That is a finding about a genre and a dose, not about anything
 * competing with a mental image, so this claims none of the visuospatial
 * mechanism and sits with the games that promise a few minutes of something to
 * do. See `GameKind` in `games/catalog.ts`.
 *
 * ## The two things taken out of it
 *
 * **The score.** No points, no cascade bonus, no level, no target. A chain here
 * is worth exactly what it looks like, which is nice to watch. This is the rule
 * the whole shelf is built on — a number going up turns a distraction into a
 * performance, and a number that stops going up turns it into a loss.
 *
 * **The clock.** Every version of this game in the wild is racing something. No
 * move here expires, and a board with no legal swap left deals itself out again
 * rather than ending — see `reshuffle` in `board.ts`, which is the same answer
 * the tiles next door give a full board.
 *
 * ## Why the pieces are shapes
 *
 * Because the palette is one ink on one paper. A board coded by colour would be
 * five greys, and the version of this that works in a colour scheme with no
 * colours in it happens to be the version that works for anyone who would have
 * struggled with the colours anyway.
 *
 * ## Why they slide rather than redraw
 *
 * Same reason as the merge board next door: a board that jumps from one
 * arrangement to the next is unreadable, and a fall is indistinguishable from a
 * repaint. So the board is drawn as absolutely positioned pieces that keep their
 * identity across a swap, a clear and a fall (`Piece.id`), animating between
 * squares — and a piece created at the top starts above the board (`Piece.spawn`)
 * so it is seen arriving rather than appearing.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { LayoutChangeEvent, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { MATCH_THREE } from '@/content/strings';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { mix } from '@/lib/color';
import { tickDissolve, tickPlacement, tickSelection } from '@/session/ui/haptics';
import {
  SIZE,
  areNeighbours,
  collapse,
  createBoard,
  findMatches,
  hasMove,
  reshuffle,
  swap,
  type Cell,
  type Kind,
  type Piece,
} from '@/session/games/match/board';

/** Space between squares, and the same again around the outside of the board. */
const GAP = 6;
/** Not full width on a tablet: past this the board is a reach rather than a glance. */
const MAX_BOARD = 380;
const BOX_ESTIMATE = { width: 300, height: 300 };

/** How long a swap takes. Short — this is legibility, not flourish. */
const MOVE_MS = 130;
/** How long a matched line is left on screen, shrinking, before it goes. */
const CLEAR_MS = 190;
/** The drop. Longer than a swap, because a piece can cross the whole board. */
const FALL_MS = 220;
/** How long a stuck board is left up before it deals itself out again. */
const SETTLE_MS = 900;

type Timer = ReturnType<typeof setTimeout>;

/** Everything `settleBoard` needs to move the board on. All of it stable. */
interface Settling {
  after: (ms: number, run: () => void) => void;
  setPieces: (pieces: Piece[]) => void;
  setClearing: (ids: ReadonlySet<number>) => void;
  setPhase: (phase: 'swap' | 'fall') => void;
  setStuck: (stuck: boolean) => void;
  setBusy: (busy: boolean) => void;
}

/**
 * Clear what is matched, drop what is above it, and look again — the cascade,
 * one pass per step, until the board has nothing left to do on its own.
 *
 * Takes the board to judge rather than reading it back out of state, because
 * every call after the first is already inside a timeout that was scheduled
 * before the state it would have read was set.
 *
 * Outside the component, and not for tidiness: it calls itself, and a function
 * defined in a hook cannot refer to itself without either a ref to hold it or a
 * dependency it cannot have. Everything it touches is either passed in or a
 * setter, so there is nothing here that wanted to be inside the render anyway.
 */
function settleBoard(current: Piece[], run: Settling): void {
  const matched = findMatches(current);

  if (matched.size > 0) {
    run.setClearing(matched);
    tickDissolve();

    run.after(CLEAR_MS, () => {
      const next = collapse(current, matched);
      run.setClearing(new Set());
      run.setPhase('fall');
      run.setPieces(next);
      run.after(FALL_MS, () => settleBoard(next, run));
    });
    return;
  }

  if (!hasMove(current)) {
    run.setStuck(true);
    run.after(SETTLE_MS, () => {
      const dealt = reshuffle(current);
      run.setPhase('fall');
      run.setPieces(dealt);
      run.setStuck(false);
      tickDissolve();
      // Back through the same loop rather than straight to idle: a shuffle is
      // checked for both a line and a move, but it gives up after enough tries,
      // and this is what quietly picks up the board it gave up on.
      run.after(FALL_MS, () => settleBoard(dealt, run));
    });
    return;
  }

  run.setBusy(false);
}

export function MatchThree() {
  const theme = useTheme();

  const [pieces, setPieces] = useState<Piece[]>(() => createBoard());
  const [selected, setSelected] = useState<Cell | null>(null);
  /** Matched and on their way out. Still drawn, so the line can be seen going. */
  const [clearing, setClearing] = useState<ReadonlySet<number>>(() => new Set());
  /**
   * The board is animating something the player did not just ask for — a
   * refused swap going back, a line clearing, a column falling. Taps are ignored
   * until it settles, because a swap accepted here would be played against a
   * board that is about to be replaced.
   */
  const [busy, setBusy] = useState(false);
  /** No legal swap left. A pause and a shuffle, not an ending. */
  const [stuck, setStuck] = useState(false);
  /**
   * What the pieces are doing, which is how long they should take over it. Held
   * here rather than worked out inside a piece from where it used to be: only
   * this component knows whether a row change is a swap being tried, a column
   * falling into a gap, or a stuck board dealing itself out, and a piece
   * guessing from the distance it moved gets a one-square drop wrong every time.
   */
  const [phase, setPhase] = useState<'swap' | 'fall'>('fall');
  const [box, setBox] = useState(BOX_ESTIMATE);

  const timers = useRef<Timer[]>([]);
  const after = useCallback((ms: number, run: () => void) => {
    timers.current.push(setTimeout(run, ms));
  }, []);
  useEffect(
    () => () => {
      timers.current.forEach(clearTimeout);
      timers.current = [];
    },
    [],
  );

  const board = Math.min(box.width, box.height, MAX_BOARD);
  const cell = Math.max(0, (board - GAP * (SIZE + 1)) / SIZE);
  const step = cell + GAP;

  const settle = useCallback(
    (current: Piece[]) => {
      settleBoard(current, { after, setPieces, setClearing, setPhase, setStuck, setBusy });
    },
    [after],
  );

  const tap = useCallback(
    (target: Cell) => {
      if (busy || stuck) return;

      if (!selected) {
        setSelected(target);
        tickSelection();
        return;
      }

      if (selected.row === target.row && selected.column === target.column) {
        setSelected(null);
        return;
      }

      // A tap somewhere else on the board is a change of mind, not a mistake.
      if (!areNeighbours(selected, target)) {
        setSelected(target);
        tickSelection();
        return;
      }

      const swapped = swap(pieces, selected, target);
      setSelected(null);
      setBusy(true);
      setPhase('swap');
      setPieces(swapped);

      // A swap that lines nothing up is shown and then put back, rather than
      // refused where it stands: seeing the two pieces trade places and return
      // is what makes it read as "not that one" instead of "the tap missed".
      if (findMatches(swapped).size === 0) {
        tickSelection();
        after(MOVE_MS, () => {
          setPieces(pieces);
          after(MOVE_MS, () => setBusy(false));
        });
        return;
      }

      tickPlacement();
      after(MOVE_MS, () => settle(swapped));
    },
    [after, busy, pieces, selected, settle, stuck],
  );

  return (
    <View style={styles.root}>
      <ThemedText type="small" themeColor="textMuted" style={styles.line}>
        {MATCH_THREE.prompt}
      </ThemedText>

      <View
        style={styles.stage}
        onLayout={(event: LayoutChangeEvent) =>
          setBox({
            width: event.nativeEvent.layout.width,
            height: event.nativeEvent.layout.height,
          })
        }>
        <View
          style={[
            styles.board,
            {
              width: board,
              height: board,
              backgroundColor: theme.backgroundElement,
              borderColor: theme.border,
            },
          ]}
          accessibilityLabel={MATCH_THREE.boardLabel}>
          {/* The squares, which are also the buttons. A piece is drawn over the
              square it currently sits on and never handles a touch itself —
              tapping a moving target is how a swap gets aimed at the wrong
              neighbour halfway through a fall. */}
          {Array.from({ length: SIZE * SIZE }, (_, index) => {
            const row = Math.floor(index / SIZE);
            const column = index % SIZE;
            const here = { row, column };
            const isSelected =
              selected?.row === row && selected?.column === column;
            const piece = pieces.find((one) => one.row === row && one.column === column);

            return (
              <Pressable
                key={index}
                onPress={() => tap(here)}
                style={[
                  styles.slot,
                  {
                    width: cell,
                    height: cell,
                    left: GAP + column * step,
                    top: GAP + row * step,
                    backgroundColor: mix(
                      theme.backgroundElement,
                      theme.brand,
                      isSelected ? 0.18 : 0.06,
                    ),
                  },
                ]}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                accessibilityLabel={MATCH_THREE.cellLabel(
                  piece ? MATCH_THREE.kinds[piece.kind] : MATCH_THREE.empty,
                  row + 1,
                  column + 1,
                )}
                accessibilityHint={MATCH_THREE.cellHint}
              />
            );
          })}

          {pieces.map((piece) => (
            <PieceView
              key={piece.id}
              piece={piece}
              cell={cell}
              step={step}
              clearing={clearing.has(piece.id)}
              duration={phase === 'fall' ? FALL_MS : MOVE_MS}
              raised={
                selected?.row === piece.row && selected?.column === piece.column
              }
            />
          ))}
        </View>
      </View>

      <ThemedText type="small" themeColor="textMuted" style={styles.line}>
        {stuck ? MATCH_THREE.stuck : ' '}
      </ThemedText>
    </View>
  );
}

/**
 * One piece, animating between squares.
 *
 * The row and column are animated rather than the pixel offsets, so a change of
 * board size — a rotation, a tablet — moves every piece at once with no
 * animation to chase. The pixels are worked out in the animated style, where the
 * current `step` is already to hand. Same arrangement as the merge board's
 * tiles, and for the same reason.
 */
function PieceView({
  piece,
  cell,
  step,
  clearing,
  duration,
  raised,
}: {
  piece: Piece;
  cell: number;
  step: number;
  clearing: boolean;
  duration: number;
  raised: boolean;
}) {
  const theme = useTheme();

  /**
   * A new piece starts above the board and falls in. `spawn` is only set on the
   * frame it was created, so this is the mount value and nothing keeps it.
   */
  const row = useSharedValue(piece.spawn ?? piece.row);
  const column = useSharedValue(piece.column);
  const scale = useSharedValue(1);

  useEffect(() => {
    row.value = withTiming(piece.row, { duration });
    column.value = withTiming(piece.column, { duration });
  }, [column, duration, piece.column, piece.row, row]);

  /**
   * Matched pieces shrink away rather than vanishing. The board is still holding
   * them at this point — they leave the state a moment later, when the column
   * above them starts falling — so this is the whole of what "cleared" looks
   * like, and it has to be visible enough to explain the fall that follows.
   */
  useEffect(() => {
    scale.value = withTiming(clearing ? 0 : 1, { duration: CLEAR_MS });
  }, [clearing, scale]);

  const position = useAnimatedStyle(() => ({
    transform: [
      { translateX: column.value * step },
      { translateY: row.value * step },
      { scale: scale.value },
    ],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.piece,
        position,
        { width: cell, height: cell, left: GAP, top: GAP },
      ]}>
      <Shape
        kind={piece.kind}
        cell={cell}
        // The picked-up piece is a step darker rather than a step bigger:
        // growing it would have it overlap its neighbours, and the square
        // underneath is already lit.
        ink={mix(theme.backgroundElement, theme.brand, raised ? 0.95 : 0.72)}
      />
    </Animated.View>
  );
}

/**
 * The five pieces, as silhouettes.
 *
 * Filled circle, hollow circle, square, diamond, bar — chosen to stay apart at
 * a glance and at a thumb's size: two of them differ in outline, two in the
 * angle of their corners, and one has no corners or centre at all. All in one
 * ink, because they are told apart by shape and adding a second variable would
 * only make the ones sharing a shade look related.
 */
function Shape({ kind, cell, ink }: { kind: Kind; cell: number; ink: string }) {
  if (kind === 'dot') {
    const size = cell * 0.5;
    return (
      <View
        style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: ink }}
      />
    );
  }

  if (kind === 'ring') {
    const size = cell * 0.56;
    return (
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: Math.max(2, cell * 0.09),
          borderColor: ink,
        }}
      />
    );
  }

  if (kind === 'square') {
    const size = cell * 0.46;
    return (
      <View
        style={{
          width: size,
          height: size,
          borderRadius: Radius.sm / 3,
          backgroundColor: ink,
        }}
      />
    );
  }

  if (kind === 'diamond') {
    const size = cell * 0.4;
    return (
      <View
        style={{
          width: size,
          height: size,
          borderRadius: Radius.sm / 4,
          backgroundColor: ink,
          transform: [{ rotate: '45deg' }],
        }}
      />
    );
  }

  const width = cell * 0.58;
  const height = cell * 0.2;
  return (
    <View
      style={{
        width,
        height,
        borderRadius: height / 2,
        backgroundColor: ink,
      }}
    />
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignSelf: 'stretch',
    gap: Spacing.three,
  },
  line: {
    textAlign: 'center',
  },
  stage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  board: {
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  slot: {
    position: 'absolute',
    borderRadius: Radius.sm,
  },
  piece: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
