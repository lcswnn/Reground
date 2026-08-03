/**
 * The frame every session screen sits in: safe area, one gutter, and a column
 * that doesn't run wider than a comfortable measure on a tablet.
 *
 * No header, no back button, no progress dots. The session runs forward only.
 */

import { StyleSheet, View, type ViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface SessionScreenProps extends ViewProps {
  /** Centres the column vertically. Off for screens that scroll. */
  centered?: boolean;
}

export function SessionScreen({
  centered = false,
  style,
  children,
  ...rest
}: SessionScreenProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.root,
        {
          backgroundColor: theme.background,
          paddingTop: insets.top + Spacing.four,
          paddingBottom: insets.bottom + Spacing.four,
        },
        style,
      ]}
      {...rest}>
      <View style={[styles.column, centered && styles.centered]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingHorizontal: Spacing.four,
    alignItems: 'center',
  },
  column: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
  },
  centered: {
    justifyContent: 'center',
  },
});
