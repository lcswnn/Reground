/**
 * When the splash goes away, for the two places that need to agree about it.
 *
 * `app/_layout.tsx` decides when to hide it, and schedules that off
 * `splashHoldsForMs`. `app/index.tsx` needs its own answer, because its line
 * fades up rather than being there from the first frame: started any earlier,
 * that fade would run to completion behind an opaque splash and the line would
 * be revealed already at full strength.
 *
 * The two used to wait for the same instant — the moment the splash *begins* to
 * dissolve — so that the fades overlapped and the line came up through the
 * splash as it cleared. They no longer do. The line waits for the splash to be
 * gone (`splashClearsInMs`), so the app arrives and *then* speaks, rather than
 * saying its first line over a screen that is still on its way out.
 *
 * That costs the length of the splash's own fade and nothing more. The version
 * before the overlap also held a 200ms settle on top of it, and that part has
 * not come back: the beat it bought was not worth 200ms of blank screen on the
 * one screen whose job is to be the first thing you see.
 *
 * Kept as a module rather than passed through context because there is exactly
 * one launch and it happens before React does. A provider would be state that
 * cannot change, threaded through a tree to reach one screen.
 */

import { SPLASH } from '@/config/session';

/**
 * Roughly when the app launched: the first moment its JavaScript ran.
 *
 * The native splash is already on screen by then — it goes up before the bundle
 * is even read — so this runs a little behind the truth, which is the safe
 * direction to be wrong in. Everything derived from it errs towards the splash
 * being up slightly longer than assumed, rather than being cut short of it.
 */
export const LAUNCHED_AT = Date.now();

/**
 * How long the splash still has to run before it starts fading, from now.
 *
 * `_layout.tsx` uses it to schedule `hideAsync`. `index.tsx` goes through
 * `splashClearsInMs` instead, which is this plus the fade.
 *
 * Only correct when called as the first screen mounts, which is the only place
 * either caller reaches it from. The reason is `_layout.tsx`: it renders nothing
 * at all until the fonts have settled and only then starts the hide timer, so
 * "now" at first mount is the same instant that timer is set. Called later, this
 * would keep counting down a wait that had already been started.
 *
 * On a cold start where the fonts took longer than the minimum this is zero,
 * which is right — the splash is already on its way out at that moment, and the
 * line should not wait for a hold that has already been spent.
 */
export function splashHoldsForMs(): number {
  return Math.max(0, SPLASH.minimumMs - (Date.now() - LAUNCHED_AT));
}

/**
 * How long until there is nothing left of the splash on screen, from now.
 *
 * The hold, plus the fade it then runs. `SPLASH.hideMs` is the same number
 * handed to `SplashScreen.setOptions` in `_layout.tsx`, which is why it is
 * written down in `config/session.ts` rather than passed to that call as a
 * literal — this is the second thing that has to agree with it.
 *
 * The welcome line is scheduled off this, so it starts on a clear screen. Same
 * caveat as `splashHoldsForMs`: only correct when called as the first screen
 * mounts, which is the only place it is called from.
 */
export function splashClearsInMs(): number {
  return splashHoldsForMs() + SPLASH.hideMs;
}
