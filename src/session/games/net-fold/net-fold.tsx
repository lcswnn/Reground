/**
 * Net Fold — six faces flat, and which one ends up on the far side.
 *
 * The folding is worked out in `nets.ts`. The decision that lives here is that
 * faces are told apart by pips rather than by letters or colours.
 *
 * Letters were the obvious first choice and are wrong: a letter has an up, so
 * the moment the net is turned — which it is, every round, so that the same
 * seven pictures are not answered from memory — the player is reading a sideways
 * F and the item is quietly about that instead. Colour is out for the reason the
 * whole palette is: there is one ink in this app and nothing on screen shouts.
 * A pip pattern reads the same at any angle and names a face without decoration.
 */

import { useCallback, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';

import { NET_FOLD } from '@/content/strings';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { TrialFrame, type ChoiceState, type TrialChoice } from '@/session/games/ui/trial';
import { buildRound } from '@/session/games/net-fold/nets';

/**
 * Where the dots sit, as positions on a 3×3 — the arrangement on a die, which
 * is the one pip layout everybody can already read.
 */
const PIPS: Record<number, readonly (readonly [number, number])[]> = {
  1: [[1, 1]],
  2: [
    [0, 0],
    [2, 2],
  ],
  3: [
    [0, 0],
    [1, 1],
    [2, 2],
  ],
  4: [
    [0, 0],
    [0, 2],
    [2, 0],
    [2, 2],
  ],
  5: [
    [0, 0],
    [0, 2],
    [1, 1],
    [2, 0],
    [2, 2],
  ],
  6: [
    [0, 0],
    [0, 2],
    [1, 0],
    [1, 2],
    [2, 0],
    [2, 2],
  ],
};

const MAX_FACE = 62;
const MAX_OPTION_FACE = 46;
/** First-frame guess, replaced by the measured box on the next frame. */
const BOX_ESTIMATE = { width: 320, height: 260 };
/** A dot, as a fraction of the face it is on. */
const PIP = 0.16;

export function NetFold() {
  const { width } = useWindowDimensions();
  const [round, setRound] = useState(() => buildRound());
  const [index, setIndex] = useState(0);
  const [box, setBox] = useState(BOX_ESTIMATE);

  const next = useCallback(() => {
    setRound(buildRound());
    setIndex((count) => count + 1);
  }, []);

  const column = Math.min(width, MaxContentWidth) - Spacing.four * 2;
  // Both ways round: a net is up to five faces across, and a turned one is up
  // to five faces down. Sizing on width alone puts the tall ones through the
  // bottom of the screen.
  const faceSize = Math.min(
    MAX_FACE,
    box.width / round.grid[0].length,
    box.height / round.grid.length,
  );
  const optionSize = Math.min(
    MAX_OPTION_FACE,
    column / 4 - Spacing.one * 2 - Spacing.two * 2,
  );

  const choices: TrialChoice[] = round.options.map((pips) => ({
    key: `${index}-${pips}`,
    label: NET_FOLD.faceLabel(pips),
    correct: pips === round.answer,
    render: (state: ChoiceState) => (
      <Face pips={pips} size={optionSize} dimmed={state === 'muted'} />
    ),
  }));

  return (
    <TrialFrame
      prompt={NET_FOLD.prompt}
      roundKey={index}
      choices={choices}
      onNext={next}
      columns={4}>
      <View
        style={styles.stage}
        onLayout={(event) =>
          setBox({
            width: event.nativeEvent.layout.width,
            height: event.nativeEvent.layout.height,
          })
        }>
        <View accessible accessibilityLabel={NET_FOLD.netLabel(round.marked)}>
          {round.grid.map((row, rowIndex) => (
            <View key={rowIndex} style={styles.row}>
              {row.map((pips, columnIndex) => (
                <View key={columnIndex} style={{ width: faceSize, height: faceSize }}>
                  {pips === null ? null : (
                    <Face pips={pips} size={faceSize} marked={pips === round.marked} />
                  )}
                </View>
              ))}
            </View>
          ))}
        </View>
      </View>
    </TrialFrame>
  );
}

/** One square of the net, or one answer. */
function Face({
  pips,
  size,
  marked = false,
  dimmed = false,
}: {
  pips: number;
  size: number;
  marked?: boolean;
  dimmed?: boolean;
}) {
  const theme = useTheme();
  const dot = size * PIP;
  const ink = marked ? theme.textOnBrand : theme.brand;

  return (
    <View
      style={[
        styles.face,
        {
          width: size,
          height: size,
          backgroundColor: marked ? theme.brand : theme.backgroundElement,
          borderColor: theme.brand,
        },
        dimmed && styles.dimmed,
      ]}>
      {PIPS[pips].map(([row, column], pipIndex) => (
        <View
          key={pipIndex}
          style={{
            position: 'absolute',
            // Thirds of the face, less half a dot, which centres each one in
            // its third rather than hanging it off the corner.
            left: ((column + 0.5) / 3) * size - dot / 2,
            top: ((row + 0.5) / 3) * size - dot / 2,
            width: dot,
            height: dot,
            borderRadius: dot / 2,
            backgroundColor: ink,
          }}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  stage: {
    flex: 1,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
  },
  face: {
    borderRadius: Radius.sm / 2,
    // Faces sit edge to edge, so a full border on each would draw every inside
    // seam twice as heavily as the outside of the net.
    borderWidth: StyleSheet.hairlineWidth,
  },
  dimmed: {
    opacity: 0.5,
  },
});
