/**
 * Join the Numbers — 2048, on the calm shelf.
 *
 * The rules are the ones everybody already knows, which is most of why it is
 * here: the news branch and the personal/other branch get this shelf, and both
 * of those people are reaching for something to do with their hands, not a task
 * to learn. A game whose instructions are "swipe" is one they can start playing
 * in the second screen-second rather than the tenth.
 *
 * It is on the calm shelf and not the other one, and that is not a filing
 * accident. Sliding tiles is planning and arithmetic — it does not compete with
 * a picture, so it cannot borrow the visuospatial claim. See `GameKind` in
 * `games/catalog.ts`.
 *
 * ## The two things taken out of it
 *
 * **The score.** No points total, no best-ever, no 2048 tile to be chasing.
 * That is the rule the whole shelf is built on — a number going up turns a
 * distraction into a performance, and a number that stops going up turns it
 * into a loss. The values on the tiles stay, because there is no version of
 * this game without them, but nothing accumulates outside the board and nothing
 * survives the session.
 *
 * **The loss.** A stuck board dissolves its smallest tiles and play carries on;
 * see `dissolveLowest` in `grid.ts`. Vanilla 2048 ends there, and an app for
 * someone who has just told us how bad they feel is not the place to hand
 * anybody a "game over" three minutes in.
 *
 * ## Why the tiles slide rather than redraw
 *
 * A board that jumps from one arrangement to the next is unreadable — nothing
 * shows which tile went where, and a merge is indistinguishable from two tiles
 * vanishing. So the board is drawn as absolutely positioned tiles that keep
 * their identity across a swipe (`Tile.id`), animating between grid squares,
 * and the tiles eaten on a merge are held on screen for the length of the slide
 * so they can be seen arriving at the square they died on.
 *
 * Both lists are rendered from one array in one parent, eaten tiles first. That
 * is load-bearing rather than tidy: React keeps a keyed child's state when it
 * moves within a list, so a tile passing from the board into the leaving pile
 * keeps the shared values holding its position mid-slide. Two sibling lists
 * would unmount and remount it, and it would jump to its destination.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  GestureResponderEvent,
  LayoutChangeEvent,
  StyleSheet,
  View,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { MERGE_TILES } from '@/content/strings';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { mix } from '@/lib/color';
import { tickDissolve, tickPlacement, tickSelection } from '@/session/ui/haptics';
import {
  SIZE,
  addTile,
  canMove,
  createGrid,
  dissolveLowest,
  slide,
  type Direction,
  type Tile,
} from '@/session/games/merge/grid';

/** Space between tiles, and the same again around the outside of the board. */
const GAP = 8;
/** Not full width on a tablet: past this the swipe is a stretch rather than a flick. */
const MAX_BOARD = 360;
const BOX_ESTIMATE = { width: 300, height: 300 };

/** How long a tile takes to cross the board. Short — this is legibility, not flourish. */
const MOVE_MS = 110;
/** The bump a merged tile gives once it has landed. */
const POP_MS = 90;
/** How long a newly dropped tile takes to grow in. */
const ENTER_MS = 130;

/**
 * How far a finger has to travel before it counts as a swipe, in points.
 *
 * Low, because the board is small and a flick across two squares is a short
 * gesture — but not so low that resting a thumb on the board sends the tiles
 * somewhere. The direction is whichever axis moved furthest, so a diagonal
 * always resolves rather than being rejected.
 */
const SWIPE_MIN = 18;

/** How long the full board is left up before its smallest tiles go. */
const SETTLE_MS = 900;

/** Narrows an accessibility action name back to a direction. */
const DIRECTIONS: readonly Direction[] = ['up', 'down', 'left', 'right'];

export function MergeTiles() {
  const theme = useTheme();

  const [tiles, setTiles] = useState<Tile[]>(() => createGrid());
  /** Eaten on the last swipe, still travelling. Not part of the board. */
  const [leaving, setLeaving] = useState<Tile[]>([]);
  /** The board is full with nothing to join. A pause, not an ending. */
  const [stuck, setStuck] = useState(false);
  const [box, setBox] = useState(BOX_ESTIMATE);

  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
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

  const move = useCallback(
    (direction: Direction) => {
      // Nothing while the board is settling: a swipe accepted here would be
      // played against tiles that are about to be taken away.
      if (stuck) return;

      const swept = slide(tiles, direction);
      if (!swept.moved) return;

      const next = addTile(swept.tiles);
      setTiles(next);
      setLeaving(swept.absorbed);
      if (swept.merges > 0) tickPlacement();
      else tickSelection();

      // Kept on screen exactly as long as the slide they are part of.
      if (swept.absorbed.length > 0) after(MOVE_MS, () => setLeaving([]));

      if (!canMove(next)) {
        setStuck(true);
        after(SETTLE_MS, () => {
          setTiles((current) => dissolveLowest(current));
          setStuck(false);
          tickDissolve();
        });
      }
    },
    [after, stuck, tiles],
  );

  /**
   * The board is the control. Handled with the responder system rather than a
   * gesture library because a swipe is a start point, a delta and a threshold,
   * and that is all this needs — the same reason the ball game reads its touches
   * this way.
   *
   * It fires on the move that crosses the threshold, not on release, so the
   * board answers under the finger. `sent` is what stops one long drag from
   * sliding the board four times.
   */
  const from = useRef<{ x: number; y: number } | null>(null);
  const sent = useRef(false);

  const grant = (event: GestureResponderEvent) => {
    from.current = { x: event.nativeEvent.pageX, y: event.nativeEvent.pageY };
    sent.current = false;
  };

  const drag = (event: GestureResponderEvent) => {
    if (sent.current || !from.current) return;

    const dx = event.nativeEvent.pageX - from.current.x;
    const dy = event.nativeEvent.pageY - from.current.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < SWIPE_MIN) return;

    sent.current = true;
    if (Math.abs(dx) > Math.abs(dy)) move(dx > 0 ? 'right' : 'left');
    else move(dy > 0 ? 'down' : 'up');
  };

  const release = () => {
    from.current = null;
  };

  const drawn = [...leaving, ...tiles];

  return (
    <View style={styles.root}>
      <ThemedText type="small" themeColor="textMuted" style={styles.line}>
        {MERGE_TILES.prompt}
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
          onStartShouldSetResponder={() => true}
          onMoveShouldSetResponder={() => true}
          onResponderTerminationRequest={() => false}
          onResponderGrant={grant}
          onResponderMove={drag}
          onResponderRelease={release}
          accessible
          accessibilityLabel={MERGE_TILES.boardLabel}
          // Swiping is not a gesture a screen reader passes through, so the four
          // moves are offered as actions as well. Same code path as a finger.
          accessibilityActions={MERGE_TILES.actions}
          onAccessibilityAction={(event) => {
            const named = DIRECTIONS.find((one) => one === event.nativeEvent.actionName);
            if (named) move(named);
          }}>
          {/* The empty squares, so the grid reads as a board with room on it
              rather than as tiles floating on a panel. */}
          {Array.from({ length: SIZE * SIZE }, (_, index) => (
            <View
              key={index}
              pointerEvents="none"
              style={[
                styles.slot,
                {
                  width: cell,
                  height: cell,
                  left: GAP + (index % SIZE) * step,
                  top: GAP + Math.floor(index / SIZE) * step,
                  backgroundColor: mix(theme.backgroundElement, theme.brand, 0.06),
                },
              ]}
            />
          ))}

          {drawn.map((tile) => (
            <TileView key={tile.id} tile={tile} cell={cell} step={step} />
          ))}
        </View>
      </View>

      <ThemedText type="small" themeColor="textMuted" style={styles.line}>
        {stuck ? MERGE_TILES.stuck : ' '}
      </ThemedText>
    </View>
  );
}

/**
 * One tile, animating between grid squares.
 *
 * The row and column are what get animated, not the pixel offsets, so a change
 * of board size — a rotation, a tablet — moves every tile at once with no
 * animation to chase. The pixels are worked out from the grid position in the
 * animated style, where the current `step` is already to hand.
 */
function TileView({ tile, cell, step }: { tile: Tile; cell: number; step: number }) {
  const theme = useTheme();

  const row = useSharedValue(tile.row);
  const column = useSharedValue(tile.column);
  const pop = useSharedValue(1);
  const grown = useSharedValue(0);

  useEffect(() => {
    row.value = withTiming(tile.row, { duration: MOVE_MS });
    column.value = withTiming(tile.column, { duration: MOVE_MS });
  }, [column, row, tile.column, tile.row]);

  /**
   * The entrance, as a scale inside the same transform as everything else —
   * deliberately not one of Reanimated's `entering` presets.
   *
   * A layout animation owns the view's whole `transform` while it runs, which
   * means it overwrites the translate this style is putting there: a new tile
   * spent its entrance pinned at the board's top-left corner and then jumped to
   * its square when the animation handed the property back. One transform, one
   * owner, no jump.
   */
  useEffect(() => {
    grown.value = withTiming(1, { duration: ENTER_MS });
  }, [grown]);

  /**
   * The bump on a merge. Held until the slide is over — a tile that swells while
   * still travelling reads as a rendering fault rather than as two becoming one.
   * The mount is skipped: a new tile has its own entrance.
   */
  const settled = useRef(false);
  useEffect(() => {
    if (!settled.current) {
      settled.current = true;
      return;
    }
    pop.value = withDelay(
      MOVE_MS,
      withSequence(
        withTiming(1.08, { duration: POP_MS }),
        withTiming(1, { duration: POP_MS }),
      ),
    );
  }, [pop, tile.value]);

  const position = useAnimatedStyle(() => ({
    transform: [
      { translateX: column.value * step },
      { translateY: row.value * step },
      { scale: grown.value * pop.value },
    ],
  }));

  /**
   * Ink over the board, deeper the bigger the number — the palette has one ramp
   * and this is a use it was made for. 512 and up is solid ink and stays there;
   * past that the difference has to be carried by the digits, which by then are
   * four of them and impossible to mistake for anything else.
   */
  const depth = Math.min(1, (Math.log2(tile.value) - 1) / 8);
  const fill = mix(theme.backgroundElement, theme.brand, 0.15 + depth * 0.85);
  const digits = String(tile.value).length;

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.tile,
        position,
        { width: cell, height: cell, left: GAP, top: GAP, backgroundColor: fill },
      ]}>
      <ThemedText
        type="defaultSemiBold"
        style={{
          // Sized off the cell rather than fixed, and off the digit count as
          // well: 1024 at the size 2 wants would run out of both edges.
          fontSize: cell * (digits <= 2 ? 0.42 : digits === 3 ? 0.33 : 0.25),
          lineHeight: cell,
          color: depth > 0.45 ? theme.textOnBrand : theme.text,
        }}>
        {tile.value}
      </ThemedText>
    </Animated.View>
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
  tile: {
    position: 'absolute',
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
