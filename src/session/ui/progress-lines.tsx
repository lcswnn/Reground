/**
 * Three short lines at the top of every session screen: how much of this is
 * left.
 *
 * The session is three parts long — the breath, the puzzle, the one more thing
 * — and until this existed there was no way to know that from inside it.
 * Someone who has answered two questions and been asked to breathe has no idea
 * whether they are near the end or at the start of something that keeps going,
 * and "how long is this" is exactly the question a person who opened this app
 * wound up is least able to sit with. Three marks answer it without a number, a
 * percentage or a countdown, none of which this app should be putting in front
 * of anyone.
 *
 * Which screen belongs to which part is decided in `routing.ts` and not here —
 * see `stageOf`. This file only knows how to draw a row of them.
 *
 * ## They were dots, and lines say the same thing better
 *
 * Three circles are three objects; three lines laid end to end are one object
 * divided into three, which is what a session actually is. A row of dots also
 * has to answer a question a reader will ask of it — are these steps, or are
 * they a count of something? — where a segmented line is read as a distance
 * with a position on it and nothing else. The app already has a hairline
 * vocabulary (see `Rule` and `OptionList`), and this now belongs to it.
 *
 * It costs the one thing dots were good at: at this size a line is a smaller
 * mark than a circle of the same width, so filled and empty are told apart by
 * ink alone rather than by ink and shape. That is why the empty ones are drawn
 * in `barDivider` rather than the fainter `border`, and why nothing here is
 * hollow — an outlined line is a rectangle, and a rectangle in the corner of a
 * screen is a box, not a mark.
 *
 * ## Filled means reached, and that is the whole language
 *
 * A segment fills when its part has been arrived at and stays filled, so the
 * last filled one is where you are and the rest is what is left. There is no
 * third state for "currently in": the last one fills when the last part is
 * reached, and the row is complete from there to the end of the session.
 *
 * Nothing animates. A segment that fills with a flourish is a reward, this is
 * not a streak, and the one screen where the row changes under the user's eye
 * is the one they are already reading something else on.
 */

import { StyleSheet, View } from "react-native";

import { Radius, Spacing } from "@/constants/theme";
import { PROGRESS } from "@/content/strings";
import { useTheme } from "@/hooks/use-theme";
import {
  SESSION_STAGES,
  stageIndex,
  type SessionStage,
} from "@/session/routing";

/**
 * One segment: long enough to read as a length rather than as a dash, short
 * enough that three of them and their gaps stay inside the space between the
 * back button and the appearance switch.
 *
 * The height is the app's rule weight rather than a hairline — see `Rule`,
 * which is two points for the same reason. A third of a point of ink in the
 * corner of a screen is a rumour, and this row has to be findable when looked
 * for.
 */
const SEGMENT_WIDTH = 22;
const SEGMENT_HEIGHT = 3;

export function ProgressLines({ stage }: { stage: SessionStage }) {
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
            styles.segment,
            {
              // Reached takes the accent; the rest take the app's heavier
              // divider ink. The row is the app reporting on its own progress —
              // nothing the user chose — which is the company the accent keeps
              // everywhere else it appears. See `constants/theme.ts`.
              backgroundColor:
                index <= current ? theme.accent : theme.barDivider,
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  // Close enough that the three read as one divided length, and far enough
  // apart that the divisions are visible — a gap at the app's smallest step.
  // The dots this replaced sat at `three`, which is right for keeping circles
  // from clotting into a dotted line and wrong here: a segmented bar with a
  // block's worth of air in it is three separate marks again.
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.one,
  },
  segment: {
    width: SEGMENT_WIDTH,
    height: SEGMENT_HEIGHT,
    // The rounded ends are what keep a short heavy line from reading as a
    // divider someone cropped — the same argument `Rule` makes.
    borderRadius: Radius.pill,
  },
});
