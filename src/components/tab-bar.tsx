import { SymbolView, type SFSymbol } from 'expo-symbols';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import type { ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

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
 * Budget: icon (24) + gap (1) + label line (16) = 41pt of the 49pt band, so
 * anything past 8 starts clipping the label's descenders.
 */
const ICON_DROP = 7;
const ICON_SIZE = 24;

const ICONS: Record<string, { default: SFSymbol; selected: SFSymbol }> = {
  index: { default: 'sun.max', selected: 'sun.max.fill' },
  feed: { default: 'newspaper', selected: 'newspaper.fill' },
  progress: {
    default: 'chart.line.uptrend.xyaxis',
    selected: 'chart.line.uptrend.xyaxis',
  },
  profile: { default: 'person', selected: 'person.fill' },
};

/**
 * One hue per tab, drawn from the app palette so the bar matches the rest.
 * Only the selected tab wears its color; the rest sit in grey, so where you are
 * is legible from the color alone rather than from a difference in opacity.
 */
const TAB_COLORS: Record<string, ThemeColor> = {
  index: 'brand',
  feed: 'positive',
  // The same blue as the progress bars it leads to.
  progress: 'info',
  // The same pink as the Humanity progress bar on the home screen.
  profile: 'accentStrong',
};

export function TabBar({ state, descriptors, navigation, insets }: BottomTabBarProps) {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.bar,
        {
          backgroundColor: theme.background,
          borderTopColor: theme.border,
          height: TAB_BAR_HEIGHT + insets.bottom,
          paddingBottom: insets.bottom,
        },
      ]}>
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const focused = state.index === index;
        const label = options.title ?? route.name;
        const icon = ICONS[route.name];
        // `textMuted` rather than a dimmed hue: an unselected tab should read as
        // grey outright, so the one color in the row is unmistakably the tab
        // you're on.
        const color = focused ? theme[TAB_COLORS[route.name] ?? 'brand'] : theme.textMuted;

        function onPress() {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!focused && !event.defaultPrevented) {
            navigation.navigate(route.name, route.params);
          }
        }

        return (
          <Pressable
            key={route.key}
            accessibilityRole="button"
            accessibilityState={{ selected: focused }}
            accessibilityLabel={options.tabBarAccessibilityLabel ?? label}
            onPress={onPress}
            style={styles.item}>
            {icon ? (
              <SymbolView
                name={focused ? icon.selected : icon.default}
                size={ICON_SIZE}
                tintColor={color}
                // Android and web have no SF Symbols; the label still names the
                // tab, so a dot placeholder keeps the row from collapsing.
                fallback={<View style={[styles.iconFallback, { backgroundColor: color }]} />}
              />
            ) : null}
            <ThemedText type="small" style={[styles.label, { color }]} numberOfLines={1}>
              {label}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
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
