/**
 * What one routine is, what is known about it, and a Begin button.
 *
 * The same job `somatic-intro.tsx` and `breath-intro.tsx` do, with one section
 * neither of them has: the running order, as a plain list of body parts.
 *
 * That list is not decoration and it is not a summary of the steps. It is the
 * answer to the question the cautions raise two screens earlier — skip anything
 * injured — because somebody who cannot tense a shoulder needs to know a
 * shoulder is coming *before* they commit three minutes, not when the screen
 * says to squeeze it. It is also the only honest way to show what separates the
 * four-group routine from the seven-group one, which is otherwise a number.
 *
 * `notice` sits closest to the button of the prose blocks, so it is the line
 * still in mind when the first instruction lands — same placement and same
 * argument as the other two intros. `evidence` sits last and muted: worth
 * having, and nobody has to read it to do the exercise.
 *
 * Nothing starts on arrival.
 */

import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { GROUNDING_FADE } from '@/config/session';
import { describeRoutine, type PmrRoutine } from '@/content/pmr';
import { PMR_COPY } from '@/content/strings';
import { Spacing } from '@/constants/theme';

interface PmrIntroProps {
  routine: PmrRoutine;
  onBegin: () => void;
  /** Back to the four. On the screen as well as on the back button, because
      this is where someone finds out a routine wants a part of them that hurts. */
  onAnother: () => void;
}

export function PmrIntro({ routine, onBegin, onAnother }: PmrIntroProps) {
  return (
    <Animated.View entering={FadeIn.duration(GROUNDING_FADE.inMs)} style={styles.root}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        <View style={styles.heading}>
          <ThemedText type="title">{routine.title}</ThemedText>
          <ThemedText type="eyebrow" themeColor="textMuted">
            {routine.count}
          </ThemedText>
          <ThemedText type="small" themeColor="textMuted">
            {describeRoutine(routine)}
          </ThemedText>
        </View>

        <View style={styles.section}>
          <ThemedText type="sectionTitle">{PMR_COPY.howHeading}</ThemedText>
          {routine.steps.map((step) => (
            <ThemedText key={step} type="small" themeColor="textSecondary">
              {step}
            </ThemedText>
          ))}
        </View>

        <View style={styles.section}>
          <ThemedText type="sectionTitle">{PMR_COPY.orderHeading}</ThemedText>
          {/* One line rather than a bulleted list. It is a running order, not
              instructions — the instructions arrive one at a time on the screen
              after this — and four to seven short phrases read faster as a
              sentence than as a column of stubs. */}
          <ThemedText type="small" themeColor="textSecondary">
            {routine.groups.map((group) => group.name).join(' · ')}
          </ThemedText>
        </View>

        <View style={styles.section}>
          <ThemedText type="sectionTitle">{PMR_COPY.noticeHeading}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {routine.notice}
          </ThemedText>
        </View>

        <View style={styles.section}>
          <ThemedText type="sectionTitle">{PMR_COPY.evidenceHeading}</ThemedText>
          <ThemedText type="small" themeColor="textMuted">
            {routine.evidence}
          </ThemedText>
        </View>

        <View style={styles.actions}>
          <Button title={PMR_COPY.begin} onPress={onBegin} />
          <ThemedText type="small" themeColor="textMuted" style={styles.hint}>
            {PMR_COPY.introHint}
          </ThemedText>
          <Button title={PMR_COPY.another} variant="ghost" onPress={onAnother} />
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
    paddingBottom: Spacing.four,
  },
  heading: {
    gap: Spacing.two,
  },
  section: {
    gap: Spacing.three,
  },
  actions: {
    gap: Spacing.three,
    marginTop: Spacing.two,
  },
  hint: {
    textAlign: 'center',
  },
});
