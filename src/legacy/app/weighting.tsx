import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { fetchHumanityArtifact } from '@/api/humanity';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { ErrorState, LoadingState } from '@/components/ui/states';
import { WeightSlider } from '@/components/weight-slider';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import {
  CATEGORY_BLURBS,
  categoryLabel,
  normalizeCategory,
  WORLD_CATEGORY_ORDER,
  type WorldCategory,
} from '@/constants/world-metrics';
import { useTheme } from '@/hooks/use-theme';
import { queryKeys } from '@/lib/query';
import { computeComposite, defaultWeightsFrom, toScorable } from '@/lib/scoring';
import { useWeightingDraft } from '@/state/weighting';

/**
 * "Weight what matters to you".
 *
 * Seven sliders, a live composite, and a way to clear it. The score at the top
 * recomputes on every drag through `computeComposite`, which is the same maths
 * the data layer used to produce the number in the artifact — see
 * `src/lib/scoring.ts` for why there are two implementations and what guards
 * them against drifting.
 *
 * ## There is no default score here either
 *
 * This screen used to show the research weighting's number beside the reader's,
 * with the gap between them in points. That framing was meant to stop the
 * sliders reading as "tune until you like the number", but it did it by making
 * the app's own weighting the baseline every answer was scored against — and
 * there is no correct weighting to be up or down against. Today makes no such
 * claim, and neither does this.
 *
 * What is left is one number, theirs, and it does not appear until they have
 * moved something. The opening slider positions still come from the data
 * layer's weights, because a slider has to start somewhere, but where it starts
 * is not an answer and is never scored as one — see `saveAndReturn`.
 */
export default function WeightingScreen() {
  const theme = useTheme();

  const { data, error, isPending, refetch } = useQuery({
    queryKey: queryKeys.humanity,
    queryFn: fetchHumanityArtifact,
  });

  // Normalised so an artifact still carrying pre-framework category ids groups
  // onto the current seven rather than rendering as an eighth unknown bucket.
  const metrics = useMemo(
    () =>
      data
        ? toScorable(data.metrics).map((metric) => ({
            ...metric,
            category: normalizeCategory(metric.category),
          }))
        : [],
    [data],
  );

  // Where the sliders open, derived from the artifact rather than hardcoded
  // here: the data layer owns those weights, and duplicating them in the UI is
  // how a clear ends up restoring last quarter's positions.
  const defaults = useMemo(() => defaultWeightsFrom(metrics), [metrics]);

  const { draft, setWeight, commit, reset, adoptDefaults, isDirty, isCustomised, hasSaved } =
    useWeightingDraft(defaults);

  /**
   * Whether there is an answer on screen worth scoring.
   *
   * Two ways to have one: the reader moved something, or they previously saved
   * a weighting — including by asking for the research one, which lands as a
   * saved weighting that happens to equal the opening positions. Without the
   * `hasSaved` half, someone who deliberately took the research weighting would
   * come back to this screen and be told to move a slider, as though they had
   * never answered.
   */
  const hasAnswer = isCustomised || hasSaved;

  /**
   * Save, then go to Today.
   *
   * Saving is the moment the score comes into existence, and the card on Today
   * is the only place it appears — leaving the reader on the sliders after they
   * commit means the payoff for answering the question happens on a screen they
   * are not looking at.
   *
   * ## Saving the starting position clears the weighting instead
   *
   * The sliders open somewhere, and where they open is not an answer — nobody
   * chose it. So committing a draft that still matches those positions would
   * manufacture a weighting out of the reader having touched nothing, and put a
   * number on Today that is the app's opinion wearing their name.
   *
   * `reset` rather than `commit` in that case, which is also what makes reset
   * followed by save land back on the opening prompt rather than on a score.
   * The consequence is deliberate: to get a number, you have to actually move
   * something.
   *
   * `dismissTo` rather than `back`, because this screen has two entry points:
   * the card itself and the Progress tab. Popping one screen would return
   * somebody who came from Progress to Progress, where there is no card to see.
   */
  const returnToToday = useCallback(() => {
    // `replace` covers the deep-link case, where this screen is the root and
    // there is nothing under it to dismiss to.
    // `/today`, not `/`: Today moved off the index route when the bar became
    // Breathe/Read/Play, and `/` is now the (empty) Breathe screen — which has
    // no card on it, so saving would land you somewhere the change isn't shown.
    if (router.canDismiss()) router.dismissTo('/today');
    else router.replace('/today');
  }, []);

  const saveAndReturn = useCallback(() => {
    if (hasAnswer) commit();
    else reset();
    returnToToday();
  }, [hasAnswer, commit, reset, returnToToday]);

  /**
   * "Use the research weighting", for a reader who would rather not decide.
   *
   * The opt-in half of the same principle. Not deciding is a legitimate
   * position, and this app's job is to stop *assuming* that position on
   * everybody's behalf, not to withhold it from someone who asks. Pressing this
   * is asking — which is exactly what the sliders sitting untouched is not.
   */
  const useResearchWeighting = useCallback(() => {
    adoptDefaults();
    returnToToday();
  }, [adoptDefaults, returnToToday]);

  const userResult = useMemo(() => computeComposite(metrics, draft), [metrics, draft]);

  const scoreByCategory = useMemo(
    () => new Map(userResult.categories.map((entry) => [entry.categoryId, entry])),
    [userResult],
  );

  if (isPending) return <LoadingState />;
  if (error) return <ErrorState error={error} onRetry={() => void refetch()} />;

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.intro}>
          <ThemedText type="small" themeColor="textMuted">
            There is no single right answer to how much each of these counts, so the app does
            not pick one for you. The starting position below comes from the OECD Better Life
            Index, the UN Sustainable Development Goals, Doughnut Economics and Bhutan&apos;s
            Gross National Happiness Index — a reference point, not a verdict. Move the sliders
            to score the world by what matters to you.
          </ThemedText>
        </View>

        {/**
         * One score, and it is the reader's.
         *
         * This used to show the research weighting's number beside theirs, with
         * the difference in points between them. The comparison was well meant —
         * it framed a drag as "here is the world if I care most about X" rather
         * than as a way to make the number go up — but it also made the app's
         * own weighting the thing every reader's answer was measured against,
         * which is the claim the whole feature is trying not to make. There is
         * no correct weighting to be up or down against.
         *
         * Nothing at all until they have moved something, for the same reason
         * Today shows no number until then: the opening slider positions are
         * where the sliders open, not an answer, and scoring them would put the
         * app's opinion on screen under the reader's name.
         */}
        <View style={[styles.scoreCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          {hasAnswer ? (
            <View style={styles.scoreCell}>
              <ThemedText type="small" themeColor="textMuted">
                Your score
              </ThemedText>
              <ThemedText type="title" style={{ color: theme.info }}>
                {(userResult.score * 100).toFixed(1)}%
              </ThemedText>
              <ThemedText type="small" themeColor="textMuted">
                across {metrics.length} indicators
              </ThemedText>
            </View>
          ) : (
            <View style={styles.scoreCell}>
              <ThemedText type="small" themeColor="textSecondary">
                Move a slider to see your score — or take the research weighting below.
              </ThemedText>
            </View>
          )}
        </View>

        <View style={styles.sliders}>
          {WORLD_CATEGORY_ORDER.map((categoryId: WorldCategory) => {
            const breakdown = scoreByCategory.get(categoryId);
            return (
              <WeightSlider
                key={categoryId}
                label={categoryLabel(categoryId)}
                blurb={CATEGORY_BLURBS[categoryId]}
                value={draft[categoryId] ?? 0}
                defaultValue={defaults[categoryId] ?? 0}
                score={breakdown ? breakdown.score : null}
                metricCount={breakdown?.metricCount ?? 0}
                onChange={(next) => setWeight(categoryId, next)}
              />
            );
          })}
        </View>

        <View style={styles.actions}>
          {/* Pressable whenever there is something to record, including on a
              first visit with the sliders untouched — where it clears rather
              than saves, and returns to the opening prompt. See
              `saveAndReturn`. */}
          <Button
            title={hasSaved && !isDirty ? 'Saved' : 'Save'}
            variant="primary"
            onPress={saveAndReturn}
            disabled={hasSaved && !isDirty}
            accessibilityLabel={
              hasSaved && !isDirty
                ? 'Your weighting is saved'
                : 'Save your weighting and return to Today'
            }
          />

          {/* The button's own label already says "Saved" when there is nothing
              pending, so this line exists for the cases that label cannot
              cover: a weighting saved on some earlier visit, and a visit where
              the sliders sit where they opened and so say nothing yet. */}
          <ThemedText
            type="small"
            themeColor="textMuted"
            style={styles.saveNote}>
            {isDirty
              ? 'Unsaved changes — your score updates live, but only Save keeps it.'
              : hasSaved
                ? 'Your weighting is saved on this device.'
                : 'Move a slider to set your own, or take the research weighting as it stands.'}
          </ThemedText>

          {/**
           * The opt-in route back to the published weighting.
           *
           * Offered rather than assumed. Not everybody wants to arbitrate what
           * human progress consists of before they can see a number, and that is
           * a reasonable place to stand — the objection was only ever to the app
           * deciding it for them silently. Pressing this is a decision; the
           * sliders sitting where they opened is not.
           *
           * Hidden once they have their own weighting saved, where it would read
           * as an invitation to discard it. `Clear my weighting` is the way back
           * from there, and this reappears after it.
           */}
          {hasSaved ? null : (
            <Button
              title="Use the research weighting"
              variant="secondary"
              onPress={useResearchWeighting}
              accessibilityLabel="Score using the published research weighting instead of your own"
            />
          )}

          {/* "Clear", not "reset to defaults" — there is no default weighting
              to go back to any more. This drops the reader's answer and returns
              the sliders to where they opened. */}
          <Button
            title="Clear my weighting"
            variant="secondary"
            onPress={reset}
            disabled={!isCustomised && !hasSaved}
            accessibilityLabel="Clear your weighting and return the sliders to where they started"
          />
        </View>

        <ThemedText type="small" themeColor="textMuted" style={styles.footnote}>
          Weights are stored on this device only. A category with no indicators yet is skipped
          in the score rather than counted as zero, so weighting it does not drag the number
          down — it just has nothing to say until the data lands.
        </ThemedText>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: Spacing.four,
    gap: Spacing.four,
    maxWidth: MaxContentWidth,
    width: '100%',
    alignSelf: 'center',
  },
  intro: {
    gap: Spacing.two,
  },
  scoreCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.lg,
    padding: Spacing.four,
  },
  scoreRow: {
    flexDirection: 'row',
    gap: Spacing.five,
  },
  scoreCell: {
    flex: 1,
    gap: 2,
  },
  actions: {
    gap: Spacing.two,
  },
  saveNote: {
    paddingHorizontal: Spacing.one,
  },
  sliders: {
    gap: Spacing.two,
  },
  footnote: {
    paddingBottom: Spacing.five,
  },
});
