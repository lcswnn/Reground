/**
 * Screen 5 — the visuospatial task itself, whichever game was picked.
 *
 * The screen is the frame, not the game: it owns the framing copy, the dose
 * timer and the way out, and renders whatever `/games` chose inside that. Every
 * game on the list is interchangeable from here, which is the point — the
 * mechanism is "occupy visual working memory", and nothing about the timing or
 * the copy depends on which one does it.
 *
 * This screen is framed differently for the two groups. For GROUP B — someone
 * who saw something — it is the point of the whole session, it runs longer,
 * and the copy says what it is for. For GROUP A it is one step among several
 * and is introduced as such. The branch is on the group, never on the specific
 * category.
 *
 * The user is never trapped: "I'm done" is on screen the entire time, not only
 * once the timer is up.
 */

import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { PUZZLE } from '@/config/session';
import { PUZZLE_COPY } from '@/content/strings';
import { Spacing } from '@/constants/theme';
import { findGame } from '@/session/games/catalog';
import { GAME_VIEWS } from '@/session/games/views';
import { SessionScreen } from '@/session/ui/session-screen';
import { puzzleDurationMs, showsCalibration } from '@/session/routing';
import { useSessionFlow } from '@/session/session-context';
import { useSessionGuard } from '@/session/use-session-guard';

export default function GameScreen() {
  const router = useRouter();
  const active = useSessionGuard();
  const { categoryGroup, game } = useSessionFlow();

  const [timeUp, setTimeUp] = useState(false);
  /** Bumped by "keep going", which is what restarts the timer below. */
  const [extensions, setExtensions] = useState(0);

  const group = categoryGroup ?? 'world';
  const durationMs = extensions === 0 ? puzzleDurationMs(group) : PUZZLE.keepGoingMs;

  const chosen = game ? findGame(game) : undefined;
  const GameView = game ? GAME_VIEWS[game] : undefined;

  useEffect(() => {
    const timeout = setTimeout(() => setTimeUp(true), durationMs);
    return () => clearTimeout(timeout);
  }, [durationMs, extensions]);

  /**
   * Landing here with nothing picked means a reload or a deep link — the only
   * way in is a tap on the picker. Back to the picker rather than to the start
   * of the session: the answers already given are still good.
   */
  useEffect(() => {
    if (active && !GameView) router.replace('/games');
  }, [active, GameView, router]);

  if (!active || !GameView) return null;

  const finish = () => {
    router.replace(showsCalibration(group) ? '/calibration' : '/mood-after');
  };

  return (
    <SessionScreen>
      <View style={styles.root}>
        <View style={styles.heading}>
          <ThemedText type="subtitle">{chosen?.title ?? PUZZLE_COPY.title}</ThemedText>
          <ThemedText themeColor="textSecondary">
            {group === 'witnessed'
              ? PUZZLE_COPY.witnessedFraming
              : PUZZLE_COPY.worldFraming}
          </ThemedText>
        </View>

        <GameView />

        <View style={styles.footer}>
          {timeUp ? (
            <>
              <ThemedText type="small" themeColor="textMuted" style={styles.prompt}>
                {PUZZLE_COPY.timeUpPrompt}
              </ThemedText>
              <View style={styles.choice}>
                <View style={styles.choiceItem}>
                  <Button
                    title={PUZZLE_COPY.keepGoing}
                    variant="secondary"
                    onPress={() => {
                      setTimeUp(false);
                      setExtensions((count) => count + 1);
                    }}
                  />
                </View>
                <View style={styles.choiceItem}>
                  <Button title={PUZZLE_COPY.done} onPress={finish} />
                </View>
              </View>
            </>
          ) : (
            <Button title={PUZZLE_COPY.done} variant="ghost" onPress={finish} />
          )}
        </View>
      </View>
    </SessionScreen>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  heading: {
    alignSelf: 'stretch',
    gap: Spacing.one,
  },
  footer: {
    alignSelf: 'stretch',
    gap: Spacing.two,
  },
  prompt: {
    textAlign: 'center',
  },
  choice: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  choiceItem: {
    flex: 1,
  },
});
