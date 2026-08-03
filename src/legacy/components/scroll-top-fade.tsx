import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  type SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { withAlpha } from '@/lib/color';

/** Scroll distance over which the scrim reaches full strength. */
const FADE_IN_DISTANCE = 24;
/** How far the gradient's tail hangs below the status bar. */
const TAIL = Spacing.four;

interface ScrollTopFadeProps {
  /** Live scroll position of the list this sits over. */
  offset: SharedValue<number>;
}

/**
 * A background-colored scrim under the status bar, for screens whose content
 * scrolls all the way up behind the clock and the battery icons.
 *
 * It stays invisible at rest — the top of the page is designed to sit below the
 * inset — and fades in once anything is scrolling underneath. The band is solid
 * behind the icons themselves and only gradients out below them, so the icons
 * always have a flat field to sit on rather than a half-transparent wash of
 * whatever text is passing by.
 */
export function ScrollTopFade({ offset }: ScrollTopFadeProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const fadeStyle = useAnimatedStyle(() => ({
    opacity: interpolate(offset.value, [0, FADE_IN_DISTANCE], [0, 1], Extrapolation.CLAMP),
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.fade, { height: insets.top + TAIL }, fadeStyle]}>
      <LinearGradient
        colors={[theme.background, theme.background, withAlpha(theme.background, 0)]}
        // Solid through the icon band, then a short gradient to nothing.
        locations={[0, 0.62, 1]}
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
  },
});
