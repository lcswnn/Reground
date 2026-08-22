/**
 * The palette for the appearance the user picked in Settings.
 *
 * Deliberately not the system color scheme: appearance is an in-app setting.
 * Left alone, it follows the clock — light from six in the morning, dark from
 * six in the evening — and a tap on the switch overrides that until the day
 * turns over. See `@/lib/appearance-clock` for why a choice expires, and
 * `@/lib/theme-preference` for where it is kept.
 */

import { Colors } from '@/constants/theme';
import { useThemePreference } from '@/lib/theme-preference';

export function useTheme() {
  const { isDark } = useThemePreference();

  return isDark ? Colors.dark : Colors.light;
}
