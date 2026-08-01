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
 * Seven sliders, a live composite, and a reset. The score at the top recomputes
 * on every drag through `computeComposite`, which is the same maths the data
 * layer used to produce the number in the artifact — see `src/lib/scoring.ts`
 * for why there are two implementations and what guards them against drifting.
 *
 * The framing is deliberately not "tune this until you like the number". Both
 * scores are shown side by side precisely so that moving a slider reads as
 * "here is what the world looks like if I care most about X", not as a way to
 * make the world look better. It is entirely possible — and honest — to
 * construct a weighting that scores worse than the default.
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

  // Derived from the artifact rather than hardcoded here: the data layer owns
  // the research defaults, and duplicating them in the UI is how the reset
  // button ends up restoring last quarter's weighting.
  const defaults = useMemo(() => defaultWeightsFrom(metrics), [metrics]);

  const { draft, setWeight, commit, reset, isDirty, isCustomised, hasSaved } =
    useWeightingDraft(defaults);

  /**
   * Save, then go to Today.
   *
   * Saving is the moment the score comes into existence, and the card on Today
   * is the only place it appears — leaving the reader on the sliders after they
   * commit means the payoff for answering the question happens on a screen they
   * are not looking at.
   *
   * `dismissTo` rather than `back`, because this screen has two entry points:
   * the card itself and the Progress tab. Popping one screen would return
   * somebody who came from Progress to Progress, where there is no card to see.
   */
  const saveAndReturn = useCallback(() => {
    commit();
    // `replace` covers the deep-link case, where this screen is the root and
    // there is nothing under it to dismiss to.
    if (router.canDismiss()) router.dismissTo('/');
    else router.replace('/');
  }, [commit]);

  const defaultResult = useMemo(
    () => computeComposite(metrics, defaults),
    [metrics, defaults],
  );
  const userResult = useMemo(() => computeComposite(metrics, draft), [metrics, draft]);

  const scoreByCategory = useMemo(
    () => new Map(userResult.categories.map((entry) => [entry.categoryId, entry])),
    [userResult],
  );

  if (isPending) return <LoadingState />;
  if (error) return <ErrorState error={error} onRetry={() => void refetch()} />;

  // Someone can drag a slider back to where it started, and showing "Your score"
  // against an identical number would be noise.
  const differs = isCustomised;
  const delta = userResult.score - defaultResult.score;

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

        <View style={[styles.scoreCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.scoreRow}>
            <View style={styles.scoreCell}>
              <ThemedText type="small" themeColor="textMuted">
                Humanity Score
              </ThemedText>
              <ThemedText type="title">{(defaultResult.score * 100).toFixed(1)}%</ThemedText>
              <ThemedText type="small" themeColor="textMuted">
                research default
              </ThemedText>
            </View>

            {differs ? (
              <View style={styles.scoreCell}>
                <ThemedText type="small" themeColor="textMuted">
                  Your score
                </ThemedText>
                <ThemedText type="title" style={{ color: theme.info }}>
                  {(userResult.score * 100).toFixed(1)}%
                </ThemedText>
                <ThemedText
                  type="small"
                  style={{ color: delta >= 0 ? theme.positive : theme.decline }}>
                  {delta >= 0 ? '+' : '−'}
                  {Math.abs(delta * 100).toFixed(1)} pts
                </ThemedText>
              </View>
            ) : null}
          </View>
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
          {/* Enabled when nothing has been saved yet, even with the sliders
              untouched.

              Since the home screen stopped showing a default score, this button
              is the only way a score comes to exist — and a reader who looks at
              the research weighting and decides they agree with it has made a
              real choice, not a null one. Gating Save on `isDirty` alone left
              exactly that person stuck: nothing to save, so nothing to score,
              so the home card kept asking a question they had already answered.

              They still have to press it. Saving on arrival would put a number
              on the home screen that nobody chose, which is the thing this
              whole change removes. */}
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
              cover: a weighting saved on some earlier visit, and a first visit
              where the defaults are on screen but are not yet anyone's answer. */}
          <ThemedText
            type="small"
            themeColor="textMuted"
            style={styles.saveNote}>
            {isDirty
              ? 'Unsaved changes — your score updates live, but only Save keeps it.'
              : hasSaved
                ? 'Your weighting is saved on this device.'
                : 'Move the sliders, or save these as they are. Either way, Save is what puts a score on your home screen.'}
          </ThemedText>

          <Button
            title="Reset to defaults"
            variant="secondary"
            onPress={reset}
            disabled={!isCustomised && !hasSaved}
            accessibilityLabel="Reset all category weights to the research defaults"
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
