/**
 * Paper Fold — the folds, the punch, and four sheets to choose between.
 *
 * The rules are in `fold.ts`; this draws them. The one drawing decision worth
 * explaining is how a fold is shown: each step is the whole square, with the
 * half that is still there drawn solid and the half that lifted over the crease
 * left as a faint outline. No arrows on the paper, no little dotted crease
 * lines — the pair of shapes says which way it went, and it says it in the same
 * visual language as the answer sheets, so nothing has to be decoded twice.
 *
 * The punch is drawn on the last step only, because that is when it happens.
 */

import { useCallback, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { PAPER_FOLD } from '@/content/strings';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { withAlpha } from '@/lib/color';
import { TrialFrame, type ChoiceState, type TrialChoice } from '@/session/games/ui/trial';
import {
  SHEET,
  buildRound,
  movedHalf,
  type Point,
  type Rect,
} from '@/session/games/paper-fold/fold';

/** A hole's diameter, as a fraction of the sheet it is punched in. */
const HOLE = 0.13;

const MAX_STEP = 132;
const MIN_STEP = 44;
const MAX_OPTION = 116;
/** The "→" between two fold steps. */
const ARROW_WIDTH = 22;
/** First-frame guess, replaced by the measured row on the next frame. */
const STAGE_ESTIMATE = { width: 320, height: 120 };

export function PaperFold() {
  const { width } = useWindowDimensions();
  const [round, setRound] = useState(() => buildRound());
  const [index, setIndex] = useState(0);
  const [stage, setStage] = useState(STAGE_ESTIMATE);

  const next = useCallback(() => {
    setRound(buildRound());
    setIndex((count) => count + 1);
  }, []);

  // The answers are laid out against the screen's own column — `SessionScreen`'s
  // gutter and max width — but the fold steps get whatever height is going, so
  // they are sized off the measured box. Two folds on a tall screen leaves the
  // width division well short of what would fit, and a diagram you have to lean
  // in to read is the wrong thing to be careful with the space on.
  const column = Math.min(width, MaxContentWidth) - Spacing.four * 2;
  const steps = round.frames.length;
  const stepSize = Math.max(
    MIN_STEP,
    Math.min(
      MAX_STEP,
      (stage.width - ARROW_WIDTH * (steps - 1)) / steps - Spacing.two,
      stage.height,
    ),
  );
  // Two per row, less the slot padding and the tile's own padding in `trial.tsx`.
  const optionSize = Math.min(MAX_OPTION, column / 2 - Spacing.one * 2 - Spacing.two * 2);

  const choices: TrialChoice[] = round.options.map((option, optionIndex) => ({
    key: `${index}-${optionIndex}`,
    label: PAPER_FOLD.option(optionIndex + 1),
    correct: optionIndex === round.answerIndex,
    render: (state: ChoiceState) => (
      <Sheet size={optionSize} area={SHEET} punches={option} dimmed={state === 'muted'} />
    ),
  }));

  return (
    <TrialFrame
      prompt={PAPER_FOLD.prompt}
      roundKey={index}
      choices={choices}
      onNext={next}>
      <View
        style={styles.steps}
        onLayout={(event) =>
          setStage({
            width: event.nativeEvent.layout.width,
            height: event.nativeEvent.layout.height,
          })
        }>
        {round.frames.map((frame, frameIndex) => {
          const last = frameIndex === round.frames.length - 1;

          return (
            <View key={frameIndex} style={styles.step}>
              {frameIndex > 0 ? (
                <ThemedText
                  type="small"
                  themeColor="textMuted"
                  style={[styles.arrow, { width: ARROW_WIDTH }]}>
                  {PAPER_FOLD.arrow}
                </ThemedText>
              ) : null}

              <Sheet
                size={stepSize}
                area={frame}
                // The half that is about to lift, shown on the step it lifts
                // from — so a fold reads as one picture rather than as a
                // difference between two.
                ghost={last ? undefined : movedHalf(frame, round.folds[frameIndex])}
                punches={last ? round.punches : []}
                label={
                  last
                    ? PAPER_FOLD.punchedLabel
                    : frameIndex === 0
                      ? PAPER_FOLD.sheetLabel
                      : PAPER_FOLD.foldLabel(frameIndex)
                }
              />
            </View>
          );
        })}
      </View>
    </TrialFrame>
  );
}

/**
 * One square of paper: the sheet's outline, whatever of it is still there, and
 * the holes.
 *
 * Top-level rather than nested inside `PaperFold`, which is not a style
 * preference — a component declared inside a render is a new type on every
 * render, so React unmounts and remounts every sheet on screen each time the
 * round changes rather than updating them.
 */
function Sheet({
  size,
  area,
  ghost,
  punches,
  dimmed = false,
  label,
}: {
  size: number;
  area: Rect;
  ghost?: Rect;
  punches: readonly Point[];
  dimmed?: boolean;
  label?: string;
}) {
  const theme = useTheme();

  const box = (rect: Rect) => ({
    left: rect.x0 * size,
    top: rect.y0 * size,
    width: (rect.x1 - rect.x0) * size,
    height: (rect.y1 - rect.y0) * size,
  });

  return (
    <View
      accessible
      accessibilityLabel={label}
      style={[
        styles.sheet,
        { width: size, height: size, borderColor: theme.border },
        dimmed && styles.dimmed,
      ]}>
      <View
        style={[
          styles.paper,
          box(area),
          {
            backgroundColor: theme.backgroundElement,
            borderColor: theme.brand,
          },
        ]}
      />

      {/* Over the paper rather than under it. The half that is about to lift is
          part of the sheet that is still there, so drawing it first put it
          behind the very thing it was marking and nothing showed at all. */}
      {ghost ? (
        <View
          style={[
            styles.ghost,
            box(ghost),
            {
              borderColor: withAlpha(theme.brand, 0.5),
              backgroundColor: withAlpha(theme.brand, 0.1),
            },
          ]}
        />
      ) : null}

      {punches.map((punch, punchIndex) => (
        <View
          key={punchIndex}
          style={[
            styles.hole,
            {
              left: (punch.x - HOLE / 2) * size,
              top: (punch.y - HOLE / 2) * size,
              width: HOLE * size,
              height: HOLE * size,
              borderRadius: (HOLE * size) / 2,
              backgroundColor: theme.background,
              borderColor: theme.brand,
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  // Stretched and flexed so the box it reports is the space it was given rather
  // than the size of what is in it — the steps are sized *from* that
  // measurement, and a box that shrank to its contents would chase itself.
  steps: {
    flex: 1,
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  arrow: {
    textAlign: 'center',
  },
  sheet: {
    borderRadius: Radius.sm,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderStyle: 'dashed',
  },
  ghost: {
    position: 'absolute',
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderStyle: 'dashed',
  },
  paper: {
    position: 'absolute',
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  hole: {
    position: 'absolute',
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  dimmed: {
    opacity: 0.5,
  },
});
