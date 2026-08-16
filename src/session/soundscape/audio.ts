/**
 * Which soundscapes have an audio file behind them.
 *
 * **This is the one file to edit when an mp3 lands in `assets/soundscapes/`.**
 * Uncomment its line. Nothing else in the app has to change: the picker draws
 * whatever is in this map and the offer on `/one-more` disappears entirely when
 * it is empty.
 *
 * ## Why the requires are commented out rather than absent
 *
 * `require` of a missing file is a Metro *bundling* error, not a runtime one —
 * the app does not fail to play a soundscape, it fails to build at all. So a
 * map that optimistically listed all five would mean nobody could run the app
 * until every file existed, and adding them one at a time would be impossible.
 * Commented lines keep the paths written down, spelled correctly, in the right
 * order, next to the ids they belong to. Uncommenting one is a smaller and much
 * more obvious action than writing it from scratch against a README.
 *
 * They cannot be built from a variable either — `require('...' + id + '.mp3')`
 * does not work under Metro, which resolves these statically at build time. A
 * literal path per entry is the only form there is.
 *
 * ## Why this is separate from the catalog
 *
 * `content/soundscape.ts` says what a soundscape *is*, which is true whether or
 * not anybody has exported the audio yet. This says what the repository
 * currently contains. Keeping the second fact out of the first is what stops
 * the catalog from carrying an `available` flag that has to be hand-maintained
 * in step with the filesystem.
 */

import type { AudioSource } from 'expo-audio';

import { SOUNDSCAPES, type Soundscape, type SoundscapeId } from '@/content/soundscape';

/**
 * Partial on purpose: a missing key means the file is not in the repository
 * yet, and every reader below treats that as "do not offer it" rather than as
 * an error.
 */
export const SOUNDSCAPE_AUDIO: Partial<Record<SoundscapeId, AudioSource>> = {
  // rain: require('../../../assets/soundscapes/rain.mp3'),
  // fire: require('../../../assets/soundscapes/fire.mp3'),
  // cafe: require('../../../assets/soundscapes/cafe.mp3'),
  // waves: require('../../../assets/soundscapes/waves.mp3'),
  // night: require('../../../assets/soundscapes/night.mp3'),
};

/**
 * The soundscapes that can actually be played, in catalog order.
 *
 * Order comes from `SOUNDSCAPES` rather than from the key order of the map
 * above, so the list on screen does not silently rearrange itself according to
 * the sequence somebody happened to uncomment things in.
 */
export function playableSoundscapes(): readonly Soundscape[] {
  return SOUNDSCAPES.filter((soundscape) => soundscape.id in SOUNDSCAPE_AUDIO);
}

/** Undefined for a soundscape whose file has not landed. */
export function soundscapeAudio(id: SoundscapeId): AudioSource | undefined {
  return SOUNDSCAPE_AUDIO[id];
}

/**
 * Whether the offer is worth making at all.
 *
 * `/one-more` asks this before drawing the soundscape option's screen: with no
 * files in the build there is nothing behind the card, and a picker with an
 * empty list is a worse answer than the not-built-yet screen it would have
 * replaced.
 */
export function hasSoundscapes(): boolean {
  return playableSoundscapes().length > 0;
}
