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
 * One thing does not fit the groups: which games are offered. "Something I saw"
 * is the only answer that describes a picture, and the visuospatial games only
 * make sense against a picture — so the games are chosen per category, by
 * `games` below, and not by the group.
 *
 * ## The third answer is not an anxiety at all
 *
 * "No anxiety" is here because the honest answer to "what seemed to trigger
 * your anxiety?" is sometimes "nothing did". Somebody who has used this app
 * three times and liked the soundscape will open it on a fine evening, and
 * until this existed the only way through the door was to claim a distress they
 * did not have — which is a small lie the app was asking for and then measuring.
 *
 * What it costs is worth being clear about. The rest of the app is built around
 * a number taken before and after, and this branch has neither: no rating, no
 * reactivation cue, no calibration, and nothing to compare. That is the right
 * trade — those screens are the machinery of interrupting a spike, and there is
 * no spike — but it does mean a relax session is a different product inside the
 * same app.
 */

import type { GameKind } from "@/session/games/catalog";

/**
 * The three shapes a session can take, and the only thing the flow branches on.
 *
 * `world` and `witnessed` are both anxious sessions and differ only in what is
 * offered inside them. `relax` is the odd one and is a different claim
 * altogether: somebody who is not anxious, here for the quiet parts. It skips
 * everything the app does to *measure* a bad half-hour — see `measuresMood` in
 * `session/routing.ts`.
 */
export type CategoryGroup = "world" | "witnessed" | "relax";

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
    id: "personal-other",
    label: "Personal",
    detail: "General and unwanted anxiety from a known or unknown cause.",
    group: "witnessed",
    games: "calm",
  },
  {
    id: "world",
    label: "Doomscrolling",
    detail:
      "Negative news from social media and news apps feeding into your anxiety.",
    group: "world",
    games: "calm",
  },
  {
    id: "witnessed",
    label: "Something I saw",
    detail:
      "An image or video that's stuck in your mind that you saw involuntarily.",
    group: "witnessed",
    games: "visuospatial",
  },
  {
    /**
     * Last on the list, and that placement is the whole of how it behaves. The
     * two answers above it are what the app is for; this one is what to press
     * when neither of them is true, and somebody who is genuinely wound up
     * should meet it after the answer that fits them rather than before.
     */
    id: "relax",
    label: "No anxiety",
    detail: "Nothing is wrong — here for the quiet parts. The sounds, the games.",
    group: "relax",
    // The calm shelf, necessarily: the visuospatial games work by competing
    // with an image somebody cannot stop seeing, and this session has no image.
    games: "calm",
  },
];
