import type { BottomTabBarProps } from "expo-router/js-tabs";
import { SymbolView, type SFSymbol } from "expo-symbols";
import { Platform, Pressable, StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import { ThemedText } from "@/components/themed-text";
import type { ThemeColor } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

/**
 * Matches the UIKit tab bar's content height, so swapping off native tabs did
 * not change the size of the bar.
 */
export const TAB_BAR_HEIGHT = 49;

/**
 * The reason this bar is hand-rolled: UIKit centers the icon/label pair in the
 * content band and exposes no inset to move the glyph within it. Here the icon
 * simply starts lower.
 *
 * Budget: icon (24) + gap (1) + label line (16) = 41pt of the 49pt band, so 8
 * is the ceiling — past it the label's descenders start clipping. Lowering the
 * pair further means growing `TAB_BAR_HEIGHT`, not raising this.
 */
const ICON_DROP = 12;
const ICON_SIZE = 24;

/**
 * How far the icon shrinks under a finger. Small on purpose — at 24pt the glyph
 * is already tiny, and anything deeper reads as the icon flinching rather than
 * as the tab acknowledging the touch.
 */
const PRESS_SCALE = 0.86;
/** Paired with the shrink: motion alone is easy to miss on a 24pt target. */
const PRESS_FADE = 0.3;

const ICONS: Record<string, { default: SFSymbol; selected: SFSymbol }> = {
  index: { default: "sun.max", selected: "sun.max.fill" },
  feed: { default: "newspaper", selected: "newspaper.fill" },
  progress: {
    default: "chart.line.uptrend.xyaxis",
    selected: "chart.line.uptrend.xyaxis",
  },
  profile: { default: "person", selected: "person.fill" },
};

/**
 * One hue per tab, drawn from the app palette so the bar matches the rest.
 * Only the selected tab wears its color; the rest sit in grey, so where you are
 * is legible from the color alone rather than from a difference in opacity.
 */
const TAB_COLORS: Record<string, ThemeColor> = {
  index: "brand",
  feed: "positive",
  // The same blue as the progress bars it leads to.
  progress: "info",
  // The same pink as the Humanity progress bar on the home screen.
  profile: "accentStrong",
};

export function TabBar({
  state,
  descriptors,
  navigation,
  insets,
}: BottomTabBarProps) {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.bar,
        {
          backgroundColor: theme.background,
          borderTopColor: theme.barDivider,
          height: TAB_BAR_HEIGHT + insets.bottom,
          paddingBottom: insets.bottom,
        },
      ]}
    >
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const focused = state.index === index;
        const label = options.title ?? route.name;
        // `textMuted` rather than a dimmed hue: an unselected tab should read as
        // grey outright, so the one color in the row is unmistakably the tab
        // you're on.
        const color = focused
          ? theme[TAB_COLORS[route.name] ?? "brand"]
          : theme.textMuted;

        function onPress() {
          const event = navigation.emit({
            type: "tabPress",
            target: route.key,
            canPreventDefault: true,
          });

          if (!focused && !event.defaultPrevented) {
            navigation.navigate(route.name, route.params);
          }
        }

        return (
          <TabItem
            key={route.key}
            icon={ICONS[route.name]}
            label={label}
            color={color}
            focused={focused}
            accessibilityLabel={options.tabBarAccessibilityLabel ?? label}
            onPress={onPress}
          />
        );
      })}
    </View>
  );
}

interface TabItemProps {
  icon?: { default: SFSymbol; selected: SFSymbol };
  label: string;
  color: string;
  focused: boolean;
  accessibilityLabel: string;
  onPress: () => void;
}

/**
 * Its own component because the press animation needs a shared value per tab,
 * and hooks can't be called from inside the routes `map`.
 */
function TabItem({
  icon,
  label,
  color,
  focused,
  accessibilityLabel,
  onPress,
}: TabItemProps) {
  const press = useSharedValue(0);
  // Honors the system Reduce Motion switch: the tab still responds, it just
  // does it by dimming instead of moving.
  const reducedMotion = useReducedMotion();

  const iconStyle = useAnimatedStyle(() => ({
    transform: reducedMotion
      ? []
      : [{ scale: 1 - press.value * (1 - PRESS_SCALE) }],
    opacity: 1 - press.value * PRESS_FADE,
  }));

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      // Down fast and up slowly: the press should feel like it caught, and the
      // release is where the spring reads. Driving both off one value keeps a
      // quick tap from stranding the icon mid-shrink.
      onPressIn={() => {
        press.value = withTiming(1, {
          duration: 90,
          easing: Easing.out(Easing.quad),
        });
      }}
      onPressOut={() => {
        press.value = withSpring(0, { damping: 13, stiffness: 340, mass: 0.5 });
      }}
      style={styles.item}
    >
      <Animated.View style={iconStyle}>
        {icon ? (
          <SymbolView
            name={focused ? icon.selected : icon.default}
            size={ICON_SIZE}
            tintColor={color}
            // Android and web have no SF Symbols; the label still names the
            // tab, so a dot placeholder keeps the row from collapsing.
            fallback={
              <View style={[styles.iconFallback, { backgroundColor: color }]} />
            }
          />
        ) : null}
      </Animated.View>

      <ThemedText
        type="small"
        style={[styles.label, { color }]}
        numberOfLines={1}
      >
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    // A hairline is one physical pixel, which at this contrast reads as a
    // seam rather than an edge. The extra point is what makes it a rule.
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  item: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-start",
    paddingTop: ICON_DROP,
    gap: Platform.select({ ios: 1, default: 2 }),
  },
  iconFallback: {
    width: 22,
    height: 22,
    borderRadius: 11,
  },
  label: {
    fontSize: 13,
    lineHeight: 16,
  },
});
