/**
 * A line you can tap for the explanation, and nothing until you do.
 *
 * The two screens using this both have something worth explaining and neither
 * can afford to explain it on arrival: one is asking for a minute of breathing
 * and the other is asking someone to bring back the thing that upset them. A
 * paragraph on either is a wall of text handed to a person who is already
 * carrying enough, and the tap is what makes it their choice.
 *
 * Closed by default and always. Nothing remembers that it was opened last
 * session — the session state is in memory only, and a screen that opens itself
 * because of something you did last week is a screen making a decision for you.
 *
 * Reduce Motion is handed to Reanimated rather than branched on here: every
 * builder below carries `ReduceMotion.System`, so the setting turns the fade
 * and the slide into a cut without this component knowing about it.
 */

import { useState, type ReactNode } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  LinearTransition,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { PressableScale } from '@/components/ui/pressable-scale';
import { DISCLOSURE } from '@/content/strings';
import { Spacing } from '@/constants/theme';

/** Opening is slower than closing: arriving takes its time, leaving doesn't. */
const OPEN_MS = 240;
const CLOSE_MS = 160;

/**
 * The slide the rest of the screen does when this opens under it.
 *
 * Exported because it has to be applied by whatever sits *below* the
 * disclosure — a layout transition only animates the view it is on, so without
 * this the explanation fades in while the Start button underneath it jumps.
 */
export const DISCLOSURE_LAYOUT = LinearTransition.duration(OPEN_MS).reduceMotion(
  ReduceMotion.System,
);

interface DisclosureProps {
  /** Phrased as the question the body answers, so the tap is worth making. */
  label: string;
  children: ReactNode;
}

export function Disclosure({ label, children }: DisclosureProps) {
  const [open, setOpen] = useState(false);
  const turn = useSharedValue(0);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    turn.value = withTiming(next ? 1 : 0, {
      duration: next ? OPEN_MS : CLOSE_MS,
      reduceMotion: ReduceMotion.System,
    });
  };

  // A quarter turn, which is the whole of the affordance: the chevron points
  // along the line when closed and down into the text when open.
  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${turn.value * 90}deg` }],
  }));

  return (
    <Animated.View layout={DISCLOSURE_LAYOUT}>
      <PressableScale
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={label}
        onPress={toggle}
        depth="text"
        hitSlop={Spacing.three}
        style={({ pressed }) => [styles.trigger, pressed && styles.pressed]}>
        <Animated.View style={chevronStyle}>
          <ThemedText type="small" themeColor="textMuted">
            {DISCLOSURE.chevron}
          </ThemedText>
        </Animated.View>
        <ThemedText type="small" themeColor="textMuted">
          {label}
        </ThemedText>
      </PressableScale>

      {open ? (
        <Animated.View
          entering={FadeIn.duration(OPEN_MS).reduceMotion(ReduceMotion.System)}
          exiting={FadeOut.duration(CLOSE_MS).reduceMotion(ReduceMotion.System)}
          style={styles.body}>
          {children}
        </Animated.View>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  trigger: {
    // Sized to its label rather than stretched across the column: a full-width
    // tap target on a screen with one real button reads as a second button.
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.one,
  },
  // Shallower than the 0.6 it was, matching the other small text controls now
  // that the press itself moves.
  pressed: {
    opacity: 0.75,
  },
  body: {
    paddingTop: Spacing.three,
    gap: Spacing.three,
  },
});
