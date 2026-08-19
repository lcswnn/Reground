/**
 * Screen 2b — which thing. GROUP A only.
 *
 * The screen before this establishes that it is the world rather than an image,
 * which is what the whole session branches on. This one establishes *which*
 * part of the world, which nothing branches on at all — it selects the data the
 * calibration screen pulls and does nothing else. Keeping those two questions
 * on separate screens is what stops the flow's shape from depending on a topic
 * list that will keep changing.
 *
 * Like the screen before it, tapping an answer advances immediately — the back
 * button undoes a mis-tap, and from the rating screen it returns here rather
 * than to the first question when there is a topic to change.
 *
 * ## It also starts the one network call the app makes
 *
 * Reaching this screen is the earliest moment the app knows the session will
 * end up at `/calibration`, which is the only screen that wants data. That is
 * five minutes and five screens away — a breath, a reactivation cue and a game —
 * so the fetch is kicked off here and has all of that to land in. See
 * `prefetchHumanity`; nothing on this screen waits on it or renders it, and a
 * failure is invisible until the screen that would have used it.
 */

import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { Redirect, useRouter } from 'expo-router';

import { prefetchHumanity } from '@/api/use-humanity';
import { ThemedText } from '@/components/themed-text';
import { TOPIC } from '@/content/strings';
import { WORLD_TOPICS, type WorldTopic } from '@/content/topics';
import { Spacing } from '@/constants/theme';
import { OptionCard } from '@/session/ui/option-card';
import { SessionScreen } from '@/session/ui/session-screen';
import { needsTopic } from '@/session/routing';
import { useSessionBack } from '@/session/use-session-back';
import { useSessionFlow } from '@/session/session-context';
import { useSessionGuard } from '@/session/use-session-guard';

export default function TopicScreen() {
  const router = useRouter();
  // The rating is collected after this screen, so there is none to require yet.
  const active = useSessionGuard({ requireMood: false });
  const { categoryGroup, chooseTopic } = useSessionFlow();
  const back = useSessionBack('/topic');

  // On mount rather than on the tap: every topic but one pulls charts, so there
  // is nothing to gain by waiting to find out which, and the tap is the moment
  // the user is already moving. Idempotent — a mis-tap and a return here does
  // not start a second fetch.
  useEffect(() => prefetchHumanity(), []);

  if (!active || !categoryGroup) return null;

  // Reachable only by deep link or a stale route; `category.tsx` sends GROUP B
  // straight to the rating.
  if (!needsTopic(categoryGroup)) return <Redirect href="/mood" />;

  const choose = (topic: WorldTopic) => {
    chooseTopic(topic);
    router.replace('/mood');
  };

  return (
    <SessionScreen centered onBack={back}>
      <View style={styles.root}>
        <ThemedText type="title">{TOPIC.title}</ThemedText>

        <View style={styles.options}>
          {WORLD_TOPICS.map((topic) => (
            <OptionCard
              key={topic.id}
              compact
              label={topic.label}
              detail={topic.detail}
              onPress={() => choose(topic)}
            />
          ))}
        </View>
      </View>
    </SessionScreen>
  );
}

// Tighter than the entry screen throughout: six options and a heading is close
// to a full phone even at the compact size, and the space between them is what
// there is to give.
const styles = StyleSheet.create({
  root: {
    gap: Spacing.four,
  },
  options: {
    gap: Spacing.three,
  },
});
