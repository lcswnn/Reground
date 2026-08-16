/**
 * The soundscape step: a list, then one of them playing.
 *
 * Two beats where the somatic step has four, and the missing two are missing on
 * purpose. There is no tutorial because there is nothing to learn — a screen
 * explaining how to listen to rain would be a screen for its own sake. And
 * there is no settle beat because the sound fading out *is* the settle; the
 * exercise ends by receding rather than by stopping, and putting a screen after
 * that to ask how it went would be talking over the ending.
 *
 * So the natural end goes straight to `/close`, whose first line is "That's
 * all." Landing there out of two seconds of fading rain is the best ending the
 * session has.
 *
 * ## Why the state is local here, and not a hook like somatic's
 *
 * The somatic step lifted its phase into `use-somatic-flow.ts` because the back
 * button had four different answers depending on which beat was showing. This
 * one has two, and the second is "back to the list" — which is exactly what a
 * single piece of local state can express. `back` is handed up so `/one-more`
 * can give it to the frame, and that is the whole of the coupling.
 *
 * ## Why the player is loaded lazily
 *
 * It is the only file in the app that touches `expo-audio`, and `expo-audio` is
 * a native module — it exists in the JS bundle whether or not it exists in the
 * compiled binary, and asking for one that was never built in raises at import
 * time rather than at call time.
 *
 * That matters far more than it looks, because of *when* this module is first
 * imported. Expo Router walks every route at startup to validate its exports,
 * which imports `/one-more`, which imports this, which imported the player —
 * so a dev client built before `expo-audio` was installed did not fail to play
 * a soundscape, it failed to open the app at all. A whole session about anxiety
 * taken down by an mp3 feature nobody had navigated to.
 *
 * `lazy` moves that import behind the first render of the player, which happens
 * only after somebody has picked a soundscape that has a file behind it. Now
 * the native module is asked for at the one moment the app genuinely needs it,
 * and everything else — including all four other last-thing options — is
 * reachable regardless of what is in the binary.
 *
 * This is the same boundary `hasSoundscapes()` draws for the audio *files*,
 * finally drawn for the audio *module* as well. `audio.ts` was already safe:
 * its `AudioSource` import is `import type`, which is erased at compile time
 * and so never reaches the native module.
 *
 * The Suspense fallback is `null` rather than a spinner. There is no network
 * here — Metro has the module in the bundle already and is only being asked to
 * evaluate it — so the gap is a frame at most, and a spinner that flashes for
 * one frame is worse than nothing appearing for one frame.
 */

import { Suspense, lazy, useCallback, useState } from 'react';

import { findSoundscape, type SoundscapeId } from '@/content/soundscape';
import { soundscapeAudio } from '@/session/soundscape/audio';
import { SoundscapePicker } from '@/session/soundscape/soundscape-picker';

const SoundscapePlayer = lazy(async () => {
  const loaded = await import('@/session/soundscape/soundscape-player');
  return { default: loaded.SoundscapePlayer };
});

export interface SoundscapeFlow {
  /** What the frame's back button does from whichever beat is showing. */
  back: () => void;
  chosen: SoundscapeId | null;
  toList: () => void;
  choose: (id: SoundscapeId) => void;
}

/**
 * @param onExit what back does from the list — the one beat with nothing of
 * ours behind it. `/one-more` passes its own "back to the five" here.
 */
export function useSoundscapeFlow(onExit: () => void): SoundscapeFlow {
  const [chosen, setChosen] = useState<SoundscapeId | null>(null);

  const toList = useCallback(() => setChosen(null), []);
  const choose = useCallback((id: SoundscapeId) => setChosen(id), []);

  const back = useCallback(() => {
    if (chosen === null) onExit();
    else setChosen(null);
  }, [chosen, onExit]);

  return { back, chosen, toList, choose };
}

interface SoundscapeFlowViewProps {
  flow: SoundscapeFlow;
  /** Out of the session — the closing screen. */
  onDone: () => void;
}

export function SoundscapeFlowView({ flow, onDone }: SoundscapeFlowViewProps) {
  const { chosen, toList } = flow;

  const soundscape = chosen === null ? null : (findSoundscape(chosen) ?? null);
  const source = chosen === null ? undefined : soundscapeAudio(chosen);

  // A chosen id with no catalog entry or no audio behind it folds back to the
  // list, the same fallback `/one-more` uses for a stale `oneMore`. Unreachable
  // while the only writer is a card on that list — which is itself drawn from
  // the audio map — and the right answer regardless.
  if (soundscape === null || source === undefined) {
    return <SoundscapePicker onPick={flow.choose} />;
  }

  return (
    <Suspense fallback={null}>
      <SoundscapePlayer
        // Keyed on the soundscape so picking a different one after backing out
        // builds a new player rather than swapping the source underneath a
        // running fade.
        key={soundscape.id}
        soundscape={soundscape}
        source={source}
        onDone={onDone}
        // A file that will not open puts the user back on the list rather than
        // on a dead screen. The copy for it lives on the picker — see
        // `SOUNDSCAPE_COPY.failed`.
        onFailed={toList}
      />
    </Suspense>
  );
}
