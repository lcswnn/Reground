/**
 * The frame every session screen sits in: safe area, one gutter, and a column
 * that doesn't run wider than a comfortable measure on a tablet.
 *
 * No header beyond one thin row of chrome: a back button top-left on the
 * screens that have somewhere to go back to — see `previousRoute` for which do
 * and where each one lands — the appearance switch top-right on all of them
 * without exception, and between the two, three dots saying which part of the
 * session this is. All of it is drawn here rather than by each screen so that
 * they are in exactly the same place on every one, which for the switch is the
 * whole point: a control that moves between screens is a control that has to be
 * found again each time.
 *
 * The dots are the one thing here that is not chrome — see `progress-dots.tsx`
 * for why a session this long needs to say how much of it is left, and
 * `stageOf` in `routing.ts` for which screen counts as which part.
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
import { usePathname } from 'expo-router';

import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { stageOfPath } from '@/session/routing';
import { BackButton } from '@/session/ui/back-button';
import { ProgressDots } from '@/session/ui/progress-dots';
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
  /**
   * Read off the router rather than passed in by each screen. Which part a
   * screen belongs to is a fact about the flow, and the flow already knows it —
   * a `stage` prop would be the same fact written down sixteen more times, in
   * sixteen places that could each get it wrong. It also means the screens
   * inside `/one-more` — the breathwork, the PMR, the soundscape, each of which
   * draws its own frame — inherit the part they are nested in for free.
   */
  const stage = stageOfPath(usePathname());

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

          {/* Centred on the screen rather than laid out between the two
              controls: the back button is a word wide and the switch is three,
              so a dot row in the flow would sit off-centre by the difference
              and move again on the screens with no back button. Absolute keeps
              it on the middle of the page, which is where a progress indicator
              has to stay to read as one thing that is not moving. */}
          {stage ? (
            <View style={styles.progress} pointerEvents="none">
              <ProgressDots stage={stage} />
            </View>
          ) : null}
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
  // Pinned to all four edges of the row so the dots sit on the same line as
  // the two controls rather than at the top of whatever height the row ended
  // up being. It takes no layout space and no touches — the row's height is
  // still set by the back button and the switch.
  progress: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  centered: {
    justifyContent: 'center',
  },
});
