/**
 * Screen 6 — calibration. GROUP A only.
 *
 * The honesty rule lives with the copy, in `@/content/calibration`, and is
 * worth restating here because this screen is where it would be easiest to
 * break: this is not a reassurance screen. It does not tell the user the world
 * is fine, and where a trend is going the wrong way it says so. The claim is
 * "here is where this actually stands", and it only works if the user could
 * check it and find it holds.
 *
 * ## The charts are the receipts, not the screen
 *
 * The three sections — what's going on, what's being done, what you can do — are
 * authored copy and render unconditionally. The charts under the first one come
 * off the network, and everything about how they are wired follows from one
 * rule: **a chart that doesn't arrive must not cost the user anything.** No
 * spinner blocking the copy, no error the reader has to dismiss, no layout that
 * collapses. They arrive and the claim above them is checkable, or they don't
 * and it's merely stated.
 *
 * That is also why the fetch is started back at `/topic` rather than here — see
 * `prefetchHumanity`. By the time anyone reaches this screen they have breathed
 * for a minute and played a puzzle for several, and the answer is sitting in
 * memory.
 */

import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Redirect, useRouter } from 'expo-router';

import { metricsFor } from '@/api/humanity';
import { useHumanity, type HumanityState } from '@/api/use-humanity';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { calibrationFor, type CalibrationEntry, type TrendDirection } from '@/content/calibration';
import { CALIBRATION_COPY } from '@/content/strings';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { MetricChart } from '@/session/ui/metric-chart';
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

  // Unconditional, and above every early return — this screen has four of them
  // and hooks cannot sit behind any of them. It costs nothing: the fetch was
  // started at the topic picker and this only subscribes to the result.
  const humanity = useHumanity();

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
        // No rubber-band and no stretch glow. This screen scrolls when its
        // content is taller than the screen and does not move at all when it
        // is not — a page that springs under a finger while having nowhere to
        // go reads as content hiding below the fold. See `breathe-intro.tsx`,
        // which went further and dropped its scroll view entirely.
        bounces={false}
        overScrollMode="never"
        showsVerticalScrollIndicator={false}>
        <ThemedText type="title">{CALIBRATION_COPY.title}</ThemedText>

        {/* What's going on. The charts belong to this section and nowhere
            else — they are evidence for this claim, and putting one under
            "what you can do" would turn an instruction into a statistic. */}
        <Section heading={CALIBRATION_COPY.trendHeading}>
          <TrendIndicator direction={entry.trend.direction} label={entry.trend.label} />
          <ThemedText themeColor="textSecondary">{entry.trend.body}</ThemedText>
          <Charts entry={entry} humanity={humanity} />
        </Section>

        {/* What's being done. */}
        <Section heading={CALIBRATION_COPY.responseHeading}>
          <ThemedText themeColor="textSecondary">{entry.response}</ThemedText>
        </Section>

        {/* What you can do. Last, deliberately — see the note in
            `@/content/calibration` on why the order is the point. */}
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

/**
 * The series behind this entry's trend, or one quiet line saying why there are
 * none.
 *
 * Four states, and the distinction between the last two is the one worth
 * keeping: "your phone couldn't reach it" and "we don't have this" are different
 * admissions, and collapsing them into one message makes the second sound like
 * the first, which is how a permanent gap gets read as a temporary glitch.
 */
function Charts({
  entry,
  humanity,
}: {
  entry: CalibrationEntry;
  humanity: HumanityState;
}) {
  // Nothing was ever going to be fetched for this topic, so the network's state
  // is beside the point. Checked first for that reason.
  if (entry.metricIds.length === 0) return <Note>{CALIBRATION_COPY.dataNone}</Note>;

  if (humanity.loading) return <Note>{CALIBRATION_COPY.dataLoading}</Note>;
  if (!humanity.artifact) return <Note>{CALIBRATION_COPY.dataUnavailable}</Note>;

  const metrics = metricsFor(humanity.artifact, entry.metricIds);

  // The artifact arrived but carries none of the ids this entry asked for —
  // every one of them retired or renamed in the data layer since this build
  // shipped. Rare, and it reads the same as having none to show.
  if (metrics.length === 0) return <Note>{CALIBRATION_COPY.dataNone}</Note>;

  return (
    <View style={styles.charts}>
      {metrics.map((metric) => (
        <MetricChart key={metric.id} metric={metric} />
      ))}
    </View>
  );
}

/** The one-liner that stands in for a chart. Quiet on purpose. */
function Note({ children }: { children: ReactNode }) {
  return (
    <ThemedText type="small" themeColor="textMuted">
      {children}
    </ThemedText>
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
    gap: Spacing.four,
    paddingBottom: Spacing.five,
  },
  section: {
    gap: Spacing.two,
  },
  // Wider than the gap inside a section: the charts are a list of their own
  // under the paragraph, not three more lines of it.
  charts: {
    gap: Spacing.three,
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
