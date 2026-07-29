import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  type SharedValue,
} from 'react-native-reanimated';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { withAlpha } from '@/lib/color';

/** Scroll distance over which the scrim reaches full strength. */
const FADE_IN_DISTANCE = 24;

/** Depth of the fade below the header's edge. */
const DEPTH = Spacing.five;

interface ScrollHeaderFadeProps {
  /** Live scroll position of the list this sits over. */
  offset: SharedValue<number>;
}

/**
 * A soft edge where a list passes under a fixed header.
 *
 * The sibling of `ScrollTopFade`, one element down the page: that one covers
 * the gap between content and the status bar on screens whose header scrolls
 * away, this one covers the gap between content and a header that stays put.
 *
 * Without it, a card sliding up under the filter row is cut off mid-word on a
 * hard horizontal line, which reads as clipping rather than as scrolling. The
 * gradient gives the card somewhere to go.
 *
 * Invisible at rest, for the same reason the top scrim is: with nothing
 * scrolling underneath there is no seam to hide, and a permanent wash over the
 * first card would just look like the list starts dimmed.
 */
export function ScrollHeaderFade({ offset }: ScrollHeaderFadeProps) {
  const theme = useTheme();

  const fadeStyle = useAnimatedStyle(() => ({
    opacity: interpolate(offset.value, [0, FADE_IN_DISTANCE], [0, 1], Extrapolation.CLAMP),
  }));

  return (
    <Animated.View pointerEvents="none" style={[styles.fade, fadeStyle]}>
      <LinearGradient
        colors={[theme.background, withAlpha(theme.background, 0)]}
        style={StyleSheet.absoluteFill}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  fade: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: DEPTH,
  },
});
