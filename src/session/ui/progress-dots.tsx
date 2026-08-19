/**
 * Three dots at the top of every session screen: how much of this is left.
 *
 * The session is three parts long — the breath, the puzzle, the one more thing
 * — and until this existed there was no way to know that from inside it. Someone who has answered two questions and been asked to breathe
 * has no idea whether they are near the end or at the start of something that
 * keeps going, and "how long is this" is exactly the question a person who
 * opened this app wound up is least able to sit with. Three dots answer it
 * without a number, a percentage or a countdown, none of which this app should
 * be putting in front of anyone.
 *
 * Which screen belongs to which part is decided in `routing.ts` and not here —
 * see `stageOf`. This file only knows how to draw a row of them.
 *
 * ## Filled means reached, and that is the whole language
 *
 * A dot fills when its part has been arrived at and stays filled, so the last
 * filled dot is where you are and the hollow ones are what is left. There is no
 * third state for "currently in" — the palette is ink on paper with no accent
 * to spend on one, and a row of three subtly different circles is a puzzle
 * rather than an answer. The last one fills when the last part is reached, and
 * the row is complete from there to the end of the session.
 *
 * Nothing animates. A dot that fills with a flourish is a reward, this is not a
 * streak, and the one screen where the row changes under the user's eye is the
 * one they are already reading something else on.
 */

import { StyleSheet, View } from 'react-native';

import { PROGRESS } from '@/content/strings';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  SESSION_STAGES,
  stageIndex,
  type SessionStage,
} from '@/session/routing';

/**
 * Small enough to be furniture. These sit in the chrome row between the back
 * button and the appearance switch, and the row's job is to be findable when
 * looked for and invisible otherwise — the same bargain both controls in it
 * already make.
 */
const DOT = 7;

export function ProgressDots({ stage }: { stage: SessionStage }) {
  const theme = useTheme();
  const current = stageIndex(stage);

  return (
    <View
      style={styles.row}
      accessibilityRole="progressbar"
      accessibilityLabel={PROGRESS.label(
        PROGRESS[stage],
        current + 1,
        SESSION_STAGES.length,
      )}>
      {SESSION_STAGES.map((name, index) => (
        <View
          key={name}
          style={[
            styles.dot,
            // Filled dots take the accent; empty ones keep the ink hairline
            // they always had. The row is the app reporting on its own
            // progress — nothing the user chose — which is the company the
            // accent keeps everywhere else it appears. See `constants/theme.ts`.
            index <= current
              ? { backgroundColor: theme.accent, borderColor: theme.accent }
              : { borderColor: theme.border },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  // Set wide enough that the row reads as four marks rather than as one dotted
  // line: at a tighter gap the dots grouped into a single smudge in the corner
  // of the eye, which is the wrong shape for a thing whose whole message is
  // "there are four of these and you are on the second".
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  // Hollow ones are drawn as a ring rather than as a fainter fill: a wash of
  // ink at low alpha on paper reads as a filled dot in bright light, which is
  // the one thing this row cannot afford to be ambiguous about.
  dot: {
    width: DOT,
    height: DOT,
    borderRadius: DOT / 2,
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
});
