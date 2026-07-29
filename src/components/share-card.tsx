import { LinearGradient } from 'expo-linear-gradient';
import { forwardRef } from 'react';
import { StyleSheet, View } from 'react-native';

import { formatMetricValue } from '@/api/humanity';
import { Sparkline } from '@/components/sparkline';
import { ThemedText } from '@/components/themed-text';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';
import { categoryLabel } from '@/constants/world-metrics';
import type { DailyCard } from '@/lib/daily-card';
import { formatDay } from '@/lib/format';

/**
 * Fixed to the light palette, and deliberately not theme-aware.
 *
 * Everywhere else in the app following the reader's scheme is correct. Here it
 * is wrong: this image leaves the app, and a card that came out near-black
 * because the sharer happened to have dark mode on would not read as the same
 * product as one that came out on paper. A set of these in a feed has to look
 * like a set, so the identity is pinned rather than inherited.
 */
const palette = Colors.light;

/**
 * The card's ground: terracotta into dusty pink, corner to corner.
 *
 * The two are the palette's documented companions, and the ramp between them is
 * the sunrise the whole scheme is named for — which is the right ground for a
 * card whose entire job is to make "things are getting better" feel true at a
 * glance. It also does what a flat orange could not: the gradient makes the
 * image identifiable as this app from across a feed *and* stays interesting at
 * the size a story renders.
 */
const GROUND = [palette.brand, palette.accent] as const;

/**
 * The day's card, composed to be screenshotted.
 *
 * A different object from `DailyCard`, not a variant of it, because the two are
 * solving opposite problems. The in-app card lives in a scrolling column next to
 * a composite bar and a lifetime section, so it has to be quiet enough to sit
 * beside them. This one has to survive being cropped out of context and dropped
 * into somebody's Instagram story, where it is competing with everything else on
 * a feed and has about one second to say something. So: one claim, at size, on
 * colour, with the provenance small but present.
 *
 * The provenance is not decoration either. A hopeful statistic with no source is
 * indistinguishable from a made-up one, and this card's whole value is that it
 * is *true* — the line naming Our World in Data is what makes it shareable by
 * someone who would be embarrassed to post a fake.
 */

/**
 * 4:5, the tallest a post renders un-cropped on most feeds.
 *
 * Fixed rather than content-sized so every card in the rotation shares one
 * silhouette — a set of screenshots from this app should look like a set.
 */
export const SHARE_ASPECT_RATIO = 4 / 5;

interface ShareCardProps {
  card: DailyCard;
  /**
   * Width to render at. The capture happens at this size times the device's
   * pixel ratio, so a phone-width card still exports at 2–3x for a feed.
   */
  width: number;
}

/**
 * Ref-forwarding because `captureRef` needs the host view, and the parent owns
 * the capture — this component should not know it is being photographed.
 */
export const ShareCard = forwardRef<View, ShareCardProps>(function ShareCard({ card, width }, ref) {
  // Null direction means the artifact predates the field, so neither green nor
  // red is honest — the same rule the rest of the app follows. Here it falls
  // back to the brand rather than to grey: this card is a piece of design, and
  // a grey headline would read as a mistake rather than as a caveat.
  const accent =
    card.isProgress === null
      ? palette.brandStrong
      : card.isProgress
        ? palette.positive
        : palette.decline;

  // Scales every dimension off the render width so the exported image is
  // identical at any device size — a card captured on an SE and one on a Pro Max
  // differ in pixels, not in proportions.
  const scale = width / 360;

  return (
    <View
      ref={ref}
      collapsable={false}
      style={[
        styles.card,
        {
          width,
          aspectRatio: SHARE_ASPECT_RATIO,
          borderRadius: Radius.xl * scale,
          // Generous on purpose. At a narrow inset the gradient reads as a
          // border on a white card; at this one the card *is* the gradient and
          // the white is a plate laid on it, which is the composition that
          // survives being scrolled past. The white earns its area by being
          // where the type has to stay legible — everywhere else can be colour.
          paddingHorizontal: Spacing.four * scale,
          paddingTop: Spacing.five * scale,
          paddingBottom: Spacing.three * scale,
          gap: Spacing.three * scale,
        },
      ]}>
      {/* Under everything, clipped by the card's own radius. Corner to corner
          rather than banded, so no edge of the image is a flat colour. */}
      <LinearGradient
        colors={GROUND}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <View
        style={[
          styles.sheet,
          {
            backgroundColor: palette.background,
            borderRadius: Radius.lg * scale,
            padding: Spacing.three * scale,
          },
        ]}>
        <View style={styles.top}>
          <ThemedText
            type="eyebrow"
            style={[styles.category, { color: accent, fontSize: 13 * scale }]}
            numberOfLines={1}>
            {categoryLabel(card.metric.category)}
          </ThemedText>

          <ThemedText
            style={[
              styles.headline,
              { fontSize: 27 * scale, lineHeight: 34 * scale, color: palette.text },
            ]}
            // Six lines of a 27pt serif is the whole top half. Anything longer
            // is a headline that failed, and shrinking is better than clipping.
            numberOfLines={6}
            adjustsFontSizeToFit
            minimumFontScale={0.7}>
            {card.headline}
          </ThemedText>
        </View>

        <View style={[styles.middle, { gap: Spacing.three * scale }]}>
          <View style={[styles.pair, { gap: Spacing.two * scale }]}>
            {card.from ? (
              <>
                <Figure
                  label={card.from.year}
                  value={formatAt(card, card.from.value)}
                  color={palette.textMuted}
                  scale={scale}
                />
                <ThemedText
                  style={[styles.arrow, { fontSize: 22 * scale, color: palette.textMuted }]}>
                  →
                </ThemedText>
              </>
            ) : null}

            <Figure
              label={card.to.year ?? 'today'}
              value={formatAt(card, card.to.value)}
              color={accent}
              scale={scale}
            />
          </View>

          <Sparkline values={card.spark} color={accent} height={54 * scale} />
        </View>

        {/* Source and date stay on the sheet, next to the numbers they belong
            to. A hopeful statistic with no attribution is indistinguishable
            from an invented one, and being checkable is what makes this
            postable by someone who would be embarrassed to share a fake. */}
        <View
          style={[
            styles.footer,
            { borderTopColor: palette.border, paddingTop: Spacing.two * scale },
          ]}>
          <ThemedText
            style={[styles.source, { fontSize: 12 * scale, color: palette.textMuted }]}
            numberOfLines={1}>
            {card.metric.sourceName}
          </ThemedText>

          <ThemedText
            style={[styles.date, { fontSize: 12 * scale, color: palette.textMuted }]}
            numberOfLines={1}>
            {formatDay(card.date)}
          </ThemedText>
        </View>
      </View>

      {/* On the orange, below the sheet. The wordmark belongs to the frame
          rather than to the content — it is the thing that stays identical on
          every card in the rotation, which is exactly what makes a set of these
          recognisable as a set. */}
      <ThemedText
        style={[
          styles.wordmark,
          { fontSize: 13 * scale, lineHeight: 20 * scale, color: palette.textOnBrand },
        ]}>
        HUMANITAS
      </ThemedText>
    </View>
  );
});

function Figure({
  label,
  value,
  color,
  scale,
}: {
  label: string;
  value: string;
  color: string;
  scale: number;
}) {
  return (
    <View style={styles.figure}>
      <ThemedText
        style={[styles.value, { fontSize: 30 * scale, lineHeight: 36 * scale, color }]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.6}>
        {value}
      </ThemedText>
      <ThemedText style={[styles.figureLabel, { fontSize: 13 * scale, color: palette.textMuted }]}>
        {label}
      </ThemedText>
    </View>
  );
}

function formatAt(card: DailyCard, value: number): string {
  return formatMetricValue({ ...card.metric, currentValue: value });
}

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
  },
  // Takes everything the frame's padding leaves, so the orange reads as an even
  // border rather than as a block the content happens to sit on.
  sheet: {
    flex: 1,
    justifyContent: 'space-between',
  },
  top: {
    gap: Spacing.two,
  },
  category: {
    letterSpacing: 1.2,
  },
  headline: {
    fontFamily: Fonts.display,
  },
  middle: {
    justifyContent: 'flex-end',
  },
  pair: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  figure: {
    flexShrink: 1,
  },
  value: {
    fontFamily: Fonts.display,
  },
  figureLabel: {
    fontFamily: Fonts.body,
  },
  arrow: {
    fontFamily: Fonts.body,
    paddingBottom: 6,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    gap: Spacing.two,
  },
  wordmark: {
    fontFamily: Fonts.display,
    letterSpacing: 1.6,
    textAlign: 'center',
  },
  source: {
    fontFamily: Fonts.body,
  },
  date: {
    fontFamily: Fonts.body,
  },
});
