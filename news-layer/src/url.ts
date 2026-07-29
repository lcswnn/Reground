/**
 * URL canonicalisation — the dedupe key for the whole pipeline.
 *
 * This is doing more work than it looks like. The same article reaches us more
 * than once in three ways, and each needs a different part of this:
 *
 *   feed re-publishes it with `?utm_source=rss&utm_medium=rss` appended, so a
 *   raw comparison sees a new story every single day;
 *
 *   two feeds carry the same wire story, one with a trailing slash;
 *
 *   the outlet moves from http to https mid-year.
 *
 * Stripping the query string wholesale is the aggressive choice and it is the
 * right one here: none of these outlets serve distinct articles off a query
 * param, and the failure mode of being too aggressive (one article silently
 * skipped) is much cheaper than being too lax (the same article in the feed
 * every morning forever).
 */

/**
 * Lowercased scheme and host, no query, no fragment, no trailing slash.
 *
 * Path case is preserved — plenty of CMSes serve case-sensitive slugs, and
 * lowercasing them would produce a key that 404s if anything ever followed it.
 *
 * Returns the trimmed input unchanged when it doesn't parse, so a malformed
 * link becomes its own dedupe key rather than throwing mid-run. That row will
 * fail its own insert later, which is the right place to notice it.
 */
export function canonicalizeUrl(raw: string): string {
  const trimmed = raw.trim();

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return trimmed;
  }

  url.search = '';
  url.hash = '';
  url.protocol = url.protocol.toLowerCase();
  url.hostname = url.hostname.toLowerCase().replace(/^www\./, '');

  // `pathname` is always at least '/', so this leaves a bare domain as
  // 'https://example.com' rather than stripping into the host.
  const path = url.pathname.replace(/\/+$/, '');

  return `${url.origin}${path}`;
}
