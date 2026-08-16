import { describe, expect, it } from 'vitest';

import { SOUNDSCAPES, findSoundscape } from '@/content/soundscape';
import { SOUNDSCAPE_COPY } from '@/content/strings';
import {
  SOUNDSCAPE_AUDIO,
  hasSoundscapes,
  playableSoundscapes,
  soundscapeAudio,
} from '@/session/soundscape/audio';

describe('the soundscape catalog', () => {
  it('has unique ids', () => {
    expect(new Set(SOUNDSCAPES.map((s) => s.id)).size).toBe(SOUNDSCAPES.length);
  });

  it('finds a soundscape by id and nothing by a stale one', () => {
    expect(findSoundscape('rain')?.title).toBe('Rain');
    // @ts-expect-error — an id that isn't in the union, as a deep link would be.
    expect(findSoundscape('thunder')).toBeUndefined();
  });

  it('says what each one sounds like', () => {
    SOUNDSCAPES.forEach((soundscape) => {
      expect(soundscape.title.trim(), soundscape.id).not.toBe('');
      expect(soundscape.blurb.trim(), soundscape.id).not.toBe('');
    });
  });
});

/**
 * The audio map is the boundary between the code and files somebody exports by
 * hand, and it is the only place in the app where a feature's availability is a
 * fact about the filesystem. These are what stop that boundary from leaking.
 */
describe('the audio map', () => {
  it('only names soundscapes that are in the catalog', () => {
    const ids = new Set<string>(SOUNDSCAPES.map((s) => s.id));
    Object.keys(SOUNDSCAPE_AUDIO).forEach((key) => {
      expect(ids.has(key), key).toBe(true);
    });
  });

  it('offers exactly the ones with a file behind them', () => {
    const playable = playableSoundscapes().map((s) => s.id);
    expect(playable).toEqual(
      SOUNDSCAPES.filter((s) => s.id in SOUNDSCAPE_AUDIO).map((s) => s.id),
    );
  });

  /**
   * Order comes from the catalog, not from the key order of the map — otherwise
   * the list on screen would silently rearrange itself according to the
   * sequence somebody happened to uncomment things in.
   */
  it('keeps catalog order', () => {
    const catalogOrder = SOUNDSCAPES.map((s) => s.id);
    const playableOrder = playableSoundscapes().map((s) => s.id);
    const expected = catalogOrder.filter((id) => playableOrder.includes(id));

    expect(playableOrder).toEqual(expected);
  });

  it('hands back a source for anything it offers, and nothing for the rest', () => {
    SOUNDSCAPES.forEach((soundscape) => {
      const offered = playableSoundscapes().some((s) => s.id === soundscape.id);
      if (offered) expect(soundscapeAudio(soundscape.id), soundscape.id).toBeDefined();
      else expect(soundscapeAudio(soundscape.id), soundscape.id).toBeUndefined();
    });
  });

  /**
   * What `/one-more` keys the whole offer off. If these two ever disagree, the
   * app either hides a soundscape it could play or draws an empty picker — and
   * the empty picker is the one that reaches a user.
   */
  it('agrees with itself about whether there is anything to offer', () => {
    expect(hasSoundscapes()).toBe(playableSoundscapes().length > 0);
  });
});

/**
 * The one promise this step makes before the user commits to it. A soundscape
 * that ran until it was stopped would be the wrong thing to hand somebody at
 * the end of a session about anxiety, so the copy says it ends by itself — and
 * it only stays true while nothing loops. See `content/soundscape.ts`.
 */
describe('what the picker promises', () => {
  it('says it finishes on its own', () => {
    expect(SOUNDSCAPE_COPY.lead.toLowerCase()).toContain('on its own');
  });

  it('offers a way to stop it early anyway', () => {
    expect(SOUNDSCAPE_COPY.stop.trim()).not.toBe('');
  });
});
