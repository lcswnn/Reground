/**
 * What one movement is, how it is done, and a Begin button.
 *
 * The same job `grounding-intro.tsx` and `breathe-intro.tsx` do, with more on
 * it than either, because a somatic movement is the one exercise in this app
 * that cannot be worked out from watching the screen. The breath has a circle
 * to copy and the 5-4-3-2-1 is an instruction per prompt; this is a thing to do
 * with a body, and the body is not on screen.
 *
 * So the steps are here in full, ahead of the clock, and nothing starts on
 * arrival. Two things follow from that ordering and both are deliberate:
 *
 *  - The duration is stated *before* the button rather than discovered after
 *    it. Someone deciding whether to stand up in their kitchen and shake is
 *    owed the length of the commitment first, and it is interpolated from the
 *    movement rather than written into the copy — see `describeDuration`.
 *  - `notice` is given its own heading and sits last, closest to the button, so
 *    it is the line still in mind when the timer starts. It is not a tip. It is
 *    the difference between doing the movement and getting anything from it,
 *    which is the whole of what makes these somatic rather than stretches.
 *
 * The steps do not disappear when the clock starts — `somatic-timer.tsx` keeps
 * them underneath it. Nothing here has to be memorised, which is the other half
 * of why this screen can afford to be as long as it is.
 */

import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { GROUNDING_FADE } from '@/config/session';
import { describeDuration, type SomaticMovement } from '@/content/somatic';
import { SOMATIC_COPY } from '@/content/strings';
import { Spacing } from '@/constants/theme';
import { SomaticSteps } from '@/session/somatic/somatic-steps';

interface SomaticIntroProps {
  movement: SomaticMovement;
  onBegin: () => void;
  /** Back to the six. On the screen as well as on the back button, because
      this is where someone finds out a movement wants them standing up. */
  onAnother: () => void;
}

export function SomaticIntro({ movement, onBegin, onAnother }: SomaticIntroProps) {
  return (
    <Animated.View
      entering={FadeIn.duration(GROUNDING_FADE.inMs)}
      style={styles.root}>
      <ScrollView
        contentContainerStyle={styles.content}
        // No rubber-band and no stretch glow. This screen scrolls when its
        // content is taller than the screen and does not move at all when it
        // is not — a page that springs under a finger while having nowhere to
        // go reads as content hiding below the fold. See `breathe-intro.tsx`,
        // which went further and dropped its scroll view entirely.
        bounces={false}
        overScrollMode="never"
        showsVerticalScrollIndicator={false}>
        <View style={styles.heading}>
          <ThemedText type="title">{movement.title}</ThemedText>
          {/* The commitment, in the eyebrow slot: it is the one fact on this
              screen someone may want without reading anything else. */}
          <ThemedText type="eyebrow" themeColor="textMuted">
            {describeDuration(movement.seconds)}
          </ThemedText>
        </View>

        <View style={styles.section}>
          <ThemedText type="subtitle">{SOMATIC_COPY.howHeading}</ThemedText>
          <SomaticSteps steps={movement.steps} />
        </View>

        <View style={styles.section}>
          <ThemedText type="subtitle">{SOMATIC_COPY.noticeHeading}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {movement.notice}
          </ThemedText>
        </View>

        <View style={styles.actions}>
          <Button title={SOMATIC_COPY.begin} onPress={onBegin} />
          <ThemedText type="small" themeColor="textMuted" style={styles.hint}>
            {SOMATIC_COPY.introHint}
          </ThemedText>
          <Button title={SOMATIC_COPY.another} variant="ghost" onPress={onAnother} />
        </View>
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    gap: Spacing.four,
    paddingBottom: Spacing.five,
  },
  heading: {
    gap: Spacing.two,
  },
  section: {
    gap: Spacing.three,
  },
  actions: {
    gap: Spacing.three,
  },
  hint: {
    textAlign: 'center',
  },
});
