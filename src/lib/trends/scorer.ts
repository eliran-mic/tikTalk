import type { DeduplicatedTrend } from './deduplicator'
import type { ScoredTrend } from './types'

const WEIGHTS = {
  velocity: 0.35,
  crossPlatform: 0.25,
  recency: 0.2,
  magnitude: 0.2,
}

// 6-hour half-life for recency decay
const RECENCY_HALF_LIFE_MS = 6 * 60 * 60 * 1000

/**
 * Normalize cross-platform count to 0-1 range.
 */
function normalizeCrossPlatform(count: number): number {
  if (count >= 4) return 1.0
  if (count === 3) return 0.8
  if (count === 2) return 0.5
  return 0.2
}

/**
 * Calculate recency bonus with exponential decay.
 * Returns 1.0 for brand-new trends, decaying to ~0.5 at half-life.
 */
function calcRecency(firstSeenAt: Date): number {
  const ageMs = Date.now() - firstSeenAt.getTime()
  const decay = Math.LN2 / RECENCY_HALF_LIFE_MS
  return Math.exp(-decay * ageMs)
}

/**
 * Score a batch of deduplicated trends.
 * Magnitude is log-normalized against the batch maximum.
 */
export function scoreTrends(trends: DeduplicatedTrend[]): ScoredTrend[] {
  if (trends.length === 0) return []

  // Find max magnitude for normalization
  const maxMagnitude = Math.max(...trends.map((t) => t.magnitude), 1)

  return trends.map((trend) => {
    const magnitudeNorm =
      trend.magnitude > 0 ? Math.log2(trend.magnitude + 1) / Math.log2(maxMagnitude + 1) : 0

    const crossPlatformNorm = normalizeCrossPlatform(trend.crossPlatform)
    const recency = calcRecency(trend.fetchedAt)

    // Velocity is approximated as magnitude (no prior data in first fetch)
    const velocity = magnitudeNorm

    const viralityScore =
      WEIGHTS.velocity * velocity +
      WEIGHTS.crossPlatform * crossPlatformNorm +
      WEIGHTS.recency * recency +
      WEIGHTS.magnitude * magnitudeNorm

    return {
      ...trend,
      viralityScore,
      velocity,
    }
  })
}
