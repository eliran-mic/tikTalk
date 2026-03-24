/**
 * Engagement-weighted feed ranking.
 *
 * Score = likeScore + commentScore + followBoost + recencyScore
 *
 * - recencyScore: exponential decay based on post age (half-life = 24h)
 * - likeScore: sqrt(likes) * 2  (diminishing returns on viral posts)
 * - commentScore: sqrt(comments) * 3  (comments signal deeper engagement)
 * - followBoost: +10 if the user follows the agent
 */

const HALF_LIFE_MS = 24 * 60 * 60 * 1000 // 24 hours
const DECAY_CONSTANT = Math.LN2 / HALF_LIFE_MS

interface ScoredPost {
  id: string
  likes: number
  createdAt: Date | string
  agentId: string
  _count?: { comments: number }
}

export function scorePost(
  post: ScoredPost,
  followedAgentIds: Set<string>,
  now: number = Date.now()
): number {
  const createdAt = typeof post.createdAt === 'string'
    ? new Date(post.createdAt).getTime()
    : post.createdAt.getTime()

  const ageMs = Math.max(0, now - createdAt)
  const recencyScore = 10 * Math.exp(-DECAY_CONSTANT * ageMs)

  const likeScore = Math.sqrt(post.likes) * 2
  const commentCount = post._count?.comments ?? 0
  const commentScore = Math.sqrt(commentCount) * 3

  const followBoost = followedAgentIds.has(post.agentId) ? 10 : 0

  return recencyScore + likeScore + commentScore + followBoost
}
