/**
 * The frame every session screen sits in: safe area, one gutter, and a column
 * that doesn't run wider than a comfortable measure on a tablet.
 *
 * No header and no progress dots. There is now a back button, top-left, on
 * every screen that has somewhere to go back to — see `previousRoute` for which
 * do and where each one lands. It is drawn here rather than by each screen so
 * that it is in exactly the same place on all of them.
 *
 * It takes layout space rather than floating over the content: the screens that
 * start with a heading at the top of the page (`/games`, `/calibration`) have
 * nothing to spare up there, and a button overlapping a title is worse than a
 * title sitting a line lower.
 */

import { StyleSheet, View, type ViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { BackButton } from '@/session/ui/back-button';

interface SessionScreenProps extends ViewProps {
  /** Centres the column vertically. Off for screens that scroll. */
  centered?: boolean;
  /**
   * What the back button does. Omitted — which is what `useSessionBack` returns
   * for the door and the dead end — draws no button at all.
   */
  onBack?: () => void;
}

export function SessionScreen({
  centered = false,
  onBack,
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
      <View style={styles.column}>
        {onBack ? <BackButton onPress={onBack} /> : null}
        {/* Its own flex child so that `centered` still centres the screen's
            content, not the content plus the button above it. */}
        <View style={[styles.content, centered && styles.centered]}>{children}</View>
      </View>
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
  content: {
    flex: 1,
  },
  centered: {
    justifyContent: 'center',
  },
});
