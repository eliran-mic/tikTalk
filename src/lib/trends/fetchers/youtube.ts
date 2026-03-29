import type { RawTrend } from '../types'

const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3'

interface YouTubeVideo {
  id: string
  snippet: {
    title: string
    description: string
    channelTitle: string
  }
  statistics?: {
    viewCount?: string
    likeCount?: string
  }
}

export async function fetchYouTubeTrending(): Promise<RawTrend[]> {
  const apiKey = process.env.YOUTUBE_API_KEY
  if (!apiKey) return []

  const url = `${YOUTUBE_API_BASE}/videos?part=snippet,statistics&chart=mostPopular&regionCode=US&maxResults=25&key=${apiKey}`

  const res = await fetch(url)
  if (!res.ok) throw new Error(`YouTube API failed: ${res.status}`)

  const data = await res.json()
  const videos: YouTubeVideo[] = data.items ?? []

  return videos.map((video) => ({
    externalId: video.id,
    title: video.snippet.title,
    description: video.snippet.description?.slice(0, 500),
    url: `https://www.youtube.com/watch?v=${video.id}`,
    source: 'youtube',
    magnitude: parseInt(video.statistics?.viewCount ?? '0', 10),
    fetchedAt: new Date(),
  }))
}
