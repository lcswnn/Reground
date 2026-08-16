/**
 * The soundscapes on offer, as data.
 *
 * Same shape and same reasons as `one-more.ts`, `somatic.ts` and
 * `games/catalog.ts`: plain data with no components in it. What is different
 * here is that an entry is not enough on its own — a soundscape needs an audio
 * file behind it, and the file lives outside the code. See
 * `session/soundscape/audio.ts`, which is the one place that knows which of
 * these have actually landed.
 *
 * That split is why there is no `available` flag below. Whether a file exists
 * is a fact about the repository, not about the soundscape, and putting it here
 * would mean editing two files every time one is added — with nothing but care
 * keeping them in step. The picker asks the audio map instead.
 *
 * ## No durations
 *
 * The other timed things in this app carry their own length: the breath derives
 * it, the somatic movements state it. These do not, and cannot usefully — the
 * length of a soundscape is the length of its file, which is a property of an
 * mp3 somebody exported rather than a number this app gets to choose. The
 * player reads `duration` off the loaded file and paces itself from that, so a
 * clip that runs 3:07 is simply a 3:07 exercise.
 *
 * Which also means nothing here loops. Compressed audio does not loop cleanly
 * on either platform — MP3 carries encoder padding at both ends, so the seam
 * lands as a gap or a click no matter how carefully the file was cut. Playing
 * once, end to end, is the design that avoids the problem rather than fighting
 * it. `assets/soundscapes/README.md` is where that is explained to whoever is
 * making the files.
 *
 * Order is the order on screen. Rain is first because it is the one most people
 * would pick unprompted, and the one that asks least of the room it is played
 * in.
 */

export type SoundscapeId = 'rain' | 'fire' | 'cafe' | 'waves' | 'night';

export interface Soundscape {
  id: SoundscapeId;
  /** What it is. Named, not described — the blurb does that. */
  title: string;
  /**
   * One line. What you would actually hear, not what it is supposed to do to
   * you. "Rain against a window" is a thing; "a calming rain experience" is a
   * claim about how the next three minutes are going to go, made in advance.
   */
  blurb: string;
}

export const SOUNDSCAPES: readonly Soundscape[] = [
  {
    id: 'rain',
    title: 'Rain',
    blurb: 'Steady rain against a window. No thunder.',
  },
  {
    id: 'fire',
    title: 'A fire',
    blurb: 'Wood catching and settling. The odd crack.',
  },
  {
    id: 'cafe',
    // The one on the list that is other people, which is the whole reason it is
    // on it: a room with people in it is the specific thing that helps when the
    // trouble is being alone with something, and no amount of rain does that
    // job. Named for the room rather than for the sound.
    title: 'A room with people in it',
    blurb: 'Low chatter, cups, chairs. Nobody talking to you.',
  },
  {
    id: 'waves',
    title: 'Waves',
    blurb: 'A shoreline, slow sets. Not a storm.',
  },
  {
    id: 'night',
    title: 'Night',
    blurb: 'Crickets, and something distant every so often.',
  },
] as const;

export function findSoundscape(id: SoundscapeId): Soundscape | undefined {
  return SOUNDSCAPES.find((soundscape) => soundscape.id === id);
}
