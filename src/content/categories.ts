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
 *
 * One thing does not fit the two groups: which games are offered. "Something I
 * saw" is the only answer that describes a picture, and the visuospatial games
 * only make sense against a picture — so the games are chosen per category, by
 * `games` below, and not by the group.
 */

import type { GameKind } from "@/session/games/catalog";

export type CategoryGroup = "world" | "witnessed";

export interface Category {
  id: string;
  label: string;
  /** One line under the label. Says what it feels like, not what it is filed as. */
  detail: string;
  group: CategoryGroup;
  /**
   * Which shelf of games this answer leads to — see `GameKind`.
   *
   * The one thing on this file that is *not* derived from the group, and it
   * cannot be: only "Something I saw" is a picture to compete with, while the
   * other two answers are a worry and a memory. The visuospatial games are for
   * the first of those and nobody else; the rest get the calm shelf.
   *
   * That cuts across `group`, which is why it is written down per category
   * rather than looked up from one. It is safe to write down here because it
   * changes what one screen offers rather than which screens exist — the flow
   * itself still branches on the group alone.
   */
  games: GameKind;
}

export const CATEGORIES: readonly Category[] = [
  {
    id: "world",
    label: "News about current events.",
    detail: "Wars, Climate Change, Economy, Politics, etc.",
    group: "world",
    games: "calm",
  },
  {
    id: "witnessed",
    label: "Something I saw",
    detail:
      "An image or video on social media that you can't seem to get out of your mind.",
    group: "witnessed",
    games: "visuospatial",
  },
  {
    id: "personal-other",
    label: "Personal/Other",
    detail:
      "An experience or memory that keeps coming back, or an unknown cause.",
    group: "witnessed",
    games: "calm",
  },
];
