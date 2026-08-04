/**
 * The frog, drawn at whichever pose the breath has reached.
 *
 * Two clocks, deliberately unrelated. The pose comes down as a prop from the
 * phase machine in `breathing-guide.tsx`, so it changes eight times a cycle on
 * the same boundaries the circle and the haptics use. The shimmer — which of
 * the three outlines of that pose is showing — runs here on its own interval,
 * because it is not part of the breath. It is the thing that keeps the frog
 * from reading as a static image during the four seconds it spends at the
 * bottom, and tying it to the breath would make those four seconds still.
 *
 * All three outlines of the current pose stay mounted and the shimmer only
 * moves opacity between them. Swapping one `Image`'s source eight times a
 * second would work, but every swap is a decode the view might not have
 * finished before the next frame — the stack turns the common case into a
 * property change and leaves the decode for the two-per-second pose change,
 * where there is time to absorb it.
 */

import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';

import { FROG } from '@/config/session';
import { FROG_FRAMES, SHIMMER_FRAMES } from '@/session/breathing/frog-frames';

interface BreathingFrogProps {
  /** An index into `FROG_FRAMES` — see `POSE` in `frog-cycle.ts`. */
  pose: number;
  /**
   * Side of the square the frog is drawn inside. The artwork is cropped to an
   * aspect of 1.02, so `contain` leaves only a hairline spare on one axis.
   */
  size: number;
  /** Reduce Motion. Holds one outline and stops the shimmer dead. */
  still?: boolean;
}

export function BreathingFrog({ pose, size, still = false }: BreathingFrogProps) {
  const [shimmer, setShimmer] = useState(0);

  useEffect(() => {
    if (still) return;

    const id = setInterval(
      () => setShimmer((frame) => (frame + 1) % SHIMMER_FRAMES),
      FROG.shimmerMs,
    );
    return () => clearInterval(id);
  }, [still]);

  const showing = still ? 0 : shimmer;

  return (
    // Hidden from VoiceOver rather than labelled. The frog is the picture of
    // the instruction, not the instruction — that is the cue text below it,
    // which is already read out. A label here would put a decorative image in
    // the swipe order of a screen whose whole point is that there is nothing
    // to navigate.
    // Sized by the caller rather than filling what it is given, so the frog and
    // the circle can be tuned against each other in one place.
    <View
      style={{ width: size, height: size }}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants">
      {FROG_FRAMES[pose].map((source, frame) => (
        <Image
          key={frame}
          source={source}
          style={[StyleSheet.absoluteFill, frame === showing ? styles.on : styles.off]}
          contentFit="contain"
          // The crossfade expo-image does by default would blur one outline
          // into the next and undo the point of drawing three of them.
          transition={0}
          cachePolicy="memory-disk"
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  on: { opacity: 1 },
  off: { opacity: 0 },
});
