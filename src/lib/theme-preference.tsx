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

export type ThemePreference = 'light' | 'dark';

const STORAGE_KEY = 'humanitas.appearance';

/**
 * Light unless the user has said otherwise — the palette was drawn for paper
 * first, and the system scheme is deliberately not consulted. Someone whose
 * phone is dark all evening still gets the app they chose.
 */
const DEFAULT_PREFERENCE: ThemePreference = 'light';

/**
 * Read synchronously at first render.
 *
 * `expo-sqlite/localStorage/install` backs `localStorage` with SQLite, so this
 * is a real blocking read rather than a promise — which is the whole point.
 * Loading the preference in an effect would paint one frame of light theme
 * before flipping to dark.
 */
function readStoredPreference(): ThemePreference {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'dark' ? 'dark' : DEFAULT_PREFERENCE;
  } catch {
    // Storage is unavailable on some web contexts (private mode, blocked
    // cookies). A missing preference is not worth failing a render over.
    return DEFAULT_PREFERENCE;
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

applyNativeAppearance(readStoredPreference());

export function ThemePreferenceProvider({ children }: PropsWithChildren) {
  const [preference, setStoredPreference] = useState<ThemePreference>(readStoredPreference);

  // Keeps native views in step when the switch is flipped at runtime.
  useEffect(() => {
    applyNativeAppearance(preference);
  }, [preference]);

  const setPreference = useCallback((next: ThemePreference) => {
    // State first: the toggle should feel instant even if the write is slow.
    setStoredPreference(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
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
