/**
 * What one pattern is, what is known about it, and a Begin button.
 *
 * The same job `breathe-intro.tsx` does for the opening sigh, with one section
 * that screen does not have. Three things sit ahead of the button and each is
 * here for its own reason:
 *
 *  - The count and the length, in the eyebrow slot, before anything else. "4
 *    in, 6 out" is the pattern's actual name and `describeRun` is the size of
 *    the commitment — both are facts somebody may want without reading a word
 *    of the rest.
 *  - `How`, which is short, because the circle carries the timing. What is left
 *    to say is where the air goes and how much of it there should be.
 *  - `What's actually known`, which is the section this app owes the reader and
 *    which most breathing screens skip. Two of these four patterns are far more
 *    famous than the evidence supports, and the honest version of that says so
 *    on the screen where somebody is deciding whether to spend a minute on one.
 *    See the note on `evidence` in `@/content/breathwork`.
 *
 * `notice` sits between them, closest to the button of the three prose blocks,
 * so it is the line still in mind when the circle starts — same placement and
 * same argument as `somatic-intro.tsx`.
 *
 * Nothing starts on arrival.
 */

import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { GROUNDING_FADE } from '@/config/session';
import { describeRun, type BreathPattern } from '@/content/breathwork';
import { BREATHWORK_COPY } from '@/content/strings';
import { Spacing } from '@/constants/theme';

interface BreathIntroProps {
  pattern: BreathPattern;
  onBegin: () => void;
  /** Back to the four. On the screen as well as on the back button, because
      this is where someone finds out a pattern holds for seven seconds. */
  onAnother: () => void;
}

export function BreathIntro({ pattern, onBegin, onAnother }: BreathIntroProps) {
  return (
    <Animated.View entering={FadeIn.duration(GROUNDING_FADE.inMs)} style={styles.root}>
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
          <ThemedText type="title">{pattern.title}</ThemedText>
          {/* The count first and the length after it, separated rather than
              run together: they answer two different questions and the eyebrow
              is read at a glance. */}
          <ThemedText type="eyebrow" themeColor="textMuted">
            {pattern.count}
          </ThemedText>
          <ThemedText type="small" themeColor="textMuted">
            {describeRun(pattern)}
          </ThemedText>
        </View>

        <View style={styles.section}>
          <ThemedText type="subtitle">{BREATHWORK_COPY.howHeading}</ThemedText>
          {pattern.steps.map((step) => (
            <ThemedText key={step} type="small" themeColor="textSecondary">
              {step}
            </ThemedText>
          ))}
        </View>

        <View style={styles.section}>
          <ThemedText type="subtitle">{BREATHWORK_COPY.noticeHeading}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {pattern.notice}
          </ThemedText>
        </View>

        {/* Muted rather than secondary, and last of the three: it is the part
            worth having and the part nobody has to read to do the exercise. */}
        <View style={styles.section}>
          <ThemedText type="subtitle">{BREATHWORK_COPY.evidenceHeading}</ThemedText>
          <ThemedText type="small" themeColor="textMuted">
            {pattern.evidence}
          </ThemedText>
        </View>

        <View style={styles.actions}>
          <Button title={BREATHWORK_COPY.begin} onPress={onBegin} />
          <ThemedText type="small" themeColor="textMuted" style={styles.hint}>
            {BREATHWORK_COPY.introHint}
          </ThemedText>
          <Button title={BREATHWORK_COPY.another} variant="ghost" onPress={onAnother} />
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
