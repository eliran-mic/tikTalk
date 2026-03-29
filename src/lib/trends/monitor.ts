import { prisma } from '@/lib/db'

export interface TrendHealthMetrics {
  activeTrends: number
  expiredTrends: number
  avgTrendAgeHours: number
  trendsPerCategory: Record<string, number>
  staleSources: string[]
  generationStats: {
    trendBased: number
    staticBased: number
    total: number
    trendPercentage: number
  }
}

/**
 * Get trend pipeline health metrics.
 */
export async function getTrendHealthMetrics(): Promise<TrendHealthMetrics> {
  const [
    activeTrends,
    expiredTrends,
    activeTrendsList,
    sources,
    trendPosts,
    staticPosts,
  ] = await Promise.all([
    prisma.trend.count({ where: { status: 'active' } }),
    prisma.trend.count({ where: { status: 'expired' } }),
    prisma.trend.findMany({
      where: { status: 'active' },
      select: { category: true, firstSeenAt: true },
    }),
    prisma.trendSource.findMany({
      where: { enabled: true },
      select: { name: true, lastFetchAt: true },
    }),
    prisma.post.count({ where: { sourceType: 'trend' } }),
    prisma.post.count({ where: { sourceType: 'static' } }),
  ])

  // Average trend age
  const now = Date.now()
  const avgAgeMs =
    activeTrendsList.length > 0
      ? activeTrendsList.reduce(
          (sum, t) => sum + (now - new Date(t.firstSeenAt).getTime()),
          0
        ) / activeTrendsList.length
      : 0
  const avgTrendAgeHours = Math.round((avgAgeMs / (1000 * 60 * 60)) * 10) / 10

  // Trends per category
  const trendsPerCategory: Record<string, number> = {}
  for (const trend of activeTrendsList) {
    trendsPerCategory[trend.category] =
      (trendsPerCategory[trend.category] ?? 0) + 1
  }

  // Stale sources (no fetch in >2 hours)
  const twoHoursAgo = new Date(now - 2 * 60 * 60 * 1000)
  const staleSources = sources
    .filter(
      (s) => !s.lastFetchAt || new Date(s.lastFetchAt) < twoHoursAgo
    )
    .map((s) => s.name)

  const total = trendPosts + staticPosts

  return {
    activeTrends,
    expiredTrends,
    avgTrendAgeHours,
    trendsPerCategory,
    staleSources,
    generationStats: {
      trendBased: trendPosts,
      staticBased: staticPosts,
      total,
      trendPercentage: total > 0 ? Math.round((trendPosts / total) * 100) : 0,
    },
  }
}
