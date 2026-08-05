/**
 * Hidden Cube Count — a pile of blocks, and how many of them there are.
 *
 * The pile is drawn as three parallelograms per cube, each one a square `View`
 * put through the transform `shear` solves for it. See `iso.ts` for why it is
 * done that way at all, and `stack.ts` for the rule that guarantees there is
 * something to not see.
 *
 * Two things here are doing work that is easy to mistake for decoration:
 *
 * 1. THE THREE FACES ARE THREE DIFFERENT SHADES. With one shade the pile is a
 *    silhouette, and a silhouette has no depth to reason about.
 * 2. EVERY FACE IS OUTLINED IN THE PAGE COLOUR. Neighbouring cubes present the
 *    same face at the same angle, so without a seam between them four cubes in
 *    a row are one long face and the count is not there to be made.
 */

import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { HIDDEN_CUBES } from '@/content/strings';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { mix } from '@/lib/color';
import { TrialFrame, type TrialChoice } from '@/session/games/ui/trial';
import { cubeFaces, faceBounds, geometry, shear, type FaceKind } from '@/session/games/cubes/iso';
import { buildRound, drawOrder } from '@/session/games/cubes/stack';

/** Past this the pile is bigger than it needs to be to be legible. */
const MAX_EDGE = 54;
const MIN_EDGE = 16;
const BOX_ESTIMATE = { width: 300, height: 240 };

/**
 * How much ink each face carries, as a mix rather than an alpha.
 *
 * Light from over the left shoulder, roughly: the top catches the most, the two
 * verticals take progressively less. The gaps between them are wide because the
 * whole palette is one hue — with no colour to tell the faces apart, value is
 * all there is, and three shades a few percent apart would read as one.
 *
 * Opaque, and that part is not a matter of taste: the pile is drawn back to
 * front with nothing but the draw order doing the occlusion, so a translucent
 * face shows the cubes it is meant to be hiding. See `mix`.
 */
const SHADE: Record<FaceKind, number> = { top: 0.5, right: 0.32, left: 0.16 };

export function HiddenCubes() {
  const theme = useTheme();
  const [round, setRound] = useState(() => buildRound());
  const [index, setIndex] = useState(0);
  const [box, setBox] = useState(BOX_ESTIMATE);

  const next = useCallback(() => {
    setRound(buildRound());
    setIndex((count) => count + 1);
  }, []);

  const { faces, edge, offset } = useMemo(() => {
    const cubes = drawOrder(round.heights);

    // Measured at an edge length of one, which makes the pile's proportions
    // known before its size is: everything here is linear in the edge, so the
    // largest edge that fits is one division rather than a search.
    const unit = cubes.flatMap((cube) =>
      cubeFaces(cube.column, cube.row, cube.level, geometry(1)),
    );
    const unitBox = faceBounds(unit);
    const size = Math.max(
      MIN_EDGE,
      Math.min(
        MAX_EDGE,
        box.width / (unitBox.maxX - unitBox.minX),
        box.height / (unitBox.maxY - unitBox.minY),
      ),
    );

    const geo = geometry(size);
    const drawn = cubes.flatMap((cube) =>
      cubeFaces(cube.column, cube.row, cube.level, geo),
    );
    const drawnBox = faceBounds(drawn);

    return {
      faces: drawn,
      edge: size,
      // Top-left of the pile's own box to top-left of the space it was given,
      // plus half of whatever is left over on each axis.
      offset: {
        x: -drawnBox.minX + (box.width - (drawnBox.maxX - drawnBox.minX)) / 2,
        y: -drawnBox.minY + (box.height - (drawnBox.maxY - drawnBox.minY)) / 2,
      },
    };
  }, [box.height, box.width, round.heights]);

  const choices: TrialChoice[] = round.options.map((count) => ({
    key: `${index}-${count}`,
    label: String(count),
    correct: count === round.total,
  }));

  return (
    <TrialFrame
      prompt={HIDDEN_CUBES.prompt}
      roundKey={index}
      choices={choices}
      onNext={next}
      columns={4}>
      <View
        accessible
        accessibilityLabel={HIDDEN_CUBES.stackLabel}
        style={styles.stage}
        onLayout={(event) =>
          setBox({
            width: event.nativeEvent.layout.width,
            height: event.nativeEvent.layout.height,
          })
        }>
        {faces.map((face, faceIndex) => {
          const chain = shear(face.u, face.v, edge);

          return (
            <View
              key={faceIndex}
              style={[
                styles.face,
                {
                  left: face.origin.x + offset.x,
                  top: face.origin.y + offset.y,
                  width: edge,
                  height: edge,
                  backgroundColor: mix(theme.background, theme.brand, SHADE[face.kind]),
                  borderColor: theme.background,
                  // The corner the parallelogram is measured from has to be the
                  // corner the transform pivots about, or every face lands
                  // somewhere other than where the geometry put it.
                  transformOrigin: [0, 0, 0],
                  transform: [
                    { rotate: `${chain.rotate}deg` },
                    { skewX: `${chain.skewX}deg` },
                    { scaleX: chain.scaleX },
                    { scaleY: chain.scaleY },
                  ],
                },
              ]}
            />
          );
        })}
      </View>
    </TrialFrame>
  );
}

const styles = StyleSheet.create({
  stage: {
    flex: 1,
    alignSelf: 'stretch',
    marginVertical: Spacing.two,
  },
  face: {
    position: 'absolute',
    borderWidth: 1,
  },
});
