/**
 * The frame the judgement games sit in: a question, a thing to look at, and a
 * short row of answers.
 *
 * Four of the games are the same shape underneath — Rotation Match, Paper Fold,
 * Net Fold and Hidden Cubes all show a figure and ask one closed question about
 * it. What differs between them is entirely in the stimulus and the rules that
 * generated it, so that is what those files hold, and everything about the beat
 * of a trial lives here: how long the answer stays up, what a wrong pick looks
 * like, when the next one arrives.
 *
 * ## Why these have a right answer when nothing else in the app does
 *
 * The rest of the session is careful never to grade anyone — no score, no
 * levels, no fail state. A trial is the one place that cannot hold: "is this the
 * same shape turned, or its mirror?" is a question with an answer, and an app
 * that took the answer and said nothing would be asking people to do the work
 * for no reason.
 *
 * So it says, and then it drops it. There is no counter, no streak, no summary
 * at the end, nothing that accumulates across trials and nothing to be behind
 * on. A wrong pick is answered by showing which one it was and moving on, which
 * is the same thing a person sitting next to you would do.
 */

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { TRIAL } from '@/content/strings';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { withAlpha } from '@/lib/color';
import { tickPlacement, tickSelection } from '@/session/ui/haptics';

/** How a choice is being drawn once the trial has been answered. */
export type ChoiceState = 'idle' | 'correct' | 'wrong' | 'muted';

export interface TrialChoice {
  /** Unique within the round. */
  key: string;
  /** Read out by the screen reader, and drawn when there is no `render`. */
  label: string;
  correct: boolean;
  /** For picture answers — the four unfolded sheets, the six cube faces. */
  render?: (state: ChoiceState) => ReactNode;
}

interface TrialFrameProps {
  /** The question. One line, and the same one every round of a given game. */
  prompt: string;
  /** Changes when the round does, which is what clears the last answer. */
  roundKey: string | number;
  /** The stimulus: whatever is being judged. */
  children: ReactNode;
  choices: readonly TrialChoice[];
  /** Builds the next round. Called once the answer has been on screen a while. */
  onNext: () => void;
  /** Picture answers want a wrapping grid; two words want one row. */
  columns?: number;
}

/**
 * How long the answer stays up before the next round, in milliseconds.
 *
 * Two numbers rather than one: a correct pick has nothing left to look at and
 * waiting on it is just dead time, while a wrong one has only just been told
 * where the right answer was, and reading that off a diagram takes longer than
 * reading "yes". Advancing both at the same pace makes the game feel like it is
 * hurrying you past exactly the trial you got something out of.
 */
const REVEAL_MS = { correct: 1_100, wrong: 2_400 } as const;

export function TrialFrame({
  prompt,
  roundKey,
  children,
  choices,
  onNext,
  columns = 2,
}: TrialFrameProps) {
  const theme = useTheme();

  /**
   * The answer, tagged with the round it belongs to.
   *
   * Tagged rather than cleared by an effect on `roundKey`: an effect that calls
   * `setState` runs a render with last round's answer still showing against this
   * round's figure, and then immediately renders again. Reading it as "there is
   * no answer unless it is this round's" makes that state unrepresentable.
   */
  const [picked, setPicked] = useState<{ round: string | number; key: string } | null>(
    null,
  );

  // Held so a round can be cut short by unmounting — "I'm done" is on screen the
  // whole time, and a timer that fires into a dead screen would advance a round
  // nobody is looking at.
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const chosenKey = picked?.round === roundKey ? picked.key : null;
  const answered = chosenKey !== null;
  const pickedChoice = choices.find((choice) => choice.key === chosenKey);
  const wasRight = pickedChoice?.correct === true;

  const answer = (choice: TrialChoice) => {
    if (answered) return;

    setPicked({ round: roundKey, key: choice.key });
    if (choice.correct) tickPlacement();
    else tickSelection();

    timer.current = setTimeout(
      onNext,
      choice.correct ? REVEAL_MS.correct : REVEAL_MS.wrong,
    );
  };

  const stateOf = (choice: TrialChoice): ChoiceState => {
    if (!answered) return 'idle';
    if (choice.correct) return 'correct';
    if (choice.key === chosenKey) return 'wrong';
    return 'muted';
  };

  return (
    <View style={styles.root}>
      <ThemedText type="small" themeColor="textMuted" style={styles.prompt}>
        {prompt}
      </ThemedText>

      <View style={styles.stimulus}>{children}</View>

      <View style={styles.answers}>
        {/* Holds its line whether or not anything has been answered, so the
            choices do not jump down the screen the moment they are pressed. */}
        <ThemedText type="small" themeColor="textMuted" style={styles.verdict}>
          {answered ? (wasRight ? TRIAL.right : TRIAL.wrong) : ' '}
        </ThemedText>

        <View style={styles.choices}>
          {choices.map((choice) => {
            const state = stateOf(choice);

            return (
              <View
                key={choice.key}
                style={[styles.slot, { width: `${100 / columns}%` }]}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={choice.label}
                  accessibilityState={{ disabled: answered }}
                  disabled={answered}
                  onPress={() => answer(choice)}
                  style={({ pressed }) => [
                    styles.choice,
                    {
                      backgroundColor:
                        state === 'correct'
                          ? withAlpha(theme.brand, 0.14)
                          : theme.backgroundElement,
                      borderColor: state === 'correct' ? theme.brand : theme.border,
                    },
                    // The wrong pick is drawn as an outline that has come apart
                    // rather than as anything red — the palette has no red in it,
                    // and a dashed edge says "not this" without saying "bad".
                    state === 'wrong' && styles.wrong,
                    state === 'muted' && styles.muted,
                    pressed && styles.pressed,
                  ]}>
                  {choice.render ? (
                    choice.render(state)
                  ) : (
                    <ThemedText type="defaultSemiBold">{choice.label}</ThemedText>
                  )}
                </Pressable>
              </View>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignSelf: 'stretch',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  prompt: {
    textAlign: 'center',
  },
  // Takes what is left after the prompt and the answers, and centres the figure
  // in it. The games below draw into a measured box rather than a share of the
  // window — see the note on sizing in `puzzle-board.tsx`.
  stimulus: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  answers: {
    gap: Spacing.two,
  },
  verdict: {
    textAlign: 'center',
  },
  choices: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  // The gap is padding inside each slot rather than a `gap` on the row: the
  // slots are sized by percentage so that a row of two and a row of four line
  // up, and a gap would push the last one onto its own line.
  slot: {
    padding: Spacing.one,
  },
  choice: {
    minHeight: 56,
    borderRadius: Radius.button,
    borderWidth: StyleSheet.hairlineWidth * 2,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.two,
  },
  wrong: {
    borderStyle: 'dashed',
    opacity: 0.6,
  },
  muted: {
    opacity: 0.35,
  },
  pressed: {
    opacity: 0.7,
  },
});
