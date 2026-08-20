/**
 * Which country's crisis numbers this app shows, and whether it has been asked.
 *
 * Modelled on `theme-preference.tsx` down to the storage call, because it is
 * the same kind of thing: one small choice, made once, kept on the device, and
 * read synchronously at first render so that nothing paints twice.
 *
 * ## It is the only thing this app remembers about a person
 *
 * There is no account, no analytics, and no session history — everything the
 * user enters is cleared when the session ends. This is the exception, and it
 * is worth being clear about why it earns one: the alternative is asking every
 * time, and a modal about hotlines on every launch is both an interruption and
 * a small daily reminder that the app thinks you might need one.
 *
 * What is stored is a two-letter country id and nothing else. Not a location,
 * not coordinates, not an IP lookup, and nothing that leaves the phone. See
 * `guessRegion`, which reads the device's own locale to preselect an answer and
 * is never treated as one.
 *
 * `null` is a real state and not a missing value: it means nobody has been
 * asked yet, which is what the picker on the door keys off. A stored
 * `elsewhere` is a person who *was* asked and is not in one of the six
 * countries this app carries numbers for — those two must never collapse into
 * each other, or the app asks somebody the same question every time they open
 * it because they answered it in a way it did not like.
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

import { CRISIS_REGIONS, type RegionId } from '@/content/crisis';

const STORAGE_KEY = 'humanitas.region';

function isRegionId(value: string | null): value is RegionId {
  return CRISIS_REGIONS.some((region) => region.id === value);
}

/**
 * Read synchronously at first render, for the reason `theme-preference.tsx`
 * gives: `expo-sqlite/localStorage/install` makes this a blocking read, and an
 * effect would paint one frame of the door without knowing whether to ask.
 */
function readStoredRegion(): RegionId | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);

    return isRegionId(stored) ? stored : null;
  } catch {
    // Storage is unavailable in some web contexts. Unanswered is the safe way
    // to be wrong: the worst case is asking somebody twice.
    return null;
  }
}

interface RegionPreferenceValue {
  /** `null` until the question has been answered. See the note above. */
  region: RegionId | null;
  setRegion: (next: RegionId) => void;
}

const RegionPreferenceContext = createContext<RegionPreferenceValue | null>(null);

export function useRegionPreference() {
  const value = use(RegionPreferenceContext);
  if (!value) {
    throw new Error('useRegionPreference must be used inside <RegionPreferenceProvider>');
  }
  return value;
}

export function RegionPreferenceProvider({ children }: PropsWithChildren) {
  const [region, setStoredRegion] = useState<RegionId | null>(readStoredRegion);

  const setRegion = useCallback((next: RegionId) => {
    setStoredRegion(next);

    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Same as above: a choice that cannot be written is a question asked
      // again next launch, which is a nuisance rather than a failure.
    }
  }, []);

  const value = useMemo(() => ({ region, setRegion }), [region, setRegion]);

  return (
    <RegionPreferenceContext value={value}>{children}</RegionPreferenceContext>
  );
}
