/**
 * The palette for the appearance the user picked in Settings.
 *
 * Deliberately not the system color scheme: appearance is an in-app setting
 * that defaults to light. See `@/lib/theme-preference`.
 */

import { Colors } from '@/constants/theme';
import { useThemePreference } from '@/lib/theme-preference';

export function useTheme() {
  const { isDark } = useThemePreference();

  return isDark ? Colors.dark : Colors.light;
}
