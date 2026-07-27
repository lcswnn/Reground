import { useSyncExternalStore } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';

// Static web rendering has no color scheme at build time, so the first client
// render must match the server's "light" output before switching to the real
// value. useSyncExternalStore is the supported way to read that transition —
// setting state inside an effect would trigger a cascading render instead.
const subscribe = () => () => {};
const getSnapshot = () => true;
const getServerSnapshot = () => false;

/**
 * To support static rendering, this value needs to be re-calculated on the
 * client side for web.
 */
export function useColorScheme() {
  const hasHydrated = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const colorScheme = useRNColorScheme();

  return hasHydrated ? colorScheme : 'light';
}
