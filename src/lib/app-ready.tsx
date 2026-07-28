import { createContext, use } from 'react';

/**
 * False until the splash screen has been handed off to the real UI.
 *
 * The first screen now mounts and lays out underneath the splash, which means
 * anything that animates on mount would run its entrance while nobody can see
 * it and be sitting at its end state by the time the splash lifts. Screens hold
 * those animations until this flips.
 */
export const AppReadyContext = createContext(false);

export function useAppReady(): boolean {
  return use(AppReadyContext);
}
