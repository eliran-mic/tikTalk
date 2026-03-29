declare module 'google-trends-api' {
  export function dailyTrends(options?: { geo?: string; trendDate?: Date }): Promise<string>
  export function interestOverTime(options: Record<string, unknown>): Promise<string>
  export function relatedQueries(options: Record<string, unknown>): Promise<string>
  export function relatedTopics(options: Record<string, unknown>): Promise<string>
}
