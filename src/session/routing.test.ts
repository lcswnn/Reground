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
  stageIndex,
  stageOf,
  stageOfPath,
  SESSION_STAGES,
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

  /**
   * Four with nothing behind them, for three different reasons. The door moves
   * on a timer, so anything pointing at it is a button that does nothing
   * slowly; the breath's front door has only the door behind it; the first
   * question has only the breath, which is half a minute long and already
   * done; and the dead end has already cleared the session.
   */
  it('gives the door, the breath intro, the first question and the dead end no way back', () => {
    expect(previousRoute('/', context())).toBeNull();
    expect(previousRoute('/breathe-intro', context())).toBeNull();
    expect(previousRoute('/category', context())).toBeNull();
    expect(previousRoute('/closed', context())).toBeNull();
  });

  // The only four that are null. A screen added without a target would be a
  // screen the user can be stuck on, so this is the check that catches it.
  it('gives every other screen one', () => {
    const routes: SessionRoute[] = [
      '/breathe',
      '/topic',
      '/mood',
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
      '/mood',
    );
    expect(previousRoute('/games', context({ moodBefore: HIGH_DISTRESS_MOOD - 1 }))).toBe(
      '/reactivate',
    );
  });

  // The same bounce, from the other rule: a session with no image never saw the
  // cue, so there is nothing behind the picker but the rating.
  it('skips it on the way back for the sessions that have no image', () => {
    expect(previousRoute('/games', context({ gameKind: 'calm' }))).toBe('/mood');
    expect(previousRoute('/games', context({ gameKind: 'visuospatial' }))).toBe(
      '/reactivate',
    );
  });

  // Never `/breathe`: see `previousRoute`. Restarting half a minute of guided
  // breathing is a forward move, whatever button asked for it — which is why
  // the breath's own back button points at its front door, and why nothing
  // downstream points at either of them.
  it('returns the breath to its front door and nothing else to the breath', () => {
    expect(previousRoute('/breathe', context())).toBe('/breathe-intro');
    expect(previousRoute('/category', context())).toBeNull();
  });

  // The cue is the first screen after the rating now, so it is the one that
  // walks back into the questions.
  it('returns the cue to the rating', () => {
    expect(previousRoute('/reactivate', context({ moodBefore: HIGH_DISTRESS_MOOD }))).toBe(
      '/mood',
    );
    expect(previousRoute('/reactivate', context({ moodBefore: 0 }))).toBe('/mood');
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

describe('stageOf', () => {
  it('counts three parts, in the order the session runs them', () => {
    expect(SESSION_STAGES).toEqual(['breath', 'game', 'oneMore']);
  });

  it('starts the count on the breath, which is what the session opens with', () => {
    expect(stageOf('/breathe-intro')).toBe('breath');
    expect(stageOf('/breathe')).toBe('breath');
  });

  // They come after the breath now and they are what the game is made of: the
  // category picks the shelf, the topic picks the data, the rating decides
  // whether the cue is asked.
  it('puts the questions in the part they lead into', () => {
    expect(stageOf('/category')).toBe('game');
    expect(stageOf('/topic')).toBe('game');
    expect(stageOf('/mood')).toBe('game');
  });

  /**
   * The cue is what the puzzle competes with and the two screens after it are
   * still about the same thing — see `showsReactivation` and `showsCalibration`.
   * A user counting parts counts one here, not five.
   */
  it('wraps the cue, the calibration and the second rating into the game', () => {
    expect(stageOf('/reactivate')).toBe('game');
    expect(stageOf('/games')).toBe('game');
    expect(stageOf('/game')).toBe('game');
    expect(stageOf('/calibration')).toBe('game');
    expect(stageOf('/mood-after')).toBe('game');
  });

  it('keeps the check-in with the thing it checks in on', () => {
    expect(stageOf('/one-more')).toBe('oneMore');
    expect(stageOf('/check-in')).toBe('oneMore');
  });

  /**
   * Finishing is not a fourth part. The row fills on the last thing the user
   * actually does and stays full through the end of the session.
   */
  it('ends on the last part rather than adding one for the end', () => {
    expect(stageOf('/close')).toBe('oneMore');
    expect(stageIndex('oneMore')).toBe(SESSION_STAGES.length - 1);
  });

  /**
   * The door starts nothing and the dead end is past the end — both draw no
   * dots at all, rather than an empty or a full row.
   */
  it('leaves the door and the dead end out of the count', () => {
    expect(stageOf('/')).toBeNull();
    expect(stageOf('/closed')).toBeNull();
  });
});

describe('stageOfPath', () => {
  it('answers for a path off the router', () => {
    expect(stageOfPath('/breathe')).toBe('breath');
    expect(stageOfPath('/close')).toBe('oneMore');
  });

  it('treats anything it does not recognise as outside the session', () => {
    expect(stageOfPath('/_sitemap')).toBeNull();
    expect(stageOfPath('')).toBeNull();
  });
});

describe('stageIndex', () => {
  it('runs from nought in flow order', () => {
    expect(SESSION_STAGES.map(stageIndex)).toEqual([0, 1, 2]);
  });
});
