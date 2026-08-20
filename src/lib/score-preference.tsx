/**
 * Whether the games show a score, and the app's answer is "not unless you ask".
 *
 * ## Why this is a setting and not a feature
 *
 * Every game on the shelf was built without one, and the reasoning is written
 * into each of them: a number going up turns a distraction into a performance,
 * and a number that stops going up turns it into a loss. That is still true, and
 * it is why the default here is `false` — somebody who opens this app wound up
 * and taps the first game gets what the app was designed to give them, which is
 * something to do with their hands and no way to be doing it badly.
 *
 * What the reasoning missed is the other player: the one who has used this six
 * times, is not in crisis today, and finds a game with nothing to measure
 * slightly pointless. Refusing them a count is not protecting anybody — it is
 * the app deciding it knows which kind of visit this is. So the number exists,
 * it is off, and turning it on takes one tap on the same row it appears in.
 *
 * ## What it is not
 *
 * There is no high score, no best-ever, no streak and nothing kept between
 * sessions. The number is what happened in *this* round and it goes when the
 * screen does, which is the same rule the rest of the session keeps — see
 * `session-context.tsx`, where everything else is cleared on the way out.
 *
 * The preference itself is remembered, and that is the only thing that is. It
 * is a two-value answer about how the app should be drawn, like the appearance
 * switch it sits alongside in `theme-preference.tsx`, and asking again every
 * session would be asking somebody to re-state a preference rather than make a
 * choice.
 */

import 'expo-sqlite/localStorage/install';

import {
  createContext,
  use,
  useCallback,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';

const STORAGE_KEY = 'humanitas.score';

/**
 * Off, and this is the load-bearing line in the file. See the note above: the
 * games are designed for somebody who should not be given a way to fail, and
 * the score is an opt-in for the visits that are not that.
 */
const DEFAULT_SHOWN = false;

/** Read synchronously at first render, for the reason `theme-preference` gives:
    an effect would paint one frame of the board with the wrong row above it. */
function readStoredPreference(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'on';
  } catch {
    // Storage is unavailable in some web contexts. Off is the safe way to be
    // wrong here — it is the design's own answer.
    return DEFAULT_SHOWN;
  }
}

interface ScorePreferenceValue {
  shown: boolean;
  setShown: (next: boolean) => void;
}

const ScorePreferenceContext = createContext<ScorePreferenceValue | null>(null);

export function useScorePreference() {
  const value = use(ScorePreferenceContext);
  if (!value) {
    throw new Error('useScorePreference must be used inside <ScorePreferenceProvider>');
  }
  return value;
}

export function ScorePreferenceProvider({ children }: PropsWithChildren) {
  const [shown, setStored] = useState<boolean>(readStoredPreference);

  const setShown = useCallback((next: boolean) => {
    setStored(next);

    try {
      localStorage.setItem(STORAGE_KEY, next ? 'on' : 'off');
    } catch {
      // A preference that cannot be written is one asked again next session,
      // which is a nuisance rather than a failure.
    }
  }, []);

  const value = useMemo(() => ({ shown, setShown }), [shown, setShown]);

  return (
    <ScorePreferenceContext value={value}>{children}</ScorePreferenceContext>
  );
}
