/**
 * When the splash goes away, for the two places that need to agree about it.
 *
 * `app/_layout.tsx` decides when to hide it. `app/index.tsx` needs the same
 * number, because its line fades up rather than being there from the first
 * frame: started any earlier, that fade would run to completion behind an opaque
 * splash and the line would be revealed already at full strength.
 *
 * Both now wait for the same instant — the moment the splash *begins* to
 * dissolve, not the moment it has finished. The two fades overlap on purpose, so
 * the line comes up through the splash as it clears rather than after it. There
 * used to be a `splashClearsInMs` that waited out the 350ms fade and a 200ms
 * settle on top of it, on the argument that the beat of empty screen made it
 * read as the app arriving and *then* speaking. It also cost 550ms before
 * anything happened, which is a long time to look at nothing on the screen that
 * opens the app.
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
 * `_layout.tsx` uses it to schedule `hideAsync`; `index.tsx` uses it to schedule
 * the line, which is what makes the two overlap.
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
