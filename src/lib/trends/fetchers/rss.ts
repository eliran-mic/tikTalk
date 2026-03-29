import type { RawTrend } from '../types'

const DEFAULT_FEEDS = [
  { url: 'https://www.reddit.com/r/technology/.rss', source: 'reddit_rss' },
  { url: 'https://www.reddit.com/r/science/.rss', source: 'reddit_rss' },
  { url: 'https://www.reddit.com/r/worldnews/.rss', source: 'reddit_rss' },
  { url: 'https://news.google.com/rss', source: 'google_news_rss' },
  { url: 'https://hnrss.org/frontpage', source: 'hackernews_rss' },
]

export async function fetchRSSFeeds(
  customFeeds?: { url: string; source: string }[]
): Promise<RawTrend[]> {
  // Dynamic import for rss-parser (CommonJS module)
  const RSSParser = (await import('rss-parser')).default
  const parser = new RSSParser()
  const feeds = customFeeds ?? DEFAULT_FEEDS
  const results: RawTrend[] = []

  for (const feed of feeds) {
    try {
      const parsed = await parser.parseURL(feed.url)
      const items = (parsed.items ?? []).slice(0, 20)

      for (const item of items) {
        if (!item.title) continue
        results.push({
          externalId: item.guid ?? item.link ?? item.title,
          title: item.title,
          description: item.contentSnippet?.slice(0, 500),
          url: item.link,
          source: feed.source,
          magnitude: 0,
          fetchedAt: new Date(),
        })
      }
    } catch (err) {
      console.error(`RSS fetch failed for ${feed.url}:`, err)
    }
  }

  return results
}
