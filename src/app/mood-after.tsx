/**
 * Screen 7 — the second rating, and now the same screen as the first one.
 *
 * It used to be the last branch in the session as well: an improved rating went
 * straight to the door and everything else was routed into an aftercare step.
 * It no longer routes anywhere but `/one-more`, which everyone now sees.
 *
 * ## It no longer says anything back
 *
 * For a while it did. A reply appeared under the scale as soon as a number was
 * tapped — "Good. That was the point." for a drop of at least
 * `MEANINGFUL_MOOD_DROP`, a plainer line for no drop — and a bordered card
 * under that pointed anybody still at or above `HIGH_DISTRESS_MOOD` at real
 * support. Both sat in a fixed 120-point slot, so that choosing a number did
 * not shove the scale up the screen under the user's thumb.
 *
 * All of it is gone, and what is left is `mood.tsx` with a different question
 * on it: a title, the scale, and Next. The slot was the expensive part — it was
 * held open whether or not there was anything to put in it, so the screen was
 * built around a reply that most of the time had not arrived yet, and the
 * button sat a block and a half below the scale on a screen whose whole content
 * is one tap and a confirmation. Two screens that ask the same question in the
 * same words should also look the same; this one had grown a second half that
 * the first one never had.
 *
 * `moodOutcome` in `session/routing.ts` still exists and is still tested. It is
 * the rule about what a rating *means*, which is worth keeping written down —
 * nothing on screen reads it any more.
 *
 * The support pointer is still in the app on `check-in.tsx`, which is the other
 * screen that ever showed it. That screen is only reached by someone who picked
 * grounding off the list of last things, so a session that ends any other way
 * no longer passes a pointer to support at all. `SUPPORT_RESOURCE` is where the
 * copy lives if it should go back somewhere.
 */

import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { MOOD_AFTER } from '@/content/strings';
import { Spacing } from '@/constants/theme';
import { MoodScale } from '@/session/ui/mood-scale';
import { SessionScreen } from '@/session/ui/session-screen';
import { SupportAccess } from '@/session/ui/support-access';
import { useSessionBack } from '@/session/use-session-back';
import { useSessionFlow } from '@/session/session-context';
import { useSessionGuard } from '@/session/use-session-guard';

export default function MoodAfterScreen() {
  const router = useRouter();
  const active = useSessionGuard();
  // `moodBefore` is still required to be here: it is what this rating is
  // measured against, and a session missing it has not been through the screen
  // that sets it. Nothing on this screen compares the two any more — the
  // pairing is read later, off the session state.
  const { moodBefore, setMoodAfter } = useSessionFlow();
  const back = useSessionBack('/mood-after');

  const [mood, setMood] = useState<number | null>(null);

  if (!active || moodBefore === null) return null;

  const advance = () => {
    if (mood === null) return;
    setMoodAfter(mood);
    // One destination whatever the number did. Feeling better is not a reason
    // to be shown the door faster — the offer of one last thing is the same
    // offer either way, and it is refusable on its own screen.
    router.replace('/one-more');
  };

  return (
    <SessionScreen centered onBack={back}>
      <View style={styles.root}>
        <ThemedText type="title">{MOOD_AFTER.question}</ThemedText>

        <MoodScale
          value={mood}
          onChange={setMood}
          lowLabel={MOOD_AFTER.moodLowLabel}
          highLabel={MOOD_AFTER.moodHighLabel}
        />

        <Button title={MOOD_AFTER.continue} disabled={mood === null} onPress={advance} />

        {/* The same offer as on the first rating, in the same place. It matters
            more here: this screen is where a session that did not work says so,
            and the app has just watched a number fail to move. */}
        <SupportAccess />
      </View>
    </SessionScreen>
  );
}

const styles = StyleSheet.create({
  // The same one gap `mood.tsx` uses, which is the screen gap the rest of the
  // app uses: this is that screen asked a second time.
  root: {
    gap: Spacing.four,
  },
});
