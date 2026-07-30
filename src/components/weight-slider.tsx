import { useCallback, useState } from 'react';
import { GestureResponderEvent, LayoutChangeEvent, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { MAX_WEIGHT, MIN_WEIGHT } from '@/state/weighting';

/**
 * One category's importance slider.
 *
 * Built on `PanResponder` from React Native core rather than on a slider
 * package. `@react-native-community/slider` is a native module — a new pod and a
 * dev-client rebuild for a track, a fill and a thumb.
 *
 * It is not built on `react-native-gesture-handler` either, despite that being
 * present in the tree. It is there transitively, via reanimated and expo-router,
 * and the app never mounts a `GestureHandlerRootView` — so a `GestureDetector`
 * throws at render. Wrapping the whole app in a root view to power one slider is
 * a much larger change than this control justifies. `PanResponder` needs no
 * provider and no setup.
 *
 * The track reports two things at once, which is why it is custom: the *fill* is
 * the reader's weight, and a thin marker shows where the research default sits,
 * so "how far have I moved this" is visible without remembering the original.
 */

export interface WeightSliderProps {
  label: string;
  blurb?: string;
  /** 0–100. */
  value: number;
  /** The research default, marked on the track. */
  defaultValue: number;
  /** The category's current score, 0–100, shown alongside. */
  score: number | null;
  onChange: (value: number) => void;
  /** Categories with no active indicators still render, but say so. */
  metricCount: number;
}

/** Screen-reader and keyboard step. Ten points is a meaningful shift in weight. */
const STEP = 5;

export function WeightSlider({
  label,
  blurb,
  value,
  defaultValue,
  score,
  onChange,
  metricCount,
}: WeightSliderProps) {
  const theme = useTheme();

  // Needed to turn a touch x into a ratio, so it has to be state rather than a
  // ref — the handlers below are recreated each render and read it directly,
  // which is what keeps them free of stale values without any ref indirection.
  const [width, setWidth] = useState(0);

  const onLayout = useCallback((event: LayoutChangeEvent) => {
    setWidth(event.nativeEvent.layout.width);
  }, []);

  const emit = useCallback(
    (event: GestureResponderEvent) => {
      if (width <= 0) return;

      // `locationX` is relative to the view holding the responder. Once this
      // view has claimed the gesture it keeps reporting against itself for the
      // whole drag, including past its own edges — which the clamp handles.
      const ratio = Math.min(1, Math.max(0, event.nativeEvent.locationX / width));
      // Rounded to whole points. A weighting is an opinion, not a measurement,
      // and storing 43.7186 would imply a precision nobody expressed.
      onChange(Math.round(MIN_WEIGHT + ratio * (MAX_WEIGHT - MIN_WEIGHT)));
    },
    [onChange, width],
  );

  const clamp = (next: number) => Math.min(MAX_WEIGHT, Math.max(MIN_WEIGHT, next));

  const fillRatio = Math.min(1, Math.max(0, (value - MIN_WEIGHT) / (MAX_WEIGHT - MIN_WEIGHT)));
  const defaultRatio = Math.min(
    1,
    Math.max(0, (defaultValue - MIN_WEIGHT) / (MAX_WEIGHT - MIN_WEIGHT)),
  );
  const moved = Math.abs(value - defaultValue) >= 1;
  const empty = metricCount === 0;

  return (
    <View style={styles.wrapper}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <ThemedText type="smallBold">{label}</ThemedText>
          {blurb ? (
            <ThemedText type="small" themeColor="textMuted" numberOfLines={2}>
              {blurb}
            </ThemedText>
          ) : null}
        </View>

        <View style={styles.headerValue}>
          <ThemedText type="smallBold" style={{ color: moved ? theme.info : theme.textSecondary }}>
            {Math.round(value)}
          </ThemedText>
          <ThemedText type="small" themeColor="textMuted">
            {empty ? 'no data' : score === null ? '—' : `${Math.round(score)}%`}
          </ThemedText>
        </View>
      </View>

      {/* Padded vertically so the touch target clears 44pt without the visible
          track having to be that tall. */}
      <View
        style={styles.touchArea}
        onLayout={onLayout}
        // A drag-only control is unusable with a screen reader on. `adjustable`
        // plus the two actions is what makes this operable without one.
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={`${label} importance`}
        accessibilityValue={{ min: MIN_WEIGHT, max: MAX_WEIGHT, now: Math.round(value) }}
        accessibilityHint={
          empty
            ? 'This category has no indicators yet, so changing it will not move the score.'
            : 'Swipe up or down to change how much this counts toward your score'
        }
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={(event) => {
          if (event.nativeEvent.actionName === 'increment') onChange(clamp(value + STEP));
          if (event.nativeEvent.actionName === 'decrement') onChange(clamp(value - STEP));
        }}
        // React Native's built-in responder props. No PanResponder object and no
        // GestureHandlerRootView — a drag on one axis does not need either.
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        // Claims the gesture before the enclosing ScrollView can take it;
        // without this a slightly-vertical drag scrolls the page instead.
        onStartShouldSetResponderCapture={() => true}
        onMoveShouldSetResponderCapture={() => true}
        onResponderTerminationRequest={() => false}
        onResponderGrant={emit}
        onResponderMove={emit}>
        {/* `pointerEvents="none"` is load-bearing, not tidiness.
            `locationX` is reported relative to the view the touch *lands on*,
            which is not necessarily the view holding the responder. With these
            children hit-testable, dragging across the 20pt thumb re-targeted the
            touch onto it, so `locationX` became a number between 0 and 20 and the
            slider snapped back to the start mid-drag. Making the whole stack
            transparent to touches keeps every event measured against the track. */}
        <View
          pointerEvents="none"
          style={[styles.track, { backgroundColor: theme.backgroundElement }]}>
          <View
            style={[
              styles.fill,
              {
                width: `${fillRatio * 100}%`,
                // Greyed when the category has nothing to score: the slider still
                // works and still persists, it just cannot move the number yet,
                // and colouring it live would be a lie.
                backgroundColor: empty ? theme.textMuted : theme.info,
              },
            ]}
          />

          <View
            style={[
              styles.defaultMark,
              { left: `${defaultRatio * 100}%`, backgroundColor: theme.textSecondary },
            ]}
          />

          <View
            style={[
              styles.thumb,
              {
                left: `${fillRatio * 100}%`,
                backgroundColor: empty ? theme.textMuted : theme.info,
                borderColor: theme.surface,
              },
            ]}
          />
        </View>
      </View>
    </View>
  );
}

const TRACK_HEIGHT = 6;
const THUMB = 20;

const styles = StyleSheet.create({
  wrapper: {
    gap: Spacing.two,
    paddingVertical: Spacing.two,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.three,
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  headerValue: {
    alignItems: 'flex-end',
    minWidth: 44,
  },
  touchArea: {
    paddingVertical: Spacing.two,
    justifyContent: 'center',
  },
  track: {
    height: TRACK_HEIGHT,
    borderRadius: Radius.pill,
    justifyContent: 'center',
  },
  fill: {
    height: TRACK_HEIGHT,
    borderRadius: Radius.pill,
  },
  defaultMark: {
    position: 'absolute',
    width: 2,
    height: TRACK_HEIGHT + 6,
    opacity: 0.5,
    marginLeft: -1,
  },
  thumb: {
    position: 'absolute',
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
    borderWidth: 2,
    marginLeft: -THUMB / 2,
  },
});
