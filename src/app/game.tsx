/**
 * Screen 5 — the game itself, whichever one was picked.
 *
 * The screen is the frame, not the game: it owns the framing copy, the dose
 * timer and the way out, and renders whatever `/games` chose inside that. Every
 * game on a shelf is interchangeable from here, which is the point — nothing
 * about the timing or the copy depends on which of them is running.
 *
 * What it does depend on is which shelf. For the visuospatial games the
 * mechanism is "occupy visual working memory", it is the point of the whole
 * session, it runs longer, and the copy says what it is for. The calm games
 * claim nothing and run the standard dose, and the line above them says only
 * that there is no way to lose.
 *
 * That is keyed to `gameKind`, not to the group. The two used to be the same
 * split and are not any more — the personal/other answer sits in the same group
 * as "Something I saw" and gets the calm shelf. Neither is ever keyed to the
 * specific category.
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
import { puzzleDurationMs, routeAfterGame } from '@/session/routing';
import { useSessionBack } from '@/session/use-session-back';
import { useSessionFlow } from '@/session/session-context';
import { useSessionGuard } from '@/session/use-session-guard';

export default function GameScreen() {
  const router = useRouter();
  const active = useSessionGuard();
  const { categoryGroup, gameKind, game } = useSessionFlow();
  const back = useSessionBack('/game');

  const [timeUp, setTimeUp] = useState(false);
  /** Bumped by "keep going", which is what restarts the timer below. */
  const [extensions, setExtensions] = useState(0);

  const group = categoryGroup ?? 'world';
  /** Matches the picker's fallback: an unknown session gets the calm shelf. */
  const kind = gameKind ?? 'calm';
  const durationMs = extensions === 0 ? puzzleDurationMs(kind) : PUZZLE.keepGoingMs;

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
    router.replace(routeAfterGame(group));
  };

  return (
    <SessionScreen onBack={back}>
      <View style={styles.root}>
        <View style={styles.heading}>
          <ThemedText type="subtitle">{chosen?.title ?? PUZZLE_COPY.title}</ThemedText>
          <ThemedText themeColor="textSecondary">
            {kind === 'visuospatial'
              ? PUZZLE_COPY.visuospatialFraming
              : PUZZLE_COPY.calmFraming}
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
                    stretch
                    onPress={() => {
                      setTimeUp(false);
                      setExtensions((count) => count + 1);
                    }}
                  />
                </View>
                <View style={styles.choiceItem}>
                  <Button title={PUZZLE_COPY.done} stretch onPress={finish} />
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
    gap: Spacing.four,
  },
  heading: {
    alignSelf: 'stretch',
    gap: Spacing.two,
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
