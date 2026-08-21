/**
 * Whether this phone sends anything, and whether it has been told that it does.
 *
 * The fourth of the app's small stored preferences and modelled on the other
 * three down to the storage call — see `theme-preference.tsx` for the pattern
 * and `region-preference.tsx` for the trick this one borrows: a `null` that is a
 * real state rather than a missing value.
 *
 * ## Three values, not two
 *
 *  - `null`  — nobody has been shown the sentence yet. Sharing is **on**, and
 *              the first launch owes them the sentence before a session can
 *              produce anything to send. See `DataSharingSheet`, which is what
 *              this state puts on the door.
 *  - `'on'`  — they have read it and left it alone.
 *  - `'off'` — they have read it and turned it off.
 *
 * Collapsing the first two into a boolean would lose the only thing that makes
 * a default-on switch honest, which is knowing whether it has ever been in front
 * of the person it is defaulting for.
 *
 * ## On the default being on
 *
 * It is what was asked for, and it is what almost every app does. Worth writing
 * down anyway that "opt in, default on" is an opt-*out*, and that under GDPR
 * analytics consent has to be an actual opt-in for users in the EU/UK. Today
 * this ships to the US. If it ships to Europe, the honest change is small — the
 * sheet already asks the question, so it is `DEFAULT_SHARES` here and a second
 * button there. That is the whole of it.
 *
 * ## Turning it off is retroactive
 *
 * `setSharing(false)` does not merely stop the sending. It throws away anything
 * still queued on this phone and deletes what has already been sent — see
 * `clearQueue` and `forgetSharedData`, and the delete policy on `app_sessions`
 * that lets a phone do that to its own rows. A switch that only governs the
 * future is a switch that has read the word "consent" and not understood it.
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

import { forgetSharedData, setSharedFlag } from '@/lib/analytics/install';
import { clearQueue } from '@/lib/analytics/queue';

const STORAGE_KEY = 'humanitas.share';

/** See the note above before changing this. */
const DEFAULT_SHARES = true;

type Stored = 'on' | 'off';

function readStored(): Stored | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY);

    return value === 'on' || value === 'off' ? value : null;
  } catch {
    // Storage is unavailable in some web contexts. Unasked is the safe way to
    // be wrong: the worst case is showing the sentence twice.
    return null;
  }
}

interface DataSharingValue {
  /** Whether anything may be sent right now. */
  sharing: boolean;
  /** False until the sentence has been in front of them. */
  acknowledged: boolean;
  /**
   * Records the answer, and — when the answer is no — takes back what has
   * already gone. Never throws: the network half is fire-and-forget.
   */
  setSharing: (next: boolean) => void;
  /** Keeps the current answer and marks it as seen. What the sheet's button does. */
  acknowledge: () => void;
}

const DataSharingContext = createContext<DataSharingValue | null>(null);

export function useDataSharing() {
  const value = use(DataSharingContext);
  if (!value) {
    throw new Error('useDataSharing must be used inside <DataSharingProvider>');
  }
  return value;
}

export function DataSharingProvider({ children }: PropsWithChildren) {
  const [stored, setStored] = useState<Stored | null>(readStored);

  const write = useCallback((next: Stored) => {
    setStored(next);

    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // A preference that cannot be written is one asked again next launch,
      // which is a nuisance rather than a failure.
    }
  }, []);

  const setSharing = useCallback(
    (next: boolean) => {
      write(next ? 'on' : 'off');

      if (next) {
        // Re-marks the install as sharing, so a report can tell somebody who
        // turned it back on from somebody who never turned it off.
        void setSharedFlag(true);
        return;
      }

      // Off, in the order that matters: anything still waiting for signal goes
      // first and synchronously, because that is the part this phone can be sure
      // of. The server delete is a request like any other and may not land.
      clearQueue();
      void forgetSharedData();
    },
    [write],
  );

  const acknowledge = useCallback(() => {
    write(stored ?? (DEFAULT_SHARES ? 'on' : 'off'));
  }, [stored, write]);

  const value = useMemo<DataSharingValue>(
    () => ({
      sharing: stored === null ? DEFAULT_SHARES : stored === 'on',
      acknowledged: stored !== null,
      setSharing,
      acknowledge,
    }),
    [stored, setSharing, acknowledge],
  );

  return <DataSharingContext value={value}>{children}</DataSharingContext>;
}

/** Whether the sentence has ever been in front of them. See `startAnalytics`. */
export function hasAcknowledged(): boolean {
  return readStored() !== null;
}

/**
 * The same answer, read straight off storage, for the code that records a
 * session.
 *
 * A hook would be the wrong shape there: the recording happens inside the
 * session provider's own callbacks and inside a retry queue that runs at launch,
 * neither of which is a place to be reading React context. This is one
 * synchronous `localStorage` read against a key that only a tap can change.
 */
export function isSharing(): boolean {
  const stored = readStored();

  return stored === null ? DEFAULT_SHARES : stored === 'on';
}
