import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useEffect, useState } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { formatMetricValue } from '@/api/humanity';
import { fetchReactionTally, retractReaction, submitReaction } from '@/api/reactions';
import { NewDataBadge } from '@/components/new-data-badge';
import { Sparkline } from '@/components/sparkline';
import { DaysPill } from '@/components/days-pill';
import { ThemedText } from '@/components/themed-text';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { categoryLabel } from '@/constants/world-metrics';
import { useTheme } from '@/hooks/use-theme';
import { markMetricSeen } from '@/lib/fresh-data';
import { queryKeys } from '@/lib/query';
import {
  EMPTY_COUNTS,
  reactionPercents,
  readersLabel,
  totalVotes,
  type ReactionCounts,
} from '@/lib/reaction-tally';
import { useSession } from '@/lib/session';
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
  // `total` rather than `streak`: days ever, not days in a row. See `DaysPill`
  // for why the consecutive count stopped being the thing on screen.
  const { total, reaction, react, unreact } = useDailyStreak(card.date);
  const { session } = useSession();
  const queryClient = useQueryClient();
  const userId = session?.user.id;

  /** True only between taking a vote back and casting the next one. */
  const [withdrew, setWithdrew] = useState(false);

  /**
   * The shared tally, fetched only once the reader has answered.
   *
   * `enabled` on their own reaction rather than on the card being visible: the
   * numbers are not shown until they have voted, so fetching earlier would be a
   * request for something nobody is going to see — on every launch, for every
   * reader, forever.
   */
  const { data: tally = EMPTY_COUNTS } = useQuery({
    queryKey: queryKeys.reactionTally(card.date, card.metric.id),
    queryFn: () => fetchReactionTally(card.date, card.metric.id),
    enabled: !!reaction,
    // Everyone else's answers arrive while this reader is looking at it, and a
    // tally that never moves defeats the "other people are here" point.
    staleTime: 60_000,
  });

  /**
   * Records the reaction locally first, then shares it.
   *
   * The local write is what lights the button, and it must not wait on a
   * network round trip or depend on one succeeding. A failed upload costs the
   * reader the tally, never their own answer — which is why this swallows the
   * error rather than surfacing it.
   */
  function onReact(next: ReactionId): void {
    // Tapping the answer you already gave takes it back. Being locked into the
    // first button you touched is what makes a reaction feel like a submitted
    // form rather than a thing you said.
    const isRetracting = reaction === next;

    // Set from the press rather than inferred from a state change, so the label
    // knows whether it is arriving because a vote was withdrawn (drop in from
    // above) or simply because the card mounted (no animation at all).
    setWithdrew(isRetracting);

    if (isRetracting) unreact();
    else react(next);

    if (!userId) return;

    const written = isRetracting
      ? retractReaction(userId, card.date)
      : submitReaction(userId, card.date, card.metric.id, next);

    void written
      .then(() =>
        queryClient.invalidateQueries({
          queryKey: queryKeys.reactionTally(card.date, card.metric.id),
        }),
      )
      .catch(() => {});
  }

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
        {/* The header label is the *accessible* way in to the share sheet. The
            card below is tappable too, but that tap target is deliberately
            invisible to screen readers — see the comment on it — so this is the
            affordance VoiceOver actually reaches. Only the label and its
            chevron are pressable, not the whole row: the streak pill sits in
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

        <DaysPill total={total} />
      </View>

      {/**
       * The whole card opens the share sheet.
       *
       * The chevron in the header was the only way in, which put the app's most
       * shareable object behind the smallest target on the screen. A card that
       * looks like a card should behave like one.
       *
       * The controls inside keep working untouched, and not by exception: React
       * Native hands a touch to the innermost view that claims it, so the
       * reaction bubbles and the source link become the responder for taps that
       * land on them and this handler never fires. Everything else — the
       * headline, the figures, the sparkline, the padding between them — falls
       * through to here.
       *
       * `accessible={false}` matters. A Pressable defaults to collapsing its
       * subtree into one element on iOS, which would take the reaction buttons
       * and the source link away from VoiceOver entirely. Leaving this node
       * invisible to the accessibility tree keeps those children individually
       * focusable; the labelled button in the header above is the equivalent
       * affordance, so nothing is lost by not exposing this one.
       */}
      <Pressable accessible={false} onPress={() => router.push('/card')}>
        <Animated.View
          // Keyed on the card so a day rollover animates in as a new card rather
          // than mutating the old one's text in place.
          key={card.key}
          entering={FadeIn.duration(280)}
          style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.categoryRow}>
            <ThemedText
              type="eyebrow"
              themeColor="textMuted"
              numberOfLines={1}
              style={styles.category}>
              {categoryLabel(card.metric.category)}
            </ThemedText>
            {isNew ? <NewDataBadge variant="dot" /> : null}
          </View>

          <ThemedText type="sectionTitle">{card.headline}</ThemedText>

          {/* Figures and chart stack, they don't share a row. Side by side, a
              pair like "428 /100k → 206 /100k" takes most of the width and
              leaves the sparkline a sliver — the same reason `MetricChartCard`
              puts its value on its own line and gives the chart the full card. */}
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

          {/* The percentages live inside the buttons themselves once there are
              enough of them — see `Reactions`. What is left down here is the
              small-sample case, where a percentage would be a fiction and the
              honest thing to report is how many people have answered. */}
          <Reactions
            selected={reaction}
            onSelect={onReact}
            counts={tally}
            withdrew={withdrew}
          />

          {/* The denominator. Without it an unfiltered percentage claims a
              consensus it may not have — "100%" over "Just you so far today"
              reads as what it actually is. */}
          {reaction && totalVotes(tally) > 0 ? (
            <Animated.View entering={FadeIn.duration(320).delay(160)}>
              <ThemedText type="small" themeColor="textMuted" style={styles.company}>
                {readersLabel(totalVotes(tally))}
              </ThemedText>
            </Animated.View>
          ) : null}

          {/* Claims its own taps, so it opens the source rather than the share
              sheet. That is the one thing on the card that has somewhere else
              to go. */}
          <Pressable
            accessibilityRole="link"
            accessibilityLabel={`Open source: ${card.metric.sourceName}`}
            onPress={() => void Linking.openURL(card.metric.sourceUrl)}
            hitSlop={6}
            style={styles.sourceLink}>
            <ThemedText type="linkPrimary">{card.metric.sourceName} →</ThemedText>
          </Pressable>
        </Animated.View>
      </Pressable>
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
  counts,
  withdrew,
}: {
  selected: ReactionId | null;
  onSelect: (reaction: ReactionId) => void;
  counts: ReactionCounts;
  withdrew: boolean;
}) {
  /**
   * Whether the buttons turn into results.
   *
   * Two conditions. Not before voting — the split would become an anchor to
   * agree with rather than a question to answer. And not before the tally has
   * arrived, so a slow network shows the labels rather than a confident 0%.
   *
   * There is deliberately no minimum sample. See `reaction-tally.ts`: the
   * denominator printed underneath is what keeps a small one honest.
   */
  const showPercent = selected !== null && totalVotes(counts) > 0;
  const percents = reactionPercents(counts);

  return (
    <View style={styles.reactions}>
      {REACTIONS.map(({ id, label }) => (
        <ReactionButton
          key={id}
          label={label}
          percent={percents[id]}
          showPercent={showPercent}
          isSelected={selected === id}
          withdrew={withdrew}
          onPress={() => onSelect(id)}
        />
      ))}
    </View>
  );
}

/**
 * How far outside the bubble the arriving text starts, in points.
 *
 * Further than the pill is tall, and the pill clips its overflow — so the text
 * genuinely emerges from beyond the edge rather than fading in slightly off
 * centre.
 */
const TRAVEL = 34;

const ARRIVAL = { duration: 460, easing: Easing.out(Easing.cubic) } as const;

/**
 * The percentage rising into the middle of the bubble, after a vote.
 *
 * Written out rather than taken from reanimated's presets so the distance and
 * the timing are both explicit. Opacity finishes well before the travel does:
 * arriving at full strength while still moving is what makes it read as
 * something rising into place instead of something being faded in.
 */
function riseIntoPlace() {
  'worklet';
  return {
    initialValues: { opacity: 0, transform: [{ translateY: TRAVEL }] },
    animations: {
      opacity: withTiming(1, { duration: 220 }),
      transform: [{ translateY: withTiming(0, ARRIVAL) }],
    },
  };
}

/**
 * The label dropping back in from the top, after a vote is taken back.
 *
 * The mirror of `riseIntoPlace`, and the direction carries meaning: the number
 * came up from below when the answer went in, so the label coming down from
 * above reads as the same movement reversed rather than as a second, unrelated
 * one.
 */
function dropIntoPlace() {
  'worklet';
  return {
    initialValues: { opacity: 0, transform: [{ translateY: -TRAVEL }] },
    animations: {
      opacity: withTiming(1, { duration: 220 }),
      transform: [{ translateY: withTiming(0, ARRIVAL) }],
    },
  };
}

/**
 * One bubble. Its own component because the proportional fill animates from a
 * shared value, and hooks cannot be called from inside the `map` above.
 */
function ReactionButton({
  label,
  percent,
  showPercent,
  isSelected,
  withdrew,
  onPress,
}: {
  label: string;
  percent: number;
  showPercent: boolean;
  isSelected: boolean;
  /**
   * Whether the label is arriving because a vote was just taken back, as
   * opposed to simply being here because the card mounted.
   *
   * Comes down from the parent rather than being remembered here, because the
   * only place that genuinely knows is the press handler that did the
   * retracting. Deriving it locally would mean either reading a ref during
   * render or setting state from an effect — both of which React's lint rules
   * reject, and both for good reasons.
   */
  withdrew: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  const fill = useSharedValue(0);

  useEffect(() => {
    // Grows out of the left edge rather than appearing at width, and drains back
    // rather than vanishing. Slower than the text's own travel so the bar is
    // still settling as the figure lands, which reads as one movement.
    fill.value = withTiming(showPercent ? percent / 100 : 0, {
      duration: 620,
      easing: Easing.out(Easing.cubic),
    });
  }, [showPercent, percent, fill]);

  const fillStyle = useAnimatedStyle(() => ({ width: `${fill.value * 100}%` }));

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: isSelected }}
      // The visible text stops being the label once results are in, so the
      // spoken version has to carry both — otherwise a screen reader is left
      // announcing two bare numbers.
      accessibilityLabel={
        showPercent ? `${label}: ${percent} percent${isSelected ? ', your answer' : ''}` : label
      }
      accessibilityHint={isSelected ? 'Tap again to take your answer back' : undefined}
      onPress={onPress}
      style={({ pressed }) => [
        styles.reaction,
        {
          backgroundColor: isSelected ? theme.brandSoft : theme.backgroundElement,
          borderColor: isSelected ? theme.brandStrong : 'transparent',
        },
        pressed && styles.pressed,
      ]}>
      {/* Behind the text rather than beside it: the bubble is already the right
          shape for a bar, so the split is legible before either number is read
          and no separate chart is needed underneath. Always mounted so the width
          has something to animate back to when a vote is withdrawn. */}
      <Animated.View
        style={[
          styles.reactionFill,
          fillStyle,
          {
            backgroundColor: isSelected ? theme.brand : theme.backgroundSelected,
            opacity: isSelected ? 0.35 : 1,
          },
        ]}
      />

      {/* One line either way, at one size, so the pill's height never changes
          between states — the row of buttons stays exactly the size it is
          before anybody votes. */}
      {showPercent ? (
        <Animated.View entering={riseIntoPlace}>
          <ThemedText
            type="small"
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.85}
            style={[styles.reactionLabel, isSelected && { color: theme.brandStrong }]}>
            {percent}%
          </ThemedText>
        </Animated.View>
      ) : (
        <Animated.View entering={withdrew ? dropIntoPlace : undefined}>
          <ThemedText
            type="small"
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.85}
            style={[styles.reactionLabel, isSelected && { color: theme.brandStrong }]}>
            {label}
          </ThemedText>
        </Animated.View>
      )}
    </Pressable>
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
    fontSize: 15,
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
    fontSize: 18,
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
    // Clips the proportional fill to the pill's own curve, and establishes the
    // stacking context the absolutely-positioned fill sits in.
    overflow: 'hidden',
  },
  // Pinned left and stretched vertically; only the width carries the number.
  reactionFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
  },
  // Shared by the label and the percentage that replaces it, so the pill keeps
  // exactly the height it had before anybody voted.
  reactionLabel: {
    fontSize: 19,
  },
  company: {
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.75,
  },
  // Bottom-right, matching the Progress cards.
  sourceLink: {
    alignSelf: 'flex-end',
  },
});
