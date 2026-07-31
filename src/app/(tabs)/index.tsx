import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedRef, useScrollViewOffset } from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { DailyCard } from '@/components/daily-card';
import { HumanityProgress } from '@/components/humanity-progress';
import { ReminderPrompt } from '@/components/reminder-prompt';
import { ScrollTopFade } from '@/components/scroll-top-fade';
import { SinceYouWereBorn } from '@/components/since-you-were-born';
import { ThemedText } from '@/components/themed-text';
import { ErrorState } from '@/components/ui/states';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { usePullToRefresh } from '@/hooks/use-pull-to-refresh';
import { useTheme } from '@/hooks/use-theme';
import { fetchHumanityArtifact } from '@/api/humanity';
import { fetchProfile } from '@/api/profile';
import { useAppReady } from '@/lib/app-ready';
import { selectDailyCard } from '@/lib/daily-card';
import { formatDay, todayISO } from '@/lib/format';
import { useFreshData } from '@/lib/fresh-data';
import { queryKeys } from '@/lib/query';
import { useSession } from '@/lib/session';

export default function TodayScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { session } = useSession();
  // This screen mounts under the splash now, so the bars would otherwise fill
  // while hidden and be sitting full by the time anyone sees them. The daily
  // card additionally uses it to decide the card has actually been *seen*,
  // which is what the streak counts.
  const isRevealed = useAppReady();

  // Drives the status-bar scrim: this page scrolls its own header up past the
  // clock, so the text needs something to pass behind.
  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  const scrollOffset = useScrollViewOffset(scrollRef);

  const insets = useSafeAreaInsets();
  // Same blue as the progress bars — it used to be a hardcoded pair of hexes
  // here, which is exactly how a palette drifts.
  const tint = theme.info;

  // The headline bar and today's card both come from this one file — it is
  // still the only thing this screen fetches.
  const humanityQuery = useQuery({
    queryKey: queryKeys.humanity,
    queryFn: fetchHumanityArtifact,
  });

  // Only the birthday is wanted, but the profile is already cached by Settings
  // under this key — a narrower query would just be a second row fetch.
  const userId = session?.user.id;
  const profileQuery = useQuery({
    queryKey: queryKeys.profile(userId ?? ''),
    queryFn: () => fetchProfile(userId as string),
    enabled: !!userId,
  });

  // Which metrics carry a measurement this device hasn't seen. Not "changed
  // since yesterday" — every nowcast is, daily, by construction.
  const fresh = useFreshData(humanityQuery.data);
  const freshMetricIds = fresh.ids;

  const birthDate = profileQuery.data?.birth_date ?? null;

  /**
   * Today's one card.
   *
   * Derived, not fetched and not stored: the same date and the same artifact
   * always produce the same card, so there is nothing to persist and no way for
   * a pull-to-refresh to reroll it into something else half-read.
   *
   * Waits on the profile rather than passing a null birthday through, because
   * `lifetime` is one of the six framings — computing the card before the
   * birthday lands would silently skip that angle and then swap the card out
   * underneath the reader when the query resolved.
   */
  const card =
    humanityQuery.data && !profileQuery.isPending
      ? selectDailyCard(humanityQuery.data.metrics, { date: todayISO(), birthDate })
      : null;

  const greeting = getGreeting();
  const firstName =
    (session?.user.user_metadata?.display_name as string | undefined)?.split(' ')[0] ?? 'friend';

  const { isRefreshing, onRefresh } = usePullToRefresh(humanityQuery.refetch);

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <Animated.ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            // Every other tab puts its scroller inside the SafeAreaView, so the
            // wheel lands below the clock on its own. This screen scrolls its
            // header up past the status bar, which means the scroll view starts
            // at y=0 and the wheel draws behind the notch — invisible. Push it
            // down by the inset it is missing.
            progressViewOffset={insets.top}
            // tintColor is the iOS wheel; colors/progressBackgroundColor are
            // the Android one. Setting only the first leaves Android with its
            // default blue on a warm background.
            tintColor={tint}
            colors={[tint]}
            progressBackgroundColor={theme.surface}
          />
        }>
        <SafeAreaView edges={['top']} style={styles.header}>
          <ThemedText type="eyebrow" themeColor="textSecondary">
            {formatDay(todayISO())}
          </ThemedText>
          <ThemedText
            type="title"
            style={styles.greeting}
            numberOfLines={1}
            // The streak sits on the card below rather than up here, so this line
            // has the full width — but a long name can still overrun, and it
            // should shrink rather than truncate somebody's name.
            adjustsFontSizeToFit
            minimumFontScale={0.75}>
            {greeting}, {firstName}.
          </ThemedText>
        </SafeAreaView>

        {/* Asks for notifications in the app's own words, before iOS asks in
            its. Renders nothing once the reader has answered either way — see
            `shouldOfferReminder`. Placed above the fold rather than buried,
            because a permission ask nobody sees is the same as not asking. */}
        <ReminderPrompt />

        {humanityQuery.data ? (
          <View style={styles.summarySection}>
            <HumanityProgress
              artifact={humanityQuery.data}
              active={isRevealed}
              previousScore={fresh.previousScore}
            />
          </View>
        ) : humanityQuery.error ? (
          <View style={styles.summarySection}>
            <ErrorState error={humanityQuery.error} onRetry={onRefresh} />
          </View>
        ) : null}

        {/* Under the composite bar: that number is the standing answer to "where
            do things stand", and this is the one thing worth knowing about it
            today. The thirteen-tile pager that used to sit here is gone — every
            one of those tiles lives on the Progress tab with its full history,
            where a reader who wants the grid can have a better version of it. */}
        {card ? (
          <DailyCard
            card={card}
            active={isRevealed}
            isNew={freshMetricIds.has(card.metric.id)}
          />
        ) : null}

        {/* The way back to the full set, now that Today doesn't carry it. One
            row rather than a section header: it is a signpost, not content.

            Navigated with `router.push` rather than wrapped in `<Link asChild>`.
            That is not a preference: `asChild` renders through Radix's `Slot`,
            which merges the `style` prop by spreading it — and spreading a
            *function* style, which is what a Pressable needs for its pressed
            state, yields `{}`. The child arrives with every style silently
            dropped, which is why this line was sitting unpadded against the left
            edge no matter what the stylesheet said. */}
        {humanityQuery.data ? (
          <Pressable
            accessibilityRole="link"
            accessibilityLabel={`See all ${humanityQuery.data.metrics.length} indicators`}
            onPress={() => router.push('/progress')}
            style={({ pressed }) => [styles.allMetrics, pressed && styles.pressed]}>
            <ThemedText type="linkPrimary">
              See all {humanityQuery.data.metrics.length} indicators →
            </ThemedText>
          </Pressable>
        ) : null}

        {/* Waits for the profile before rendering: a birthday that is merely
            still loading would otherwise show the "add your birthday" prompt
            for a moment to people who already have one. */}
        {humanityQuery.data && !profileQuery.isPending ? (
          <SinceYouWereBorn metrics={humanityQuery.data.metrics} birthDate={birthDate} />
        ) : null}
      </Animated.ScrollView>

      <ScrollTopFade offset={scrollOffset} />
    </View>
  );
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: {
    paddingBottom: BottomTabInset + Spacing.five,
  },
  header: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    gap: Spacing.one,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  greeting: {
    fontSize: 28,
    lineHeight: 36,
  },
  // Keeps the page gutter, so it lines up with the header and the card above.
  summarySection: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  /**
   * Centered rather than aligned to a gutter.
   *
   * Everything else on this screen is a card with an edge, and a bare text link
   * left-aligned against those edges reads as a stray line rather than as a
   * control — it has no container of its own to belong to. Centering is what
   * makes it legible as a signpost between two sections instead.
   */
  allMetrics: {
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    // A bare line of text is a small target; this brings it up to a comfortable
    // one without needing a box drawn around it.
    paddingBottom: Spacing.two,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
});
