import { describe, expect, it } from 'vitest';

import { HIGH_DISTRESS_MOOD, MEANINGFUL_MOOD_DROP, PUZZLE } from '@/config/session';
import { CATEGORIES } from '@/content/categories';
import {
  moodOutcome,
  needsTopic,
  previousRoute,
  puzzleDurationMs,
  reachesReactivation,
  showsCalibration,
  showsReactivation,
  skipsReactivation,
  type BackContext,
  type SessionRoute,
} from '@/session/routing';

describe('skipsReactivation', () => {
  it('skips the cue at or above the high-distress threshold', () => {
    expect(skipsReactivation(HIGH_DISTRESS_MOOD)).toBe(true);
    expect(skipsReactivation(10)).toBe(true);
  });

  it('shows it below the threshold', () => {
    expect(skipsReactivation(HIGH_DISTRESS_MOOD - 1)).toBe(false);
    expect(skipsReactivation(0)).toBe(false);
  });
});

describe('showsReactivation', () => {
  it('asks for the image only on the shelf that competes with one', () => {
    expect(showsReactivation('visuospatial')).toBe(true);
    expect(showsReactivation('calm')).toBe(false);
  });

  /**
   * The rule stated the way the product states it: "Something I saw" is the
   * only answer that describes a picture, so it is the only one asked to bring
   * one back. Written against the catalogue rather than against the ids so that
   * a category added with the calm shelf cannot quietly acquire the cue.
   */
  it('is asked of "Something I saw" and of nobody else', () => {
    const asked = CATEGORIES.filter((category) => showsReactivation(category.games));

    expect(asked.map((category) => category.id)).toEqual(['witnessed']);
  });

  it('leaves the worry and the feed out of it', () => {
    const byId = (id: string) => CATEGORIES.find((category) => category.id === id)!;

    expect(showsReactivation(byId('personal-other').games)).toBe(false);
    expect(showsReactivation(byId('world').games)).toBe(false);
  });
});

describe('reachesReactivation', () => {
  it('stops at the cue only with an image and a rating below the threshold', () => {
    expect(
      reachesReactivation({ gameKind: 'visuospatial', moodBefore: HIGH_DISTRESS_MOOD - 1 }),
    ).toBe(true);
  });

  it('skips it at high distress even with an image', () => {
    expect(
      reachesReactivation({ gameKind: 'visuospatial', moodBefore: HIGH_DISTRESS_MOOD }),
    ).toBe(false);
  });

  it('skips it without an image however low the rating', () => {
    expect(reachesReactivation({ gameKind: 'calm', moodBefore: 0 })).toBe(false);
  });

  // A session missing either one has lost its state to a reload. The cue screen
  // sends those to the door; what matters here is that it does not offer them
  // a screen the flow never gave them.
  it('treats a session with nothing in it as no', () => {
    expect(reachesReactivation({ gameKind: null, moodBefore: 3 })).toBe(false);
    expect(reachesReactivation({ gameKind: 'visuospatial', moodBefore: null })).toBe(false);
  });
});

describe('group routing', () => {
  // Keyed to the shelf rather than the group: the longer dose was only ever
  // justified by the visuospatial mechanism, and the calm shelf has none.
  it('gives the visuospatial games the longer dose', () => {
    expect(puzzleDurationMs('visuospatial')).toBe(PUZZLE.visuospatialMs);
    expect(puzzleDurationMs('calm')).toBe(PUZZLE.standardMs);
    expect(PUZZLE.visuospatialMs).toBeGreaterThan(PUZZLE.standardMs);
  });

  it('shows calibration only for world-state fears', () => {
    expect(showsCalibration('world')).toBe(true);
    expect(showsCalibration('witnessed')).toBe(false);
  });

  it('asks the topic follow-up only for world-state fears', () => {
    expect(needsTopic('world')).toBe(true);
    expect(needsTopic('witnessed')).toBe(false);
  });

  // The picker exists to feed the calibration screen. If one group were asked
  // which thing and then never shown anything about it, the question would be
  // taking a tap from someone in distress and giving nothing back for it.
  it('asks for a topic exactly when it will use one', () => {
    expect(needsTopic('world')).toBe(showsCalibration('world'));
    expect(needsTopic('witnessed')).toBe(showsCalibration('witnessed'));
  });
});

describe('previousRoute', () => {
  // The default is a session that *does* stop at the cue — an image and a
  // rating below the threshold — so that the tests below which say it is
  // skipped are saying something.
  const context = (over: Partial<BackContext> = {}): BackContext => ({
    group: 'world',
    hasTopic: true,
    gameKind: 'visuospatial',
    moodBefore: 5,
    oneMore: null,
    ...over,
  });

  // The door moves on a timer, so the first question counts as a door too: a
  // button back to a screen that walks forward again is a button that does
  // nothing slowly.
  it('gives the door, the first question and the dead end no way back', () => {
    expect(previousRoute('/', context())).toBeNull();
    expect(previousRoute('/category', context())).toBeNull();
    expect(previousRoute('/closed', context())).toBeNull();
  });

  // The only three that are null. A screen added without a target would be a
  // screen the user can be stuck on, so this is the check that catches it.
  it('gives every other screen one', () => {
    const routes: SessionRoute[] = [
      '/topic',
      '/mood',
      '/breathe-intro',
      '/breathe',
      '/reactivate',
      '/games',
      '/game',
      '/calibration',
      '/mood-after',
      '/one-more',
      '/check-in',
      '/close',
    ];

    routes.forEach((route) => {
      expect(previousRoute(route, context())).not.toBeNull();
    });
  });

  it('returns the rating screen to whichever question was asked last', () => {
    expect(previousRoute('/mood', context({ hasTopic: true }))).toBe('/topic');
    expect(previousRoute('/mood', context({ hasTopic: false }))).toBe('/category');
  });

  /**
   * The cue screen forwards itself whenever it was not going to be asked, so a
   * back button pointing at it would land the user there for one frame and then
   * push them straight back — a control that visibly does nothing.
   */
  it('skips the reactivation cue on the way back when it was skipped forward', () => {
    expect(previousRoute('/games', context({ moodBefore: HIGH_DISTRESS_MOOD }))).toBe(
      '/breathe-intro',
    );
    expect(previousRoute('/games', context({ moodBefore: HIGH_DISTRESS_MOOD - 1 }))).toBe(
      '/reactivate',
    );
  });

  // The same bounce, from the other rule: a session with no image never saw the
  // cue, so there is nothing behind the picker but the breath.
  it('skips it on the way back for the sessions that have no image', () => {
    expect(previousRoute('/games', context({ gameKind: 'calm' }))).toBe('/breathe-intro');
    expect(previousRoute('/games', context({ gameKind: 'visuospatial' }))).toBe(
      '/reactivate',
    );
  });

  // Never `/breathe`: see `previousRoute`. Restarting a minute of guided
  // breathing is a forward move, whatever button asked for it.
  it('returns to the breath intro rather than into the breath', () => {
    expect(previousRoute('/reactivate', context())).toBe('/breathe-intro');
    expect(previousRoute('/breathe', context())).toBe('/breathe-intro');
  });

  // The breath is the first step after the rating now, so its back button is
  // the one that walks out of the session's timed half entirely.
  it('returns the breath intro to the rating', () => {
    expect(previousRoute('/breathe-intro', context({ moodBefore: HIGH_DISTRESS_MOOD }))).toBe(
      '/mood',
    );
    expect(previousRoute('/breathe-intro', context({ moodBefore: 0 }))).toBe('/mood');
  });

  it('routes the second rating past calibration for the group that never saw it', () => {
    expect(previousRoute('/mood-after', context({ group: 'world' }))).toBe('/calibration');
    expect(previousRoute('/mood-after', context({ group: 'witnessed' }))).toBe('/game');
  });

  // Everybody passes through the offer of one last thing now, whatever their
  // rating did, so this is the screen the second rating hands off to.
  it('sends the offer of one last thing back to the second rating', () => {
    const improved = context({ moodBefore: 8 });
    const stuck = context({ moodBefore: 5 });
    expect(previousRoute('/one-more', improved)).toBe('/mood-after');
    expect(previousRoute('/one-more', stuck)).toBe('/mood-after');
  });

  describe('the closing screen, which has two ways in', () => {
    // The only option on the list with a screen after it.
    it('goes back through the check-in when the 5-4-3-2-1 ran', () => {
      expect(previousRoute('/close', context({ oneMore: 'grounding' }))).toBe('/check-in');
    });

    it('goes back to the list for an option that ends on the door', () => {
      expect(previousRoute('/close', context({ oneMore: 'somatic' }))).toBe('/one-more');
      expect(previousRoute('/close', context({ oneMore: 'pmr' }))).toBe('/one-more');
    });

    // Declining the offer, and also what a reload that emptied the provider
    // looks like. Both want the list: it is where the session actually was.
    it('goes back to the list when nothing was picked at all', () => {
      expect(previousRoute('/close', context({ oneMore: null }))).toBe('/one-more');
      expect(previousRoute('/close', context({ oneMore: null, group: null }))).toBe('/one-more');
    });
  });
});

describe('moodOutcome', () => {
  it('counts a drop of the threshold or more as improvement', () => {
    expect(moodOutcome(7, 7 - MEANINGFUL_MOOD_DROP).improved).toBe(true);
    expect(moodOutcome(7, 7 - MEANINGFUL_MOOD_DROP + 1).improved).toBe(false);
  });

  it('does not count getting worse as improvement', () => {
    expect(moodOutcome(4, 9).improved).toBe(false);
  });

  it('flags high distress independently of improvement', () => {
    // Improved and still bad is a real and important combination: 10 -> 8.
    expect(moodOutcome(10, 8)).toEqual({ improved: true, stillHighDistress: true });
    expect(moodOutcome(6, 3)).toEqual({ improved: true, stillHighDistress: false });
  });
});
