/**
 * A soundscape playing, and a way to stop it.
 *
 * The quietest screen in the app, and that is the design rather than an
 * absence: there is nothing to do here, the sound ends by itself, and every
 * control that could have been on this screen — scrub, skip, replay, volume —
 * would be one more thing to look at instead of listening. The hardware volume
 * buttons already do the only one of those anybody needs.
 *
 * ## The file is the clock
 *
 * Nothing here decides how long a soundscape runs. `status.duration` comes off
 * the loaded audio and the progress line is drawn from it, so the length of the
 * exercise is whatever length the mp3 is. That is a deliberate inversion of how
 * the rest of the app times things — the breath derives its length, the somatic
 * movements state theirs — and it falls out of not looping: see
 * `content/soundscape.ts`.
 *
 * ## Both fades are done here
 *
 * Not baked into the file. The user can stop early, and a fade exported into
 * the mp3 only covers the ending that happens on schedule — the other ending
 * would be a hard cut in the middle of a bed of rain, which is about the most
 * startling thing this app could do. Ramping the volume in JS covers both the
 * same way. `assets/soundscapes/README.md` tells whoever makes the files not to
 * fade them, which is the other half of this decision.
 *
 * The tail fade starts `fadeMs` before the end rather than on `didJustFinish`,
 * which by definition is too late to fade anything.
 *
 * ## Audio mode
 *
 * Set here rather than at app start, because this is the only screen in the app
 * that makes a sound. `playsInSilentMode` is the load-bearing one: a good share
 * of the people who open an app about anxiety have the ringer switch off, and
 * without it they would pick a soundscape, get silence, and reasonably conclude
 * the app is broken.
 */

import { useCallback, useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import {
  setAudioModeAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
  type AudioSource,
} from 'expo-audio';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { GROUNDING_FADE, SOUNDSCAPE } from '@/config/session';
import { SOUNDSCAPE_COPY } from '@/content/strings';
import type { Soundscape } from '@/content/soundscape';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * How often the volume ramp steps. ~60fps would be pointless — this is a JS
 * timer writing a native property, and the ear cannot hear the difference
 * between a 20ms and a 50ms granularity on a two-second fade.
 */
const RAMP_STEP_MS = 50;

interface SoundscapePlayerProps {
  soundscape: Soundscape;
  source: AudioSource;
  /** The sound reached its end, or the user stopped it. Same destination. */
  onDone: () => void;
  /** The file could not be opened at all. */
  onFailed: () => void;
}

export function SoundscapePlayer({
  soundscape,
  source,
  onDone,
  onFailed,
}: SoundscapePlayerProps) {
  const theme = useTheme();
  const player = useAudioPlayer(source, { updateInterval: SOUNDSCAPE.statusMs });
  const status = useAudioPlayerStatus(player);

  /**
   * Cleared when the component goes away, and checked before every write to
   * `player.volume`. The player is released on unmount by `useAudioPlayer`, so
   * a ramp still ticking after that would be writing to something that no
   * longer exists.
   */
  const ramp = useRef<ReturnType<typeof setInterval> | null>(null);
  /** So the tail fade is armed once rather than on every status update. */
  const fadingOut = useRef(false);
  /** So `onDone` cannot be called twice — by the fade and by `didJustFinish`. */
  const finished = useRef(false);
  /**
   * A ref rather than state, and not only to satisfy the compiler's lint about
   * setState in an effect. Nothing on this screen renders differently for a
   * failure — the screen is left immediately — so a failure is an event to
   * report upwards exactly once, not a state to hold and draw.
   */
  const failed = useRef(false);

  const stopRamp = useCallback(() => {
    if (ramp.current) {
      clearInterval(ramp.current);
      ramp.current = null;
    }
  }, []);

  /**
   * Walks `player.volume` from where it is to `to` over `ms`, then calls back.
   *
   * Linear, which for a two-second fade on broadband ambience is
   * indistinguishable from anything cleverer — there is no transient in a bed
   * of rain for a curve to flatter.
   */
  const rampVolume = useCallback(
    (to: number, ms: number, done?: () => void) => {
      stopRamp();

      const from = player.volume ?? 0;
      const steps = Math.max(1, Math.round(ms / RAMP_STEP_MS));
      let step = 0;

      ramp.current = setInterval(() => {
        step += 1;
        const at = step / steps;

        try {
          player.volume = from + (to - from) * at;
        } catch {
          // The player went away underneath us. Nothing to recover — the sound
          // is already gone, and throwing here would take the screen with it.
          stopRamp();
          return;
        }

        if (step >= steps) {
          stopRamp();
          done?.();
        }
      }, RAMP_STEP_MS);
    },
    [player, stopRamp],
  );

  /** Reported once, whichever of the two ways it was discovered. */
  const fail = useCallback(() => {
    if (failed.current || finished.current) return;
    failed.current = true;
    stopRamp();
    onFailed();
  }, [stopRamp, onFailed]);

  /** The single exit. Fades what is left, then hands over. */
  const finish = useCallback(() => {
    if (finished.current) return;
    finished.current = true;
    fadingOut.current = true;
    rampVolume(0, SOUNDSCAPE.fadeMs, onDone);
  }, [rampVolume, onDone]);

  // Open the audio session, start the sound, and bring it up from silence.
  useEffect(() => {
    let cancelled = false;

    const start = () => {
      if (cancelled) return;
      try {
        player.volume = 0;
        player.play();
      } catch {
        fail();
        return;
      }
      rampVolume(1, SOUNDSCAPE.fadeMs);
    };

    // `doNotMix` rather than ducking whatever else is playing: two ambient beds
    // at once is neither of them, and somebody who just chose a soundscape has
    // said which one they want to hear. The session deactivates on unmount, so
    // their podcast comes back on its own.
    setAudioModeAsync({
      playsInSilentMode: true,
      interruptionMode: 'doNotMix',
      shouldPlayInBackground: false,
    })
      // A mode that would not set is not a reason to refuse to play — at worst
      // the sound is inaudible on a silenced phone, which is strictly better
      // than nothing happening at all.
      .catch(() => {})
      .then(start);

    return () => {
      cancelled = true;
      stopRamp();
    };
  }, [player, rampVolume, stopRamp, fail]);

  // The two ways this ends on its own: the file ran out, or it could not be
  // opened. `error` is watched as well as `didJustFinish` because a source that
  // fails to load never finishes and would otherwise sit on "Starting…" forever.
  useEffect(() => {
    if (status.error) {
      fail();
      return;
    }

    if (status.didJustFinish) {
      // Already silent by now — the tail fade below ran ahead of this. Skipping
      // the ramp keeps `finish` from scheduling two more seconds of nothing.
      if (!finished.current) {
        finished.current = true;
        onDone();
      }
      return;
    }

    // Arm the tail fade. `didJustFinish` is by definition too late to fade
    // anything, so this watches for the end coming rather than waiting for it.
    if (
      !fadingOut.current &&
      status.isLoaded &&
      status.duration > 0 &&
      status.duration - status.currentTime <= SOUNDSCAPE.fadeMs / 1_000
    ) {
      fadingOut.current = true;
      rampVolume(0, SOUNDSCAPE.fadeMs);
    }
  }, [status, rampVolume, onDone, fail]);

  /**
   * How far through, 0 to 1. Guarded against a duration of zero, which is what
   * every status says before the file has opened — dividing by it would put the
   * line at `NaN` and Reanimated would keep it there.
   */
  const through =
    status.isLoaded && status.duration > 0
      ? Math.min(1, status.currentTime / status.duration)
      : 0;

  return (
    <Animated.View entering={FadeIn.duration(GROUNDING_FADE.inMs)} style={styles.root}>
      <View style={styles.middle}>
        <ThemedText type="title" style={styles.centred}>
          {soundscape.title}
        </ThemedText>

        <ThemedText type="small" themeColor="textMuted" style={styles.centred}>
          {status.isLoaded ? SOUNDSCAPE_COPY.playing : SOUNDSCAPE_COPY.loading}
        </ThemedText>

        {/* The same hairline the breath keeps time with, and at the same third
            of an opacity. It is the only indication of how much is left, and it
            is deliberately not a number: a countdown is something to watch, and
            this is the one exercise in the app where there is genuinely nothing
            to look at. Not animated on the UI thread either — it steps with the
            status updates, which at 200ms is smooth enough for a line moving
            across 180 points over three minutes. */}
        <View style={[styles.track, { backgroundColor: theme.border }]}>
          <View
            style={[
              styles.fill,
              { backgroundColor: theme.textMuted, transform: [{ scaleX: through }] },
            ]}
          />
        </View>
      </View>

      <Button title={SOUNDSCAPE_COPY.stop} variant="ghost" onPress={finish} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'center',
    gap: Spacing.six,
  },
  middle: {
    alignItems: 'center',
    gap: Spacing.four,
  },
  centred: {
    textAlign: 'center',
  },
  track: {
    width: 180,
    height: StyleSheet.hairlineWidth * 2,
    opacity: 0.35,
    overflow: 'hidden',
  },
  fill: {
    width: '100%',
    height: '100%',
    transformOrigin: 'left',
  },
});
