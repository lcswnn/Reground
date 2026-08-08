/**
 * Screen 4 — pick the game.
 *
 * A menu, in an app that has otherwise gone out of its way not to hand anyone a
 * menu. It earns its place: the step it introduces is the longest in the
 * session by a distance, and five minutes of a game someone doesn't like is a
 * five-minute reason to close the app. Kept as small as a choice can be — one
 * tap, no confirm, no default to un-pick.
 *
 * Two shelves behind one screen. Which one is drawn comes from the answer given
 * on `/category`: only "Something I saw" gets the visuospatial games, because
 * only that answer describes a picture for them to compete with. The news and
 * the personal/other answer get the calm shelf — see `GameKind` in
 * `games/catalog.ts` for why that split does not follow the `CategoryGroup`.
 *
 * It is one route rather than two because the difference between the shelves is
 * the list and the line above it. Everything else — the cards, the paid
 * section, the way back — is the same screen doing the same job, and a second
 * copy of it would be a second place to fix anything wrong with the first.
 *
 * The paid list is below a rule and cannot be tapped. There is no purchase to
 * make yet (see `usePremiumAccess`), and this is not the screen to learn how to
 * upsell on: whoever is reading it has just told us how bad they feel and is
 * one screen from the thing that helps. The calm shelf has no paid entry at
 * all, so that whole section simply doesn't draw for it.
 */

import { ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { GAME_PICKER } from '@/content/strings';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { partitionGames, type Game } from '@/session/games/catalog';
import { usePremiumAccess } from '@/session/games/premium';
import { isPlayable } from '@/session/games/views';
import { GameCard } from '@/session/ui/game-card';
import { SessionScreen } from '@/session/ui/session-screen';
import { useSessionBack } from '@/session/use-session-back';
import { useSessionFlow } from '@/session/session-context';
import { useSessionGuard } from '@/session/use-session-guard';

export default function GamesScreen() {
  const router = useRouter();
  const theme = useTheme();
  const active = useSessionGuard();
  const { chooseGame, gameKind } = useSessionFlow();
  const back = useSessionBack('/games');

  const hasPremium = usePremiumAccess();
  /**
   * Which shelf, and the fallback for a reload that emptied the provider. The
   * visuospatial games are the ones with a claim attached, so an unknown
   * session gets the shelf that promises less.
   */
  const kind = gameKind ?? 'calm';
  const { unlocked, locked } = partitionGames(kind, hasPremium);

  if (!active) return null;

  const choose = (game: Game) => {
    chooseGame(game.id);
    router.replace('/game');
  };

  return (
    <SessionScreen onBack={back}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        <ThemedText type="subtitle">
          {kind === 'visuospatial'
            ? GAME_PICKER.visuospatialTitle
            : GAME_PICKER.calmTitle}
        </ThemedText>

        <View style={styles.list}>
          {unlocked.map((game) => (
            <GameCard
              key={game.id}
              title={game.title}
              blurb={game.blurb}
              // Unlocked but unbuilt is only reachable if a real entitlement
              // lands before the premium games do. Locked is the honest way to
              // draw that, rather than a card that opens an empty board.
              locked={!isPlayable(game.id)}
              onPress={() => choose(game)}
            />
          ))}
        </View>

        {locked.length > 0 ? (
          <View style={styles.paid}>
            <View style={[styles.rule, { backgroundColor: theme.border }]} />

            <View style={styles.paidHeading}>
              <ThemedText type="eyebrow" themeColor="textMuted">
                {GAME_PICKER.lockedHeading}
              </ThemedText>
              <ThemedText type="small" themeColor="textMuted">
                {GAME_PICKER.lockedNote}
              </ThemedText>
            </View>

            <View style={styles.list}>
              {locked.map((game) => (
                <GameCard key={game.id} title={game.title} blurb={game.blurb} locked />
              ))}
            </View>
          </View>
        ) : null}
      </ScrollView>
    </SessionScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: Spacing.five,
    paddingBottom: Spacing.four,
  },
  list: {
    gap: Spacing.three,
  },
  paid: {
    gap: Spacing.four,
  },
  rule: {
    height: StyleSheet.hairlineWidth * 2,
    alignSelf: 'stretch',
  },
  paidHeading: {
    gap: Spacing.one,
  },
});
