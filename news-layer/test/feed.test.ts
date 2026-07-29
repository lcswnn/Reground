import { describe, expect, it } from 'vitest';

import { parseFeed, stripHtml } from '../src/feed.js';
import { canonicalizeUrl } from '../src/url.js';
import type { FeedConfig } from '../src/types.js';

const FEED: FeedConfig = {
  id: 'test',
  sourceName: 'Test Source',
  url: 'https://example.com/feed',
  categoryHint: 'health',
};

describe('canonicalizeUrl', () => {
  it('strips the tracking params feeds append on every republish', () => {
    expect(canonicalizeUrl('https://example.com/story?utm_source=rss&utm_medium=rss')).toBe(
      'https://example.com/story',
    );
  });

  it('collapses trailing slash, www, and host case to one key', () => {
    const forms = [
      'https://www.Example.com/story/',
      'https://example.com/story',
      'https://EXAMPLE.com/story#section',
    ];
    const canonical = forms.map(canonicalizeUrl);
    expect(new Set(canonical).size).toBe(1);
  });

  it('preserves path case, which plenty of CMSes are sensitive to', () => {
    expect(canonicalizeUrl('https://example.com/Story-Slug')).toBe('https://example.com/Story-Slug');
  });

  it('returns unparseable input unchanged rather than throwing mid-run', () => {
    expect(canonicalizeUrl('  not a url  ')).toBe('not a url');
  });
});

describe('stripHtml', () => {
  it('unwraps the HTML fragment feeds put in description', () => {
    expect(stripHtml('<p>Cases fell <b>40%</b>.</p>\n<p>Since 2020.</p>')).toBe(
      'Cases fell 40%. Since 2020.',
    );
  });

  it('decodes the entities that would otherwise reach the model as noise', () => {
    expect(stripHtml('WHO &amp; UNICEF said &#8220;done&#8221;')).toBe('WHO & UNICEF said “done”');
  });

  it('decodes WordPress double-encoding, which named-first order would strand', () => {
    expect(stripHtml('Q&#038;A: China&#8217;s plan')).toBe('Q&A: China’s plan');
  });
});

describe('parseFeed — RSS 2.0', () => {
  const xml = `<?xml version="1.0"?>
    <rss version="2.0">
      <channel>
        <title>Test Source</title>
        <item>
          <title><![CDATA[Malaria deaths fall 30%]]></title>
          <link>https://example.com/malaria?utm_source=rss</link>
          <description>&lt;p&gt;Across twelve countries.&lt;/p&gt;</description>
          <pubDate>Tue, 28 Jul 2026 09:00:00 +0000</pubDate>
        </item>
      </channel>
    </rss>`;

  it('reads title, canonical link, excerpt, and RFC 822 date', () => {
    const [item] = parseFeed(xml, FEED);
    expect(item.title).toBe('Malaria deaths fall 30%');
    expect(item.url).toBe('https://example.com/malaria');
    expect(item.excerpt).toBe('Across twelve countries.');
    expect(item.publishedAt).toBe('2026-07-28T09:00:00.000Z');
    expect(item.categoryHint).toBe('health');
  });
});

describe('parseFeed — Atom', () => {
  const xml = `<?xml version="1.0"?>
    <feed xmlns="http://www.w3.org/2005/Atom">
      <entry>
        <title type="text">Grid hits 50% renewables</title>
        <link rel="replies" href="https://example.com/grid/comments"/>
        <link rel="alternate" href="https://example.com/grid"/>
        <summary>A first for the region.</summary>
        <published>2026-07-28T06:30:00Z</published>
      </entry>
    </feed>`;

  it('takes the alternate link rather than the first one', () => {
    const [item] = parseFeed(xml, FEED);
    expect(item.url).toBe('https://example.com/grid');
  });

  it('reads a title carrying attributes as text, not as an object', () => {
    const [item] = parseFeed(xml, FEED);
    expect(item.title).toBe('Grid hits 50% renewables');
  });
});

describe('parseFeed — malformed entries', () => {
  const xml = `<?xml version="1.0"?>
    <rss version="2.0">
      <channel>
        <item><title>No link</title><pubDate>Tue, 28 Jul 2026 09:00:00 +0000</pubDate></item>
        <item><link>https://example.com/no-title</link><pubDate>Tue, 28 Jul 2026 09:00:00 +0000</pubDate></item>
        <item><title>No date</title><link>https://example.com/no-date</link></item>
        <item><title>Bad date</title><link>https://example.com/bad-date</link><pubDate>whenever</pubDate></item>
        <item>
          <title>Good one</title>
          <link>https://example.com/good</link>
          <pubDate>Tue, 28 Jul 2026 09:00:00 +0000</pubDate>
        </item>
      </channel>
    </rss>`;

  it('drops what it cannot use and keeps the rest of the document', () => {
    const items = parseFeed(xml, FEED);
    expect(items.map((item) => item.url)).toEqual(['https://example.com/good']);
  });
});

describe('parseFeed — a single item', () => {
  it('handles the parser returning one object instead of an array', () => {
    const xml = `<rss version="2.0"><channel><item>
      <title>Only story</title>
      <link>https://example.com/only</link>
      <pubDate>Tue, 28 Jul 2026 09:00:00 +0000</pubDate>
    </item></channel></rss>`;
    expect(parseFeed(xml, FEED)).toHaveLength(1);
  });

  it('returns nothing for a document that is neither RSS nor Atom', () => {
    expect(parseFeed('<html><body>Not a feed</body></html>', FEED)).toEqual([]);
  });
});
