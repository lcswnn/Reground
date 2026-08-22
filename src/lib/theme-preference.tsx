import 'expo-sqlite/localStorage/install';

import {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';
import { Appearance } from 'react-native';

import { openingAppearance, phaseAt } from '@/lib/appearance-clock';

export type ThemePreference = 'light' | 'dark';

const STORAGE_KEY = 'humanitas.appearance';

/**
 * The half of the day the stored choice was made in.
 *
 * Its own key rather than a field on a JSON blob, so that a reader who set the
 * switch before this existed simply has a missing value here rather than an
 * unparseable one — see `openingAppearance`, which treats the two the same and
 * lets the old choice expire at the next boundary.
 */
const PHASE_KEY = 'humanitas.appearance.phase';

/**
 * Read synchronously at first render.
 *
 * `expo-sqlite/localStorage/install` backs `localStorage` with SQLite, so this
 * is a real blocking read rather than a promise — which is the whole point.
 * Loading the preference in an effect would paint one frame of light theme
 * before flipping to dark.
 *
 * The clock is read once, here, and never again. Deciding at launch is the whole
 * design: an app that flipped to dark at six in the evening while somebody was
 * partway through a session would be changing the room around them mid-breath,
 * which is the opposite of what any of this is for. The session ends in the
 * appearance it started in, and the next launch asks the question again.
 */
function readOpeningPreference(): ThemePreference {
  try {
    return openingAppearance(
      localStorage.getItem(STORAGE_KEY),
      localStorage.getItem(PHASE_KEY),
      new Date(),
    );
  } catch {
    // Storage is unavailable on some web contexts (private mode, blocked
    // cookies). The clock still works, and it is the better half of the answer.
    return openingAppearance(null, null, new Date());
  }
}

interface ThemePreferenceValue {
  preference: ThemePreference;
  isDark: boolean;
  setPreference: (next: ThemePreference) => void;
}

const ThemePreferenceContext = createContext<ThemePreferenceValue | null>(null);

export function useThemePreference() {
  const value = use(ThemePreferenceContext);
  if (!value) {
    throw new Error('useThemePreference must be used inside <ThemePreferenceProvider>');
  }
  return value;
}

/**
 * Tells the *native* side which appearance the app is in.
 *
 * Everything drawn from JS reads `useTheme`, so the palette has always been
 * right. UIKit's own views are not drawn from JS and were still following the
 * phone: a reader with a dark system theme opening the birthday picker in this
 * app's light mode got a `UIDatePicker` rendering white text on paper — the
 * month, year and day invisible. Same class of bug in the reminder's time wheel,
 * text-selection menus, and the keyboard.
 *
 * `setColorScheme` overrides the appearance for the whole process, which is
 * exactly the scope the problem has. It is what makes "appearance is an in-app
 * setting" true of the parts of the app that are not ours to style.
 *
 * Called at module scope as well as from the effect below, because an effect
 * runs after the first commit and native chrome presented during that first
 * frame would use the system value.
 */
function applyNativeAppearance(preference: ThemePreference): void {
  try {
    Appearance.setColorScheme(preference);
  } catch {
    // Unimplemented on web, and unavailable in some test environments. The JS
    // palette is unaffected either way, so there is nothing to recover.
  }
}

applyNativeAppearance(readOpeningPreference());

export function ThemePreferenceProvider({ children }: PropsWithChildren) {
  const [preference, setStoredPreference] = useState<ThemePreference>(readOpeningPreference);

  // Keeps native views in step when the switch is flipped at runtime.
  useEffect(() => {
    applyNativeAppearance(preference);
  }, [preference]);

  const setPreference = useCallback((next: ThemePreference) => {
    // State first: the toggle should feel instant even if the write is slow.
    setStoredPreference(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
      // Stamped with the half of the day it was chosen in, which is what lets it
      // expire at the next boundary instead of overriding the clock forever.
      // See `openingAppearance` for why a choice is meant to expire at all.
      localStorage.setItem(PHASE_KEY, phaseAt(new Date()));
    } catch {
      // Same as above — the choice still applies for this session.
    }
  }, []);

  const value = useMemo<ThemePreferenceValue>(
    () => ({ preference, isDark: preference === 'dark', setPreference }),
    [preference, setPreference],
  );

  return <ThemePreferenceContext value={value}>{children}</ThemePreferenceContext>;
}
