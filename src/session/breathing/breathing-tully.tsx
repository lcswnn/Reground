/**
 * Tully, drawn at whichever pose the breath has reached.
 *
 * Two clocks, deliberately unrelated. The pose comes down as a prop from the
 * phase machine in `breathing-guide.tsx`, so it changes fifteen times a cycle
 * on the same boundaries the circle and the haptics use. The shimmer — which
 * of the three outlines of that pose is showing — runs here on its own
 * interval,
 * because it is not part of the breath. It is the thing that keeps Tully from
 * reading as a static image during the seconds they spend at the bottom, and
 * tying it to the breath would make those seconds still.
 *
 * All three outlines of the current pose stay mounted and the shimmer only
 * moves opacity between them. Swapping one `Image`'s source eight times a
 * second would work, but every swap is a decode the view might not have
 * finished before the next frame — the stack turns the common case into a
 * property change and leaves the decode for the pose change, where there is
 * time to absorb it.
 */

import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';

import { TULLY } from '@/config/session';
import { SHIMMER_FRAMES, TULLY_FRAMES } from '@/session/breathing/tully-frames';

interface BreathingTullyProps {
  /** An index into `TULLY_FRAMES` — see `POSE` in `tully-cycle.ts`. */
  pose: number;
  /**
   * Side of the square Tully is drawn inside. The artwork is cropped to an
   * aspect of 1.15, so `contain` fits them to the width and leaves a little
   * spare above and below.
   */
  size: number;
  /** Reduce Motion. Holds one outline and stops the shimmer dead. */
  still?: boolean;
}

export function BreathingTully({ pose, size, still = false }: BreathingTullyProps) {
  const [shimmer, setShimmer] = useState(0);

  useEffect(() => {
    if (still) return;

    const id = setInterval(
      () => setShimmer((frame) => (frame + 1) % SHIMMER_FRAMES),
      TULLY.shimmerMs,
    );
    return () => clearInterval(id);
  }, [still]);

  const showing = still ? 0 : shimmer;

  return (
    // Hidden from VoiceOver rather than labelled. Tully is the picture of the
    // instruction, not the instruction — that is the cue text below them, which
    // is already read out. A label here would put a decorative image in the
    // swipe order of a screen whose whole point is that there is nothing to
    // navigate.
    // Sized by the caller rather than filling what it is given, so Tully and
    // the circle can be tuned against each other in one place.
    <View
      style={{ width: size, height: size }}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants">
      {TULLY_FRAMES[pose].map((source, frame) => (
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
