import { prisma } from '@/lib/db'
import { fetchAllTrends } from './fetchers'
import { normalizeTrends } from './normalizer'
import { deduplicateTrends } from './deduplicator'
import { scoreTrends } from './scorer'
import type { TrendPipelineMetrics } from './types'

const TREND_EXPIRY_HOURS = 48

/**
 * Run the full trend ingestion pipeline:
 * 1. Fetch from all sources
 * 2. Normalize titles and classify categories
 * 3. Deduplicate within batch
 * 4. Score by virality
 * 5. Upsert to database (merge with existing trends)
 * 6. Expire stale trends
 */
export async function runTrendIngestionPipeline(): Promise<TrendPipelineMetrics> {
  const metrics: TrendPipelineMetrics = {
    fetched: 0,
    normalized: 0,
    deduplicated: 0,
    stored: 0,
    expired: 0,
    errors: [],
  }

  // 1. Fetch from all sources
  const { trends: rawTrends, errors } = await fetchAllTrends()
  metrics.fetched = rawTrends.length
  metrics.errors = errors

  if (rawTrends.length === 0) {
    console.log('No trends fetched from any source')
    return metrics
  }

  // 2. Normalize
  const normalized = normalizeTrends(rawTrends)
  metrics.normalized = normalized.length

  // 3. Deduplicate within batch
  const deduplicated = deduplicateTrends(normalized)
  metrics.deduplicated = deduplicated.length

  // 4. Score
  const scored = scoreTrends(deduplicated)

  // 5. Upsert to database
  // First, resolve source IDs from DB
  const sources = await prisma.trendSource.findMany({
    where: { enabled: true },
  })
  const sourceMap = new Map(sources.map((s) => [s.name, s.id]))

  for (const trend of scored) {
    // Map source name to the primary source for this trend
    const sourceId = sourceMap.get(trend.source)
    if (!sourceId) {
      // Try to find any matching source
      const fallbackId = sourceMap.values().next().value
      if (!fallbackId) continue
    }

    const resolvedSourceId = sourceMap.get(trend.source) ?? sources[0]?.id
    if (!resolvedSourceId) continue

    try {
      await prisma.trend.upsert({
        where: {
          sourceId_externalId: {
            sourceId: resolvedSourceId,
            externalId: trend.externalId,
          },
        },
        update: {
          title: trend.title,
          normalizedTitle: trend.normalizedTitle,
          description: trend.description,
          url: trend.url,
          category: trend.category,
          viralityScore: trend.viralityScore,
          velocity: trend.velocity,
          magnitude: trend.magnitude,
          crossPlatform: trend.crossPlatform,
          lastSeenAt: new Date(),
          status: 'active',
        },
        create: {
          externalId: trend.externalId,
          title: trend.title,
          normalizedTitle: trend.normalizedTitle,
          description: trend.description,
          url: trend.url,
          sourceId: resolvedSourceId,
          category: trend.category,
          viralityScore: trend.viralityScore,
          velocity: trend.velocity,
          magnitude: trend.magnitude,
          crossPlatform: trend.crossPlatform,
          firstSeenAt: new Date(),
          lastSeenAt: new Date(),
          status: 'active',
        },
      })
      metrics.stored++
    } catch (err) {
      console.error(`Failed to upsert trend "${trend.title}":`, err)
    }
  }

  // Update source lastFetchAt timestamps
  for (const source of sources) {
    await prisma.trendSource.update({
      where: { id: source.id },
      data: { lastFetchAt: new Date(), lastError: null },
    }).catch(() => {})
  }

  // 6. Expire stale trends (not seen in TREND_EXPIRY_HOURS)
  const expiryThreshold = new Date(
    Date.now() - TREND_EXPIRY_HOURS * 60 * 60 * 1000
  )

  const expired = await prisma.trend.updateMany({
    where: {
      status: 'active',
      lastSeenAt: { lt: expiryThreshold },
    },
    data: { status: 'expired' },
  })
  metrics.expired = expired.count

  console.log(
    JSON.stringify({
      event: 'trend_pipeline_complete',
      ...metrics,
      timestamp: new Date().toISOString(),
    })
  )

  return metrics
}
