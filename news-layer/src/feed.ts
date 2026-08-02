import { XMLParser } from "fast-xml-parser";

import type { FeedConfig, FeedItem } from "./types.js";
import { canonicalizeUrl } from "./url.js";

/**
 * RSS and Atom parsing.
 *
 * Both formats in one function because the allowlist contains both and the
 * distinction is meaningless downstream — WHO publishes RSS 2.0, Our World in
 * Data publishes Atom, and a story is a story. The shapes differ in three
 * places and nowhere else that matters:
 *
 *   container   `rss.channel.item[]` vs `feed.entry[]`
 *   link        a text node vs an `href` attribute on one of several <link>s
 *   date        `pubDate` (RFC 822) vs `published`/`updated` (ISO 8601)
 *
 * Everything here is defensive to the point of paranoia about missing fields.
 * Twenty feeds maintained by twenty different teams will produce a malformed
 * entry eventually, and one bad <item> must not cost us the other forty in the
 * same document.
 */

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  // Without this, a <title> of "2024" parses as the number 2024 and every
  // downstream `.trim()` throws.
  parseTagValue: false,
  parseAttributeValue: false,
  trimValues: true,
});

/** Feeds that are slow but not dead shouldn't hold up the other nineteen. */
const FETCH_TIMEOUT_MS = 20_000;

/**
 * Reads a node that may be a bare string, a `{'#text': ...}` object (when the
 * element carried attributes, as Atom's `<title type="text">` does), or an
 * array (when the feed repeats an element the spec says is singular).
 */
function text(node: unknown): string {
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.length > 0 ? text(node[0]) : "";
  if (node && typeof node === "object" && "#text" in node) {
    return text((node as Record<string, unknown>)["#text"]);
  }
  return "";
}

/** Always an array, whether the parser gave us one, none, or a bare object. */
function list(node: unknown): unknown[] {
  if (Array.isArray(node)) return node;
  if (node === undefined || node === null) return [];
  return [node];
}

/**
 * Strips markup and collapses whitespace.
 *
 * Feed descriptions are HTML fragments — often the full article body wrapped in
 * <p> tags, sometimes with a tracking pixel and a "The post X appeared first
 * on Y" footer. The curator only needs enough to judge the story, and sending
 * raw HTML would spend a third of the token budget on markup.
 */
export function stripHtml(html: string): string {
  return (
    html
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/gi, " ")
      // Numeric entities before named ones. WordPress feeds double-encode — a
      // title arrives as `Q&#038;A`, and decoding `&amp;` first would leave the
      // literal `&#038;` sitting in the text the curator reads.
      .replace(/&#(\d+);/g, (_, code: string) =>
        String.fromCodePoint(Number(code)),
      )
      .replace(/&#x([0-9a-f]+);/gi, (_, code: string) =>
        String.fromCodePoint(parseInt(code, 16)),
      )
      .replace(/&amp;/gi, "&")
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">")
      .replace(/&quot;/gi, '"')
      .replace(/&apos;/gi, "'")
      .replace(/&rsquo;/gi, "’")
      .replace(/&lsquo;/gi, "‘")
      .replace(/&ldquo;/gi, "“")
      .replace(/&rdquo;/gi, "”")
      .replace(/&mdash;/gi, "—")
      .replace(/&ndash;/gi, "–")
      .replace(/&hellip;/gi, "…")
      .replace(/\s+/g, " ")
      // Tags become a space so `<b>40%</b>.` doesn't glue into `40%.`, but that
      // same space lands in front of the punctuation that followed the tag.
      .replace(/\s+([.,;:!?…])/g, "$1")
      .trim()
  );
}

/**
 * Atom's link element.
 *
 * A single entry commonly carries several: `rel="alternate"` is the article,
 * `rel="replies"` is the comment thread, `rel="enclosure"` is an image. Taking
 * the first one blind lands on the comments about a third of the time.
 */
function atomLink(entry: Record<string, unknown>): string {
  const links = list(entry.link);

  const withRel = (rel: string | null) =>
    links.find((link) => {
      if (!link || typeof link !== "object") return false;
      const relation = (link as Record<string, unknown>)["@_rel"];
      return rel === null ? relation === undefined : relation === rel;
    });

  const chosen = withRel("alternate") ?? withRel(null) ?? links[0];
  if (!chosen) return "";

  if (typeof chosen === "string") return chosen;
  const href = (chosen as Record<string, unknown>)["@_href"];
  return typeof href === "string" ? href : text(chosen);
}

/**
 * Parses a date the way each format writes it.
 *
 * `Date.parse` handles both RFC 822 and ISO 8601, so the work here is entirely
 * about what to do when it fails: return null and let the caller drop the item.
 * An undated story cannot be windowed, and defaulting to `now` would mean a
 * feed with broken dates floods the top of the app's feed every morning.
 */
function parseDate(raw: string): string | null {
  if (!raw) return null;
  const ms = Date.parse(raw);
  return Number.isNaN(ms) ? null : new Date(ms).toISOString();
}

/** Every item in the document, oldest-first ordering not guaranteed. */
export function parseFeed(xml: string, feed: FeedConfig): FeedItem[] {
  const parsed = parser.parse(xml) as Record<string, unknown>;

  const rss = parsed.rss as Record<string, unknown> | undefined;
  const rdf = parsed["rdf:RDF"] as Record<string, unknown> | undefined;
  const atom = parsed.feed as Record<string, unknown> | undefined;

  const channel = (rss?.channel ?? rdf) as Record<string, unknown> | undefined;
  const entries = channel ? list(channel.item) : list(atom?.entry);

  const items: FeedItem[] = [];

  for (const raw of entries) {
    if (!raw || typeof raw !== "object") continue;
    const entry = raw as Record<string, unknown>;

    const title = stripHtml(text(entry.title));
    const link = channel ? text(entry.link) : atomLink(entry);
    const publishedAt = parseDate(
      text(entry.pubDate) ||
        text(entry.published) ||
        text(entry.updated) ||
        text(entry["dc:date"]),
    );

    // All three are load-bearing: no title and the curator has nothing to
    // judge, no link and there is nothing to open, no date and it cannot be
    // windowed or ordered. Skipping is better than inventing any of them.
    if (!title || !link || !publishedAt) continue;

    const excerpt = stripHtml(
      text(entry.description) ||
        text(entry.summary) ||
        text(entry["content:encoded"]) ||
        text(entry.content),
    );

    items.push({
      feedId: feed.id,
      sourceName: feed.sourceName,
      title,
      url: canonicalizeUrl(link),
      // Enough to judge the story, not enough to matter for token spend.
      excerpt: excerpt.slice(0, 600),
      publishedAt,
      categoryHint: feed.categoryHint,
    });
  }

  return items;
}

/**
 * Fetches and parses one feed.
 *
 * Throws on transport or HTTP failure so the caller can record which feed died
 * and carry on with the rest — the same per-source isolation the metrics
 * refresh uses.
 */
export async function fetchFeed(feed: FeedConfig): Promise<FeedItem[]> {
  const response = await fetch(feed.url, {
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    headers: {
      // Several of these outlets serve a 403 to a bare fetch. Identifying the
      // project honestly gets a 200 and is the polite thing to do besides.
      "user-agent": "MellovaBot/1.0 (+https://github.com/lucaswaunn/Mellova)",
      accept:
        "application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9, */*;q=0.8",
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ${response.statusText}`);
  }

  return parseFeed(await response.text(), feed);
}
