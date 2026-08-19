/**
 * The 0–10 rating: a row of dots, a number above it, and one gesture.
 *
 * Not a slider, and not eleven buttons either — it has been both, and the
 * reasons it stopped being each are worth keeping.
 *
 * A real slider is the wrong control for this question. A thumb on a bar asks
 * somebody who is upset to place a continuous value precisely, offers no
 * feedback about which number they landed on until they have already landed on
 * it, and reads as a setting rather than an answer.
 *
 * Eleven chips fixed that and cost something else. Wrapped onto two rows on a
 * phone — because a 44pt target eleven times over does not fit across one — so
 * the scale stopped looking like a scale: two rows of small grey squares read
 * as a keypad, and the one thing this control has to communicate is that the
 * numbers run from one end of a line to the other.
 *
 * What is here now is the middle of those two. Eleven dots on one line, which
 * is a scale you can see the whole of; a tap anywhere picks the nearest one; and a
 * drag runs along it, so a person who is not sure can move and watch the number
 * rather than commit to a target and hope. The number itself is set at the
 * screen-title size above the row, because at that size it is legible from the
 * moment your thumb is over the dots — which is exactly when a dot's own label
 * would be covered by your hand.
 *
 * ## One number on the row, and no line under it
 *
 * The dots are unlabelled apart from a small `5`, and it sits on the same line
 * as the two end labels rather than tucked under its own dot. All three are the
 * same thing — the scale, named at three points — and a 5 hung directly beneath
 * the row read as a label on one dot instead, which made the ends look like
 * something else again. On one line they are one legend, and the 5 lands
 * exactly over its dot because it is laid out on the same eleven equal cells
 * the dots are. With eleven, that dot is dead centre.
 *
 * Eleven identical marks are otherwise a scale you have to count along to read
 * — somebody deciding between "a bit bad" and "quite bad" should not be doing
 * arithmetic from the left-hand end — and one number in the middle is enough to
 * place every other by eye. Numbering them all would make the row a ruler,
 * which is a thing to measure with rather than a thing to answer with.
 *
 * There was a hairline running through the dots for a while, on the argument
 * that it said the marks were one scale. What it actually did was make the row
 * a slider with the thumb missing, and the dots read as stops on a track rather
 * than as the things you press. The row is a row without it; the wave below is
 * what says they belong to each other.
 *
 * ## The wave
 *
 * While a finger is down, the dots around the selected one swell and lift with
 * it, falling off over three dots either side — the selected one highest, its
 * neighbours a little less, and so on until the row is flat again. On release
 * the wave settles and the chosen dot is left standing alone.
 *
 * It is not decoration. A row of identical dots gives a dragging finger nothing
 * to feel its way along: the number above changes, but the number is under the
 * hand, and the only other feedback is a single dot changing size somewhere in
 * the middle of a line of ten that did not. The wave makes the neighbourhood
 * move, so the row reads as a surface being pushed rather than a set of targets
 * being switched between, and the direction of travel is visible in the shape
 * even when the readout is covered.
 *
 * The lift is on the drag only. A selected dot that sat permanently above the
 * line would read as detached from the scale — and at rest there is no
 * neighbourhood to be the middle of, only an answer.
 *
 * ## The gesture is the responder system, not a gesture handler
 *
 * `react-native-gesture-handler` is in the tree as a dependency of the
 * navigator, but nothing in this app mounts a `GestureHandlerRootView` and
 * nothing else uses it. One control is not a reason to take that on: React
 * Native's own responder props do the whole job here, which is "where along
 * this view is the finger".
 *
 * The one requirement they carry is that `locationX` is measured from the
 * *target* of the touch, so the dots are `pointerEvents="none"` and the row
 * itself is always the target. Without that, a touch that starts on a dot
 * reports a position relative to the dot and every tap picks the wrong number.
 *
 * ## One control to a screen reader
 *
 * `adjustable`, with increment and decrement actions, rather than eleven
 * buttons. Swiping past this question should be one stop, not eleven, and the
 * value it announces is a number with both ends of the scale named — see
 * `MOOD_CONTROL.label`, and note that the ends are not decoration: 8 is only
 * bad because 10 is the bad end.
 */

import { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  type GestureResponderEvent,
  type LayoutChangeEvent,
} from 'react-native';
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { MOOD_SCALE } from '@/config/session';
import { MOOD_CONTROL } from '@/content/strings';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { tickSelection } from '@/session/ui/haptics';

const VALUES = Array.from(
  { length: MOOD_SCALE.max - MOOD_SCALE.min + 1 },
  (_, index) => MOOD_SCALE.min + index,
);

/**
 * The dot at rest, and what the selected one grows to.
 *
 * Small enough that eleven of them read as a line rather than as a row of
 * buttons, and the selected one large enough to be found without looking for
 * it. The growth is what carries the selection — the fill changes too, but a
 * colour alone would be invisible under a thumb.
 */
const DOT = 9;
const SELECTED_SCALE = 1.9;

/**
 * How tall the row's touch target is. The dots are 9 points; the target has to
 * clear 44, which is the smallest thing anybody should be asked to hit, and it
 * is padding rather than size so the dots stay a line.
 */
const TRACK_HEIGHT = 48;

/** Quick — this trails a finger, and anything slower reads as lag. */
const MOVE_MS = 120;

/**
 * How far the wave reaches, in dots either side of the selected one.
 *
 * Three is most of the way to a third of the row, which is enough for the shape
 * to be a shape. Much wider and the whole line moves together, which is no
 * longer a wave — it is the row breathing.
 */
const WAVE_RADIUS = 3;

/**
 * How high the crest rides above the line while a finger is down. Small: the
 * dots are nine points, so seven is a little under a dot's own diameter, and
 * anything more starts reading as the row coming apart rather than flexing.
 */
const LIFT = 7;

/**
 * The one dot that carries its number, and it is derived rather than written
 * down: the value at the middle of the scale, rounded down if the scale ever
 * has an even count. On 0–10 that is 5, and it is the middle dot of eleven —
 * the whole reason the scale keeps its zero.
 */
const MARKED = Math.floor((MOOD_SCALE.min + MOOD_SCALE.max) / 2);

/**
 * A raised cosine over the wave's reach: 1 at the finger, 0.75 one dot out,
 * 0.25 at two, and nothing from three.
 *
 * A straight line of falloff would give the wave a corner at the crest, which
 * is the one place the eye is actually looking. This has none — it leaves the
 * flat and returns to it smoothly, which is what makes the row read as a
 * surface rather than as dots that were told to move different amounts.
 */
function falloff(distance: number): number {
  if (distance >= WAVE_RADIUS) return 0;

  return 0.5 * (1 + Math.cos((Math.PI * distance) / WAVE_RADIUS));
}

interface MoodScaleProps {
  value: number | null;
  onChange: (value: number) => void;
  lowLabel: string;
  highLabel: string;
}

export function MoodScale({ value, onChange, lowLabel, highLabel }: MoodScaleProps) {
  const [width, setWidth] = useState(0);
  /** Whether a finger is on the row. It is the whole of what the wave keys on. */
  const [dragging, setDragging] = useState(false);

  /**
   * Each dot gets an equal share of the row and sits in the middle of it, so
   * the number under a finger is the width divided by eleven — no measuring of
   * individual dots, and no gaps between targets.
   */
  const cell = width / VALUES.length;

  const pick = (event: GestureResponderEvent) => {
    if (cell <= 0) return;

    const index = Math.min(
      VALUES.length - 1,
      Math.max(0, Math.floor(event.nativeEvent.locationX / cell)),
    );
    const next = VALUES[index];

    // Only on a change. Dragging across a dot should tick once, and holding
    // still on one should not tick at all.
    if (next === value) return;
    tickSelection();
    onChange(next);
  };

  const step = (by: number) => {
    const from = value ?? VALUES[Math.floor(VALUES.length / 2)];
    const next = Math.min(MOOD_SCALE.max, Math.max(MOOD_SCALE.min, from + by));

    if (next === value) return;
    tickSelection();
    onChange(next);
  };

  return (
    <View style={styles.root}>
      {/* Held open whether or not there is a number in it, so the row does not
          jump down the screen the moment the first tap lands. */}
      <View style={styles.readout}>
        <ThemedText type="title">
          {value === null ? MOOD_CONTROL.blank : value}
        </ThemedText>
      </View>

      <View
        accessibilityRole="adjustable"
        accessibilityLabel={MOOD_CONTROL.label(
          MOOD_SCALE.min,
          MOOD_SCALE.max,
          lowLabel,
          highLabel,
        )}
        accessibilityValue={
          value === null
            ? { text: MOOD_CONTROL.empty }
            : {
                min: MOOD_SCALE.min,
                max: MOOD_SCALE.max,
                now: value,
                text: MOOD_CONTROL.value(value),
              }
        }
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={(event) => {
          if (event.nativeEvent.actionName === 'increment') step(1);
          if (event.nativeEvent.actionName === 'decrement') step(-1);
        }}
        onLayout={(event: LayoutChangeEvent) =>
          setWidth(event.nativeEvent.layout.width)
        }
        // Claims the touch on the way down and keeps it through a drag, so a
        // finger that lands and then slides never hands the gesture to the
        // scroll view some of these screens sit in.
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderTerminationRequest={() => false}
        onResponderGrant={(event) => {
          setDragging(true);
          pick(event);
        }}
        onResponderMove={pick}
        // Both endings, and neither is optional: a gesture that is taken away —
        // by a scroll, by a system panel, by a second finger — never fires
        // release, and a wave left standing after the finger has gone is the
        // row stuck mid-movement.
        onResponderRelease={() => setDragging(false)}
        onResponderTerminate={() => setDragging(false)}
        style={styles.track}>
        {/* Nothing in here may be a touch target: `locationX` is measured from
            whatever the touch landed on, and the arithmetic above assumes that
            is always the row. */}
        <View pointerEvents="none" style={styles.dots}>
          {VALUES.map((option, index) => {
            const selected = option === value;
            // Distance from the finger, in dots. Nothing is near anything until
            // a value exists — an untouched row is flat.
            const near =
              value === null ? 0 : falloff(Math.abs(index - (value - MOOD_SCALE.min)));

            return (
              <Dot
                key={option}
                selected={selected}
                // The selected dot is full size whether or not anybody is
                // touching it; its neighbours are only anything mid-drag.
                swell={selected ? 1 : dragging ? near : 0}
                // The crest rides above the line only while the finger is down,
                // the selected dot included.
                lift={dragging ? near : 0}
              />
            );
          })}
        </View>
      </View>

      {/* The ends are labelled because "10" on its own doesn't say which way
          the scale runs, and getting that backwards makes the whole session's
          one measurement meaningless. The middle is labelled so nobody has to
          count from either end to find it. */}
      <View style={styles.legend}>
        <ThemedText type="small" themeColor="textMuted">
          {MOOD_SCALE.min} — {lowLabel}
        </ThemedText>
        <ThemedText type="small" themeColor="textMuted">
          {MOOD_SCALE.max} — {highLabel}
        </ThemedText>

        {/* Laid over the legend rather than placed in it: the two end labels
            are set by their own edges, and the 5 has to be set by its dot. Ten
            equal cells, the same division the dots and the hit test use, so the
            number cannot drift off the mark it names however the row is
            sized. */}
        <View pointerEvents="none" style={styles.marks}>
          {VALUES.map((option) => (
            <View key={option} style={styles.markCell}>
              {option === MARKED ? (
                <ThemedText type="small" themeColor="textMuted">
                  {MARKED}
                </ThemedText>
              ) : null}
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

/**
 * One mark on the line, holding its own growth.
 *
 * A component rather than eleven animated styles in the parent, for the reason
 * the example's step list is one: a hook per item written out in a loop is fine
 * until the list is a different length.
 */
function Dot({
  selected,
  swell,
  lift,
}: {
  selected: boolean;
  /** 0 flat, 1 full size. The crest of the wave, and the selected dot at rest. */
  swell: number;
  /** 0 on the line, 1 at the top of the lift. Only ever non-zero mid-drag. */
  lift: number;
}) {
  const theme = useTheme();
  const grown = useSharedValue(selected ? 1 : 0);
  const raised = useSharedValue(0);

  // In an effect rather than written during render: a shared value assigned in
  // the render body is a side effect, and React is free to run that body more
  // than once per commit.
  //
  // Both run on the same short timing, so a dot that is growing is also rising
  // — two curves at different speeds would read as the dot stretching upward
  // rather than as one thing moving.
  useEffect(() => {
    const timing = { duration: MOVE_MS, reduceMotion: ReduceMotion.System };

    grown.value = withTiming(swell, timing);
    raised.value = withTiming(lift, timing);
  }, [grown, lift, raised, swell]);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateY: -LIFT * raised.value },
      { scale: 1 + (SELECTED_SCALE - 1) * grown.value },
    ],
  }));

  return (
    <View style={styles.cell}>
      <Animated.View
        style={[
          styles.dot,
          style,
          {
            // The strong step of the accent, which is the fill the chips took
            // when this was eleven buttons — see `constants/theme.ts`. Unpicked
            // dots are the app's divider ink, so the row reads as one mark
            // among ten quiet ones rather than as ten competing dots.
            backgroundColor: selected ? theme.accentStrong : theme.barDivider,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: Spacing.two,
  },
  // Centred over the row rather than ranged left with it: the number belongs to
  // wherever the finger is, and there is no left edge to belong to.
  readout: {
    alignItems: 'center',
  },
  track: {
    height: TRACK_HEIGHT,
    justifyContent: 'center',
  },
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  // Equal shares of the row, which is what makes the hit test a division. The
  // dot is centred in its share, so the two ends sit half a cell inside the
  // column rather than on its edges.
  cell: {
    flex: 1,
    alignItems: 'center',
  },
  dot: {
    width: DOT,
    height: DOT,
    borderRadius: DOT / 2,
  },
  // Pulled up by the gap `root` would otherwise put here, so the legend sits
  // close under the dots instead of a block away from them. The track keeps its
  // full height — that is the touch target, and it is the one number on this
  // control that is not free to move — so the space being closed is empty space
  // inside it rather than anything the finger uses.
  //
  // No horizontal padding: the marks laid over this row have to divide exactly
  // the width the dots divide, and an inset here would offset the 5 from the
  // dot it names by the width of the inset.
  legend: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: -Spacing.two,
  },
  marks: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    flexDirection: 'row',
  },
  // A column, so `alignItems` centres its number horizontally over the dot,
  // and top-aligned so it shares a first line with the labels either side.
  markCell: {
    flex: 1,
    alignItems: 'center',
  },
});
