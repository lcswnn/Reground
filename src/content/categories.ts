/**
 * The first question: two options, and nothing else on the screen.
 *
 * This is deliberately coarse for now. What the session actually branches on
 * has only ever been the *group* — see `src/session/routing.ts` — and the two
 * options below are those two groups, stated as something a person would
 * recognise about themselves rather than as a topic to file under.
 *
 * The difference the user can feel: the first one ends with something to read
 * about where the thing actually stands, the second one skips that entirely,
 * because there is no article that helps with an image you can't stop seeing.
 *
 * The finer topic picker is back, and it sits *inside* the `world` branch on a
 * screen of its own — see `src/content/topics.ts`. That is the level the
 * calibration content is keyed at. This file stays coarse on purpose: the
 * group is the only thing the flow branches on, so a topic list that grows
 * cannot change the shape of the session.
 */

export type CategoryGroup = 'world' | 'witnessed';

export interface Category {
  id: string;
  label: string;
  /** One line under the label. Says what it feels like, not what it is filed as. */
  detail: string;
  group: CategoryGroup;
}

export const CATEGORIES: readonly Category[] = [
  {
    id: 'world',
    label: "Something that's happening",
    detail: 'The war, the climate, the economy. The way things are going.',
    group: 'world',
  },
  {
    id: 'witnessed',
    label: 'Something I saw',
    detail: "An image or a video that hasn't left.",
    group: 'witnessed',
  },
];
