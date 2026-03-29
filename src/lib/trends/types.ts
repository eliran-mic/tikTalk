export interface RawTrend {
  externalId: string
  title: string
  description?: string
  url?: string
  source: string
  magnitude: number
  fetchedAt: Date
}

export interface NormalizedTrend extends RawTrend {
  normalizedTitle: string
  category: string
}

export interface ScoredTrend extends NormalizedTrend {
  viralityScore: number
  velocity: number
  crossPlatform: number
}

export interface TrendPipelineMetrics {
  fetched: number
  normalized: number
  deduplicated: number
  stored: number
  expired: number
  errors: string[]
}

export type TrendCategory =
  | 'tech'
  | 'business'
  | 'health'
  | 'philosophy'
  | 'science'
  | 'culture'
  | 'finance'
  | 'comedy'
  | 'politics'
  | 'education'
  | 'entertainment'
  | 'fitness'
  | 'food'
  | 'relationships'
  | 'general'
