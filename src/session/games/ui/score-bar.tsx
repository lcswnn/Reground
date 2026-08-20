/**
 * The line above a game board: what you have done so far, or what to do, and a
 * word that swaps between the two.
 *
 * One row, two states, and the same height either way — which is the whole
 * design. When the score is off the row is the game's instruction, exactly as
 * it was before scores existed; when it is on, the instruction gives way to the
 * count. Nothing is added to the screen and nothing moves when it is toggled.
 *
 * That swap is also the answer to "delete some unneeded text". A player who has
 * turned the score on has played this game at least once and does not need to
 * be told to tap two neighbours; a player who has not is better served by the
 * instruction than by a number they did not ask for. Each state shows the one
 * that is worth the line.
 *
 * ## Why the control is here rather than in a settings screen
 *
 * There is no settings screen, and this app should not grow one for a boolean.
 * The other two preferences it keeps — appearance and country — are both
 * changed from the thing they affect, and this is the same: the score is turned
 * on next to where the score appears, so the control is discovered by the
 * person looking at the row it changes.
 *
 * It is deliberately a word rather than a switch. A toggle in the corner of a
 * game board is a control with a state to be read; "Show" is a thing to press.
 */

import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { PressableScale } from '@/components/ui/pressable-scale';
import { Spacing } from '@/constants/theme';
import { SCORE } from '@/content/strings';
import { useScorePreference } from '@/lib/score-preference';

interface ScoreBarProps {
  /**
   * What this game counts, already worded — see `SCORE` for the phrasings, and
   * note that every one of them is a count of something done rather than a
   * total to beat.
   */
  score: string;
  /** The game's own instruction, shown while the score is off. */
  hint: string;
}

export function ScoreBar({ score, hint }: ScoreBarProps) {
  const { shown, setShown } = useScorePreference();

  return (
    <View style={styles.row}>
      {/* Takes the rest of the row, so the control on the right sits on the
          same edge whichever of the two is being shown and however long it is. */}
      <ThemedText type="small" themeColor="textMuted" style={styles.line}>
        {shown ? score : hint}
      </ThemedText>

      <PressableScale
        accessibilityRole="button"
        accessibilityState={{ expanded: shown }}
        accessibilityLabel={shown ? SCORE.hide : SCORE.show}
        depth="text"
        hitSlop={Spacing.three}
        onPress={() => setShown(!shown)}
        style={({ pressed }) => pressed && styles.pressed}>
        <ThemedText type="small" themeColor="textMuted" style={styles.underline}>
          {shown ? SCORE.hide : SCORE.show}
        </ThemedText>
      </PressableScale>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  line: {
    flex: 1,
  },
  underline: {
    textDecorationLine: 'underline',
  },
  pressed: {
    opacity: 0.75,
  },
});
