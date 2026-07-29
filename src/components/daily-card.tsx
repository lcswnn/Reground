import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useEffect } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { formatMetricValue } from '@/api/humanity';
import { NewDataBadge } from '@/components/new-data-badge';
import { Sparkline } from '@/components/sparkline';
import { StreakPill } from '@/components/streak-pill';
import { ThemedText } from '@/components/themed-text';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { categoryLabel } from '@/constants/world-metrics';
import { useTheme } from '@/hooks/use-theme';
import { markMetricSeen } from '@/lib/fresh-data';
import { REACTIONS, useDailyStreak, markCardSeen, type ReactionId } from '@/lib/streak';
import type { DailyCard as DailyCardData } from '@/lib/daily-card';

interface DailyCardProps {
  card: DailyCardData;
  /**
   * False while the splash is still up, same contract as every other animated
   * thing on Today. It also gates the streak: a card that filled its bars behind
   * a splash screen has not been seen by anybody.
   */
  active?: boolean;
  /** The source published a new measurement since this device last saw one. */
  isNew?: boolean;
}

/**
 * The day's one card.
 *
 * The rest of Today is a dashboard — thirteen numbers, a composite, a lifetime
 * view — and a dashboard is something you either read all of or none of. This is
 * the opposite shape on purpose: one indicator, one sentence, one number pair,
 * and a way to say something back. It is the part of the app that is worth a
 * notification, because it is the part that is finished in fifteen seconds.
 *
 * The framing comes from `@/lib/daily-card`, which derives it from the same
 * artifact everything else reads. Nothing here is authored, and nothing here is
 * fetched separately.
 */
export function DailyCard({ card, active = true, isNew = false }: DailyCardProps) {
  const theme = useTheme();
  const router = useRouter();
  const { streak, longest, reaction, react } = useDailyStreak(card.date);

  // Seeing the card is what counts, not reacting to it — see `recordSeen`. This
  // fires once per day in practice; the store is idempotent within a date, so
  // the many other times it runs cost nothing.
  useEffect(() => {
    if (active) markCardSeen(card.date);
  }, [active, card.date]);

  // The card is a full look at this metric's latest measurement, so it clears
  // the same badge the tiles and charts clear.
  useEffect(() => {
    if (active && isNew) markMetricSeen(card.metric);
  }, [active, isNew, card.metric]);

  // Null direction means the artifact predates the field, and neither green nor
  // red is honest there — the same rule the tiles and the lifetime rows follow.
  const accent =
    card.isProgress === null ? theme.info : card.isProgress ? theme.positive : theme.decline;

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        {/* The header is the way in to the share sheet. Only the label and its
            chevron are pressable, not the whole row — the streak pill sits in
            the same line and tapping a counter should not navigate. */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open today’s card to share it"
          onPress={() => router.push('/card')}
          hitSlop={8}
          style={({ pressed }) => [styles.sectionLabel, pressed && styles.pressed]}>
          <ThemedText type="eyebrow" themeColor="textMuted">
            Today&rsquo;s card
          </ThemedText>
          <SymbolView
            name="chevron.right"
            size={11}
            tintColor={theme.textMuted}
            fallback={<View />}
          />
        </Pressable>

        <StreakPill streak={streak} longest={longest} />
      </View>

      <Animated.View
        // Keyed on the card so a day rollover animates in as a new card rather
        // than mutating the old one's text in place.
        key={card.key}
        entering={FadeIn.duration(280)}
        style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <View style={styles.categoryRow}>
          <ThemedText type="eyebrow" themeColor="textMuted" numberOfLines={1} style={styles.category}>
            {categoryLabel(card.metric.category)}
          </ThemedText>
          {isNew ? <NewDataBadge variant="dot" /> : null}
        </View>

        <ThemedText type="sectionTitle">{card.headline}</ThemedText>

        {/* Figures and chart stack, they don't share a row. Side by side, a pair
            like "428 /100k → 206 /100k" takes most of the width and leaves the
            sparkline a sliver — the same reason `MetricChartCard` puts its value
            on its own line and gives the chart the full card. */}
        <View style={styles.pair}>
          {card.from ? (
            <>
              <Figure label={card.from.year} value={formatAt(card, card.from.value)} muted />
              <ThemedText type="subtitle" themeColor="textMuted" style={styles.arrow}>
                →
              </ThemedText>
            </>
          ) : null}

          <Figure
            label={card.to.year ?? 'today'}
            value={formatAt(card, card.to.value)}
            color={accent}
          />
        </View>

        <Sparkline values={card.spark} color={accent} height={56} active={active} />

        <ThemedText type="small" themeColor="textSecondary">
          {card.detail}
        </ThemedText>

        <Reactions selected={reaction} onSelect={react} />

        <Pressable
          accessibilityRole="link"
          accessibilityLabel={`Open source: ${card.metric.sourceName}`}
          onPress={() => void Linking.openURL(card.metric.sourceUrl)}
          hitSlop={6}
          style={styles.sourceLink}>
          <ThemedText type="linkPrimary">{card.metric.sourceName} →</ThemedText>
        </Pressable>
      </Animated.View>
    </View>
  );
}

function Figure({
  label,
  value,
  color,
  muted = false,
}: {
  label: string;
  value: string;
  color?: string;
  muted?: boolean;
}) {
  const theme = useTheme();

  return (
    <View style={styles.figure}>
      <ThemedText
        type="subtitle"
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.7}
        style={{ color: color ?? (muted ? theme.textSecondary : theme.text) }}>
        {value}
      </ThemedText>
      <ThemedText type="small" themeColor="textMuted" style={styles.figureLabel}>
        {label}
      </ThemedText>
    </View>
  );
}

/**
 * Two ways to say something back.
 *
 * The tap does not gate the streak — opening the app and reading the number is
 * what counts — so this is genuinely optional, which is also why it stays
 * available after being used. A reader who taps "gives me hope" and then decides
 * it was actually the other one can just tap the other one; freezing the choice
 * would be treating a feeling as a submitted form.
 */
function Reactions({
  selected,
  onSelect,
}: {
  selected: ReactionId | null;
  onSelect: (reaction: ReactionId) => void;
}) {
  const theme = useTheme();

  return (
    <View style={styles.reactions}>
      {REACTIONS.map(({ id, label }) => {
        const isSelected = selected === id;

        return (
          <Pressable
            key={id}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected }}
            onPress={() => onSelect(id)}
            style={({ pressed }) => [
              styles.reaction,
              {
                backgroundColor: isSelected ? theme.brandSoft : theme.backgroundElement,
                borderColor: isSelected ? theme.brandStrong : 'transparent',
              },
              pressed && styles.pressed,
            ]}>
            <ThemedText
              type="small"
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.85}
              style={[styles.reactionLabel, isSelected && { color: theme.brandStrong }]}>
              {label}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

/** The metric's own formatter, against a value other than the nowcast. */
function formatAt(card: DailyCardData, value: number): string {
  return formatMetricValue({ ...card.metric, currentValue: value });
}

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    gap: Spacing.two,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  sectionLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    flexShrink: 1,
  },
  card: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.three,
    gap: Spacing.three,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  category: {
    fontSize: 13,
    letterSpacing: 0.9,
    flexShrink: 1,
  },
  pair: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.two,
  },
  figure: {
    // Shares the row evenly with the other figure, so neither can push the pair
    // wider than the card — the values shrink to fit instead.
    flexShrink: 1,
    gap: Spacing.half,
  },
  figureLabel: {
    fontSize: 15,
  },
  arrow: {
    // Sits on the numbers' baseline rather than the labels'.
    paddingBottom: Spacing.four,
  },
  reactions: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  reaction: {
    flex: 1,
    borderRadius: Radius.pill,
    borderWidth: 1,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.two,
    alignItems: 'center',
  },
  reactionLabel: {
    fontSize: 16,
  },
  pressed: {
    opacity: 0.75,
  },
  // Bottom-right, matching the Progress cards.
  sourceLink: {
    alignSelf: 'flex-end',
  },
});
