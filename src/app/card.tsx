import { useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { SymbolView } from 'expo-symbols';
import { useRef, useState } from 'react';
import { Pressable, Share, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { captureRef } from 'react-native-view-shot';

import { fetchHumanityArtifact } from '@/api/humanity';
import { fetchProfile } from '@/api/profile';
import { ShareCard, SHARE_ASPECT_RATIO } from '@/components/share-card';
import { ThemedText } from '@/components/themed-text';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { selectDailyCard } from '@/lib/daily-card';
import { todayISO } from '@/lib/format';
import { queryKeys } from '@/lib/query';
import { useSession } from '@/lib/session';

/**
 * Today's card, held up to be looked at and sent.
 *
 * A floating panel over a dimmed Today rather than an opaque screen: the card is
 * an object you are being handed, not a place you navigated to, and leaving the
 * home screen faintly visible behind it says so. Tapping the dark area puts it
 * back down.
 *
 * The card itself is *derived*, not passed. `selectDailyCard` is deterministic
 * in the date, so this screen recomputes the same card the home screen is
 * showing rather than serialising one through route params, and both read the
 * same cached artifact — opening this costs no network at all.
 */

/**
 * How dark Today goes behind the panel.
 *
 * Deep enough that the home screen reads as context rather than as competition —
 * the card is the only lit thing on the display, which is what a "here, look at
 * this" moment should feel like.
 */
const SCRIM = 'rgba(0, 0, 0, 0.72)';

/**
 * Vertical space the panel needs for everything that is not the card: the close
 * row, the hint, the share button, and the padding between them. Used to size
 * the card down on a short phone so the button can never be pushed off screen.
 */
const PANEL_CHROME_HEIGHT = 190;

export default function CardScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { session } = useSession();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  // What `captureRef` photographs. Points at the card itself rather than at the
  // panel, so the exported PNG carries no gradient or padding at its edges.
  const cardRef = useRef<View>(null);
  const [isSharing, setIsSharing] = useState(false);

  const humanityQuery = useQuery({
    queryKey: queryKeys.humanity,
    queryFn: fetchHumanityArtifact,
  });

  const userId = session?.user.id;
  const profileQuery = useQuery({
    queryKey: queryKeys.profile(userId ?? ''),
    queryFn: () => fetchProfile(userId as string),
    enabled: !!userId,
  });

  const card =
    humanityQuery.data && !profileQuery.isPending
      ? selectDailyCard(humanityQuery.data.metrics, {
          date: todayISO(),
          birthDate: profileQuery.data?.birth_date ?? null,
        })
      : null;

  // The card is sized by whichever runs out first, width or height. Height is
  // the one that actually binds on a small phone: a 4:5 card at full width is
  // taller than the space left under the chrome, and without this the share
  // button would sit below the fold on an SE.
  const panelWidth = Math.min(width - Spacing.three * 2, MaxContentWidth);
  const widthBound = panelWidth - Spacing.three * 2;
  const heightBound =
    (height - insets.top - insets.bottom - PANEL_CHROME_HEIGHT - Spacing.four * 2) *
    SHARE_ASPECT_RATIO;
  const cardWidth = Math.max(180, Math.min(widthBound, heightBound, 420));

  async function onShare() {
    if (!card || isSharing) return;
    setIsSharing(true);

    try {
      // PNG, not JPEG: the card is flat colour and type, which JPEG rings
      // artefacts around and PNG stores exactly.
      const uri = await captureRef(cardRef, { format: 'png', quality: 1 });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'image/png',
          dialogTitle: 'Share today’s card',
          UTI: 'public.png',
        });
      } else {
        // No share sheet — a simulator without a configured target, mostly. The
        // text still carries the claim, which is the part worth sending.
        await Share.share({ message: `${card.headline} — ${card.metric.sourceName}` });
      }
    } catch {
      // A cancelled share sheet rejects on some platforms and is not an error.
      // Nothing here is worth interrupting the user over.
    } finally {
      setIsSharing(false);
    }
  }

  return (
    <View style={styles.root}>
      {/* A sibling of the panel rather than its parent, so a tap on the card
          cannot bubble out to the dismiss handler. */}
      <Animated.View entering={FadeIn.duration(200)} style={StyleSheet.absoluteFill}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close"
          onPress={() => router.back()}
          style={[StyleSheet.absoluteFill, { backgroundColor: SCRIM }]}
        />
      </Animated.View>

      <View style={styles.centering} pointerEvents="box-none">
        <Animated.View
          entering={ZoomIn.duration(240).withInitialValues({ transform: [{ scale: 0.92 }] })}
          style={[styles.panel, { width: panelWidth, borderColor: theme.border }]}>
          <LinearGradient
            // The warm wash the card used to carry itself. It belongs out here:
            // behind the card it frames the object without printing itself onto
            // the image that leaves the app.
            colors={[theme.brandSoft, theme.surface]}
            start={{ x: 0.1, y: 0 }}
            end={{ x: 0.9, y: 0.9 }}
            style={StyleSheet.absoluteFill}
          />

          <View style={styles.header}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close"
              onPress={() => router.back()}
              hitSlop={12}
              style={({ pressed }) => [pressed && styles.pressed]}>
              <SymbolView
                name="xmark"
                size={16}
                tintColor={theme.textSecondary}
                fallback={
                  <ThemedText type="small" themeColor="textSecondary">
                    Close
                  </ThemedText>
                }
              />
            </Pressable>
          </View>

          {humanityQuery.isPending ? (
            <View style={styles.message}>
              <ThemedText type="small" themeColor="textMuted">
                Loading today&rsquo;s card…
              </ThemedText>
            </View>
          ) : !card ? (
            <View style={styles.message}>
              <ThemedText type="sectionTitle" style={styles.centered}>
                No card today
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={styles.centered}>
                The progress data hasn&rsquo;t loaded yet. Pull to refresh on Today and come back.
              </ThemedText>
            </View>
          ) : (
            <>
              <ShareCard ref={cardRef} card={card} width={cardWidth} />

              <ThemedText type="small" themeColor="textMuted" style={styles.hint}>
                Screenshot it, or send it on.
              </ThemedText>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Share today’s card"
                accessibilityState={{ busy: isSharing }}
                onPress={onShare}
                disabled={isSharing}
                style={({ pressed }) => [
                  styles.shareButton,
                  { backgroundColor: theme.brand },
                  pressed && styles.pressed,
                  isSharing && styles.disabled,
                ]}>
                <SymbolView
                  name="square.and.arrow.up"
                  size={19}
                  tintColor={theme.textOnBrand}
                  fallback={<View />}
                />
                <ThemedText type="defaultSemiBold" style={{ color: theme.textOnBrand }}>
                  Share
                </ThemedText>
              </Pressable>
            </>
          )}
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  centering: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.three,
  },
  panel: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    overflow: 'hidden',
    padding: Spacing.three,
    paddingTop: Spacing.two,
    gap: Spacing.three,
    alignItems: 'center',
  },
  header: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    justifyContent: 'flex-end',
    // Sits off the panel's top edge rather than tight against it. The glyph is
    // small and its bounding box is tighter still, so at the panel's own padding
    // it optically hugs the corner.
    paddingTop: Spacing.two,
  },
  message: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.five,
  },
  centered: {
    textAlign: 'center',
  },
  hint: {
    textAlign: 'center',
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    height: 52,
    alignSelf: 'stretch',
    borderRadius: Radius.pill,
  },
  pressed: {
    opacity: 0.75,
  },
  disabled: {
    opacity: 0.5,
  },
});
