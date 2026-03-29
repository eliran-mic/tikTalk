import type { RawTrend } from '../types'
import { fetchHackerNews } from './hackernews'
import { fetchYouTubeTrending } from './youtube'
import { fetchRSSFeeds } from './rss'
import { fetchGoogleTrends } from './google-trends'
import { fetchNewsdata } from './newsdata'

interface FetcherDef {
  name: string
  fn: () => Promise<RawTrend[]>
}

const FETCHERS: FetcherDef[] = [
  { name: 'hackernews', fn: fetchHackerNews },
  { name: 'youtube', fn: fetchYouTubeTrending },
  { name: 'rss', fn: fetchRSSFeeds },
  { name: 'google_trends', fn: fetchGoogleTrends },
  { name: 'newsdata', fn: fetchNewsdata },
]

export async function fetchAllTrends(): Promise<{
  trends: RawTrend[]
  errors: string[]
}> {
  const allTrends: RawTrend[] = []
  const errors: string[] = []

  const results = await Promise.allSettled(
    FETCHERS.map(async (fetcher) => {
      const trends = await fetcher.fn()
      return { name: fetcher.name, trends }
    })
  )

  for (const result of results) {
    if (result.status === 'fulfilled') {
      allTrends.push(...result.value.trends)
    } else {
      const fetcherIndex = results.indexOf(result)
      const name = FETCHERS[fetcherIndex]?.name ?? 'unknown'
      errors.push(`${name}: ${result.reason}`)
      console.error(`Fetcher ${name} failed:`, result.reason)
    }
  }

  return { trends: allTrends, errors }
}
