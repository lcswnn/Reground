/**
 * The follow-up question, and the only thing in the session that decides which
 * data gets pulled.
 *
 * Asked of GROUP A only. "Something that's happening" is a feeling, not a
 * subject, and the calibration screen cannot answer "is it actually like that"
 * without knowing which *it* — so the world branch asks one more question
 * before the session starts, and GROUP B never sees it.
 *
 * ## `dataKey` is the flag
 *
 * `id` is what the user picked. `dataKey` is what that resolves to when we go
 * looking for something to show them, and it is deliberately a separate field:
 * the two are not the same question, and more than one topic can legitimately
 * point at the same data. `unsure` is the case that proves it — someone who
 * cannot name one thing still gets a screen, and it is the general one.
 *
 * This is the single point of coupling between what is asked and what is
 * fetched. When there are real datasets behind these rather than the
 * placeholder copy in `@/content/calibration`, this field is what selects them,
 * and adding a topic that reuses an existing dataset stays a one-line change.
 */

/**
 * A dataset, not a topic. Constrained rather than left as `string` so
 * `CALIBRATION` is checked for completeness at compile time — a topic pointing
 * at data that does not exist should not be something a test has to catch.
 */
export type TopicDataKey =
  | 'world'
  | 'war'
  | 'climate'
  | 'economy'
  | 'disease'
  | 'politics';

export type WorldTopicId =
  | 'war'
  | 'climate'
  | 'economy'
  | 'disease'
  | 'politics'
  | 'unsure';

export interface WorldTopic {
  id: WorldTopicId;
  label: string;
  /** One line under the label. Says what it feels like, not what it is filed as. */
  detail: string;
  /** Which data this pulls. See the note above — this is the flag. */
  dataKey: TopicDataKey;
}

/**
 * Order is the order on screen. `unsure` is last because it is the answer for
 * someone who could not pick one of the others, and putting an escape hatch
 * above the real options invites it to be taken by default.
 *
 * Six is already at the edge of what should be on this screen. Someone who has
 * just been doomscrolling is not in a state to read a taxonomy, and every
 * option added past this point makes the picker itself the hard part.
 */
export const WORLD_TOPICS: readonly WorldTopic[] = [
  {
    id: 'war',
    label: 'A war',
    detail: "One that's happening, or one that might.",
    dataKey: 'war',
  },
  {
    id: 'climate',
    label: 'The climate',
    detail: 'Heat, fires, floods, how long we have.',
    dataKey: 'climate',
  },
  {
    id: 'economy',
    label: 'Money',
    detail: 'Rent, prices, work, whether it holds.',
    dataKey: 'economy',
  },
  {
    id: 'disease',
    label: 'Illness',
    detail: 'An outbreak, or health more broadly.',
    dataKey: 'disease',
  },
  {
    id: 'politics',
    label: 'Politics',
    detail: 'Elections, courts, who holds power.',
    dataKey: 'politics',
  },
  {
    // Resolves to the general entry rather than to nothing. Not being able to
    // name it is the most honest answer on this screen and one of the more
    // likely ones — it cannot be the option that gets you a worse session.
    id: 'unsure',
    label: 'All of it',
    detail: 'Not one thing in particular.',
    dataKey: 'world',
  },
];
