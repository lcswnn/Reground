import 'expo-sqlite/localStorage/install';

import {
  createContext,
  use,
  useCallback,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';

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

export function ThemePreferenceProvider({ children }: PropsWithChildren) {
  const [preference, setStoredPreference] = useState<ThemePreference>(readStoredPreference);

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
