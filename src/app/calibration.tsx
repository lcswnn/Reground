/**
 * Screen 6 — calibration. GROUP A only.
 *
 * The honesty rule lives with the copy, in `@/content/calibration`, and is
 * worth restating here because this screen is where it would be easiest to
 * break: this is not a reassurance screen. It does not tell the user the world
 * is fine, and where a trend is going the wrong way it says so. The claim is
 * "here is where this actually stands", and it only works if the user could
 * check it and find it holds.
 */

import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Redirect, useRouter } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { calibrationFor, type TrendDirection } from '@/content/calibration';
import { CALIBRATION_COPY } from '@/content/strings';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { SessionScreen } from '@/session/ui/session-screen';
import { showsCalibration } from '@/session/routing';
import { useSessionBack } from '@/session/use-session-back';
import { useSessionFlow } from '@/session/session-context';
import { useSessionGuard } from '@/session/use-session-guard';

/** Direction only. Whether it is good news is carried by the label beside it. */
const ARROWS: Record<TrendDirection, string> = {
  up: '↑',
  down: '↓',
  flat: '→',
};

export default function CalibrationScreen() {
  const router = useRouter();
  const active = useSessionGuard();
  const { category, categoryGroup, topic } = useSessionFlow();
  const back = useSessionBack('/calibration');

  if (!active || !category || !categoryGroup) return null;

  // Reachable only by deep link or a stale route; the puzzle screen already
  // routes GROUP B straight past this.
  if (!showsCalibration(categoryGroup)) return <Redirect href="/mood-after" />;

  // The topic is what selects the content. A GROUP A session with no topic
  // means the picker was never reached, which is a broken route rather than a
  // state to render a general answer for.
  const entry = calibrationFor(topic);
  if (!entry) return <Redirect href="/mood-after" />;

  return (
    <SessionScreen onBack={back}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        <ThemedText type="title">{CALIBRATION_COPY.title}</ThemedText>

        <Section heading={CALIBRATION_COPY.trendHeading}>
          <TrendIndicator direction={entry.trend.direction} label={entry.trend.label} />
          <ThemedText themeColor="textSecondary">{entry.trend.body}</ThemedText>
        </Section>

        <Section heading={CALIBRATION_COPY.responseHeading}>
          <ThemedText themeColor="textSecondary">{entry.response}</ThemedText>
        </Section>

        <Section heading={CALIBRATION_COPY.actionHeading}>
          <ThemedText themeColor="textSecondary">{entry.action}</ThemedText>
        </Section>
      </ScrollView>

      <Button
        title={CALIBRATION_COPY.continue}
        onPress={() => router.replace('/mood-after')}
      />
    </SessionScreen>
  );
}

function Section({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <ThemedText type="eyebrow" themeColor="textMuted">
        {heading}
      </ThemedText>
      {children}
    </View>
  );
}

function TrendIndicator({
  direction,
  label,
}: {
  direction: TrendDirection;
  label: string;
}) {
  const theme = useTheme();

  return (
    <View style={[styles.trend, { backgroundColor: theme.backgroundElement }]}>
      <ThemedText type="subtitle">{ARROWS[direction]}</ThemedText>
      <ThemedText type="defaultSemiBold" style={styles.trendLabel}>
        {label}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  // Keeps the Next button on the screen rather than below the copy.
  scroll: {
    flex: 1,
  },
  content: {
    gap: Spacing.five,
    paddingBottom: Spacing.five,
  },
  section: {
    gap: Spacing.two,
  },
  trend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radius.md,
  },
  trendLabel: {
    flex: 1,
  },
});
