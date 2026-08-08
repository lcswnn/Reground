/**
 * The frame every session screen sits in: safe area, one gutter, and a column
 * that doesn't run wider than a comfortable measure on a tablet.
 *
 * No progress dots, and no header beyond one thin row of chrome: a back button
 * top-left on the screens that have somewhere to go back to — see
 * `previousRoute` for which do and where each one lands — and the appearance
 * switch top-right on all of them without exception. Both are drawn here rather
 * than by each screen so that they are in exactly the same place on every one,
 * which for the switch is the whole point: a control that moves between screens
 * is a control that has to be found again each time.
 *
 * The row takes layout space rather than floating over the content: the screens
 * that start with a heading at the top of the page (`/games`, `/calibration`)
 * have nothing to spare up there, and a button overlapping a title is worse than
 * a title sitting a line lower. It is drawn even on the screens with no back
 * button, because the switch is on those too — `/`, `/category` and `/closed`
 * now open with an empty row and the switch at the end of it.
 */

import { StyleSheet, View, type ViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { BackButton } from '@/session/ui/back-button';
import { ThemeToggle } from '@/session/ui/theme-toggle';

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
        {/* The spacer, not `space-between`, is what pins the switch to the
            right on the screens that have no back button to sit opposite. */}
        <View style={styles.chrome}>
          {onBack ? <BackButton onPress={onBack} /> : null}
          <View style={styles.spacer} />
          <ThemeToggle />
        </View>

        {/* Its own flex child so that `centered` still centres the screen's
            content, not the content plus the chrome above it. */}
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
  chrome: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.three,
  },
  spacer: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  centered: {
    justifyContent: 'center',
  },
});
