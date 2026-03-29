import type { RawTrend } from '../types'

const NEWSDATA_BASE = 'https://newsdata.io/api/1/latest'

interface NewsdataArticle {
  article_id: string
  title: string
  description?: string
  link?: string
  category?: string[]
}

export async function fetchNewsdata(): Promise<RawTrend[]> {
  const apiKey = process.env.NEWSDATA_API_KEY
  if (!apiKey) return []

  const url = `${NEWSDATA_BASE}?apikey=${apiKey}&language=en&country=us`

  const res = await fetch(url)
  if (!res.ok) throw new Error(`Newsdata API failed: ${res.status}`)

  const data = await res.json()
  const articles: NewsdataArticle[] = data.results ?? []

  return articles
    .filter((a) => a.title)
    .map((article) => ({
      externalId: article.article_id,
      title: article.title,
      description: article.description?.slice(0, 500),
      url: article.link,
      source: 'newsdata',
      magnitude: 0,
      fetchedAt: new Date(),
    }))
}
