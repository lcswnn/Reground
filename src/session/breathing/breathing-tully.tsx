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
 * Every frame of every pose stays mounted, and opacity is the only thing that
 * ever moves. No `Image` here is given a second source for as long as the
 * screen is up.
 *
 * That is load-bearing, not tidiness. When a mounted `expo-image` has its
 * `source` changed it keeps drawing the *previous* image until the new one has
 * loaded — the documented behaviour that `recyclingKey` exists to opt out of.
 * This component used to mount three views keyed by variant and swap all three
 * sources on every pose change, which meant each view held its old drawing for
 * however long its own load took, while the shimmer below kept revealing them
 * on a 120ms clock. A view that had not caught up yet got shown still holding
 * the previous pose, so Tully visibly jumped back a size and forward again,
 * several times a second, all the way up the inhale and down the exhale. It
 * only looked stable across the top of the breath because `crest` and `peak`
 * are the same inflation, so there the stale frame was the same size.
 *
 * Mounting the lot costs a first decode of every frame, which lands during
 * `BREATHING.leadInMs` — the screen is deliberately still for 1.4s before the
 * first inhale, and this is the work that window is now absorbing. It also caps
 * what the artwork may weigh: 27 frames resident is the reason `tully-frames`
 * is scaled to the size Tully is actually drawn at rather than to a round
 * multiple. Anything that grows the frame count or the canvas is spending
 * memory that stays spent for the whole session.
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
      {TULLY_FRAMES.map((variants, at) =>
        variants.map((source, frame) => (
          <Image
            // Keyed by pose as well as variant, so React never reuses one of
            // these views for a different drawing. That is the whole point —
            // see the note above.
            key={`${at}-${frame}`}
            source={source}
            style={[
              StyleSheet.absoluteFill,
              at === pose && frame === showing ? styles.on : styles.off,
            ]}
            contentFit="contain"
            // The crossfade expo-image does by default would blur one outline
            // into the next and undo the point of drawing three of them.
            transition={0}
            cachePolicy="memory-disk"
          />
        )),
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  on: { opacity: 1 },
  off: { opacity: 0 },
});
