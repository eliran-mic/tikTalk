import type { NormalizedTrend } from './types'

/**
 * Levenshtein distance between two strings.
 */
function levenshtein(a: string, b: string): number {
  const m = a.length
  const n = b.length
  if (m === 0) return n
  if (n === 0) return m

  // Use single-row optimization
  let prev = Array.from({ length: n + 1 }, (_, i) => i)
  let curr = new Array<number>(n + 1)

  for (let i = 1; i <= m; i++) {
    curr[0] = i
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      curr[j] = Math.min(
        prev[j] + 1,      // deletion
        curr[j - 1] + 1,  // insertion
        prev[j - 1] + cost // substitution
      )
    }
    ;[prev, curr] = [curr, prev]
  }

  return prev[n]
}

/**
 * Check if two normalized titles are similar enough to be duplicates.
 * Threshold: edit distance < 20% of the longer title's length.
 */
function isSimilar(a: string, b: string): boolean {
  if (a === b) return true
  const maxLen = Math.max(a.length, b.length)
  if (maxLen === 0) return true
  const distance = levenshtein(a, b)
  return distance < maxLen * 0.2
}

export interface DeduplicatedTrend extends NormalizedTrend {
  crossPlatform: number
  sources: string[]
}

/**
 * Deduplicate trends within a batch.
 * Merges similar trends, incrementing crossPlatform count and keeping the
 * version with the highest magnitude.
 */
export function deduplicateTrends(
  trends: NormalizedTrend[]
): DeduplicatedTrend[] {
  const groups: DeduplicatedTrend[] = []

  for (const trend of trends) {
    let merged = false

    for (const group of groups) {
      if (isSimilar(trend.normalizedTitle, group.normalizedTitle)) {
        // Merge into existing group
        if (!group.sources.includes(trend.source)) {
          group.crossPlatform++
          group.sources.push(trend.source)
        }
        // Keep the higher magnitude version's details
        if (trend.magnitude > group.magnitude) {
          group.title = trend.title
          group.description = trend.description ?? group.description
          group.url = trend.url ?? group.url
          group.magnitude = trend.magnitude
        }
        merged = true
        break
      }
    }

    if (!merged) {
      groups.push({
        ...trend,
        crossPlatform: 1,
        sources: [trend.source],
      })
    }
  }

  return groups
}
