import type { RawTrend } from '../types'

export async function fetchGoogleTrends(): Promise<RawTrend[]> {
  try {
    // Dynamic import for google-trends-api (CommonJS module)
    const googleTrends = await import('google-trends-api')
    const dailyTrends = googleTrends.dailyTrends ?? googleTrends.default?.dailyTrends

    if (!dailyTrends) {
      console.error('google-trends-api: dailyTrends function not found')
      return []
    }

    const result = await dailyTrends({ geo: 'US' })
    const parsed = JSON.parse(result)

    const days = parsed?.default?.trendingSearchesDays ?? []
    const trends: RawTrend[] = []

    for (const day of days.slice(0, 2)) {
      for (const search of day.trendingSearches ?? []) {
        const title = search.title?.query
        if (!title) continue

        trends.push({
          externalId: `gtrends_${title.toLowerCase().replace(/\s+/g, '_')}`,
          title,
          description: search.articles?.[0]?.title,
          url: search.articles?.[0]?.url,
          source: 'google_trends',
          magnitude: parseInt(search.formattedTraffic?.replace(/[^0-9]/g, '') ?? '0', 10),
          fetchedAt: new Date(),
        })
      }
    }

    return trends
  } catch (err) {
    console.error('Google Trends fetch failed:', err)
    return []
  }
}
