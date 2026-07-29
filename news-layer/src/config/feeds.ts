import type { FeedConfig } from '../types.js';

/**
 * The allowlist.
 *
 * An allowlist rather than a news API on purpose. A broad query for "positive
 * news" returns mostly press releases and puff, and pushes the entire editorial
 * judgement into a relevance ranker we can't see or version. This list is the
 * editorial position, it lives in the repo, and it changes by pull request.
 *
 * Two kinds of source here, and the mix matters:
 *
 *   solutions outlets  — Positive News, Reasons to be Cheerful. Already
 *                        filtered for constructive coverage, so the hit rate is
 *                        high, but they lean soft and local.
 *   primary + science  — WHO, UN, Nature, OWID. Mostly not "good news" as such,
 *                        which is the point: this is where the genuinely large
 *                        stories come from, and the curator's job is to find
 *                        the handful that are.
 *
 * `categoryHint` is what the outlet mostly covers, passed to the curator as a
 * prior. Null for general-interest outlets, where a hint would only mislead it.
 */
export const FEEDS: FeedConfig[] = [
  // Solutions journalism.
  {
    id: 'good-news-network',
    sourceName: 'Good News Network',
    url: 'https://www.goodnewsnetwork.org/feed/',
    categoryHint: null,
  },
  {
    id: 'positive-news',
    sourceName: 'Positive News',
    url: 'https://www.positive.news/feed/',
    categoryHint: null,
  },
  {
    id: 'reasons-to-be-cheerful',
    sourceName: 'Reasons to be Cheerful',
    url: 'https://reasonstobecheerful.world/feed/',
    categoryHint: null,
  },
  {
    id: 'optimist-daily',
    sourceName: 'The Optimist Daily',
    url: 'https://www.optimistdaily.com/feed/',
    categoryHint: null,
  },

  // Health.
  {
    id: 'who',
    sourceName: 'World Health Organization',
    url: 'https://www.who.int/rss-feeds/news-english.xml',
    categoryHint: 'health',
  },
  {
    id: 'nature-medicine',
    sourceName: 'Nature Medicine',
    url: 'https://www.nature.com/nm.rss',
    categoryHint: 'health',
  },

  // Development, poverty, rights.
  {
    id: 'un-news',
    sourceName: 'UN News',
    url: 'https://news.un.org/feed/subscribe/en/news/all/rss.xml',
    categoryHint: null,
  },

  // Climate, energy, conservation.
  {
    id: 'mongabay',
    sourceName: 'Mongabay',
    url: 'https://news.mongabay.com/feed/',
    categoryHint: 'conservation',
  },
  {
    id: 'yale-e360',
    sourceName: 'Yale Environment 360',
    url: 'https://e360.yale.edu/feed.xml',
    categoryHint: 'climate',
  },
  {
    id: 'anthropocene',
    sourceName: 'Anthropocene Magazine',
    url: 'https://www.anthropocenemagazine.org/feed/',
    categoryHint: 'climate',
  },
  {
    id: 'grist',
    sourceName: 'Grist',
    url: 'https://grist.org/feed/',
    categoryHint: 'climate',
  },
  {
    id: 'carbon-brief',
    sourceName: 'Carbon Brief',
    url: 'https://www.carbonbrief.org/feed/',
    categoryHint: 'climate',
  },
  {
    id: 'unep',
    sourceName: 'UN Environment Programme',
    url: 'https://www.unep.org/rss.xml',
    categoryHint: 'climate',
  },
  {
    id: 'iucn',
    sourceName: 'IUCN',
    url: 'https://www.iucn.org/rss.xml',
    categoryHint: 'conservation',
  },

  // Science and data.
  {
    id: 'owid',
    sourceName: 'Our World in Data',
    url: 'https://ourworldindata.org/atom.xml',
    categoryHint: null,
  },
  {
    id: 'nature-news',
    sourceName: 'Nature',
    url: 'https://www.nature.com/nature.rss',
    categoryHint: 'science',
  },
  {
    id: 'science-daily-health',
    sourceName: 'ScienceDaily',
    url: 'https://www.sciencedaily.com/rss/health_medicine.xml',
    categoryHint: 'health',
  },
  {
    id: 'phys-org',
    sourceName: 'Phys.org',
    url: 'https://phys.org/rss-feed/',
    categoryHint: 'science',
  },
];
