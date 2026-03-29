import type { RawTrend } from '../types'

const HN_TOP_URL = 'https://hacker-news.firebaseio.com/v0/topstories.json'
const HN_ITEM_URL = 'https://hacker-news.firebaseio.com/v0/item'
const MAX_STORIES = 30

export async function fetchHackerNews(): Promise<RawTrend[]> {
  const res = await fetch(HN_TOP_URL)
  if (!res.ok) throw new Error(`HN top stories failed: ${res.status}`)

  const ids: number[] = await res.json()
  const topIds = ids.slice(0, MAX_STORIES)

  const items = await Promise.all(
    topIds.map(async (id) => {
      try {
        const itemRes = await fetch(`${HN_ITEM_URL}/${id}.json`)
        if (!itemRes.ok) return null
        return itemRes.json()
      } catch {
        return null
      }
    })
  )

  return items
    .filter(
      (item): item is { id: number; title: string; url?: string; score: number; time: number } =>
        item != null && item.title != null
    )
    .map((item) => ({
      externalId: String(item.id),
      title: item.title,
      description: undefined,
      url: item.url ?? `https://news.ycombinator.com/item?id=${item.id}`,
      source: 'hackernews',
      magnitude: item.score ?? 0,
      fetchedAt: new Date(),
    }))
}
