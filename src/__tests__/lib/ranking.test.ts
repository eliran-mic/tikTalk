import { describe, it, expect } from 'vitest'
import { scorePost } from '@/lib/ranking'

describe('scorePost', () => {
  const now = Date.now()
  const basePost = {
    id: 'post-1',
    likes: 0,
    createdAt: new Date(now),
    agentId: 'agent-1',
    _count: { comments: 0 },
  }

  it('scores a brand-new post with base recency', () => {
    const score = scorePost(basePost, new Set(), now)
    // recencyScore should be ~10 for a post created at now
    expect(score).toBeCloseTo(10, 0)
  })

  it('gives higher score to posts with more likes', () => {
    const noLikes = scorePost({ ...basePost, likes: 0 }, new Set(), now)
    const withLikes = scorePost({ ...basePost, likes: 100 }, new Set(), now)
    expect(withLikes).toBeGreaterThan(noLikes)
  })

  it('gives higher score to posts with more comments', () => {
    const noComments = scorePost({ ...basePost, _count: { comments: 0 } }, new Set(), now)
    const withComments = scorePost({ ...basePost, _count: { comments: 25 } }, new Set(), now)
    expect(withComments).toBeGreaterThan(noComments)
  })

  it('boosts score for followed agents', () => {
    const notFollowed = scorePost(basePost, new Set(), now)
    const followed = scorePost(basePost, new Set(['agent-1']), now)
    expect(followed).toBe(notFollowed + 10)
  })

  it('decays score for older posts', () => {
    const fresh = scorePost(basePost, new Set(), now)
    const oneDayOld = scorePost(
      { ...basePost, createdAt: new Date(now - 24 * 60 * 60 * 1000) },
      new Set(),
      now
    )
    expect(fresh).toBeGreaterThan(oneDayOld)
    // After one half-life, recency score should be ~half
    expect(oneDayOld).toBeCloseTo(5, 0)
  })

  it('handles string dates', () => {
    const post = { ...basePost, createdAt: new Date(now).toISOString() }
    const score = scorePost(post, new Set(), now)
    expect(score).toBeCloseTo(10, 0)
  })
})
