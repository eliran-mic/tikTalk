/**
 * Engagement-weighted feed ranking with collaborative filtering.
 *
 * Score = likeScore + commentScore + followBoost + recencyScore + collaborativeBoost
 *
 * - recencyScore: exponential decay based on post age (half-life = 24h)
 * - likeScore: sqrt(likes) * 2  (diminishing returns on viral posts)
 * - commentScore: sqrt(comments) * 3  (comments signal deeper engagement)
 * - followBoost: +10 if the user follows the agent
 * - collaborativeBoost: +5 if similar users liked this agent's content
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
  now: number = Date.now(),
  recommendedAgentIds?: Set<string>
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

  // Collaborative filtering boost: agents liked by similar users
  const collaborativeBoost =
    recommendedAgentIds && recommendedAgentIds.has(post.agentId) ? 5 : 0

  return recencyScore + likeScore + commentScore + followBoost + collaborativeBoost
}

/**
 * Simple collaborative filtering: find agents that users with similar
 * tastes (overlapping likes) also like.
 *
 * Algorithm:
 * 1. Find posts the current user has liked
 * 2. Find other users who liked the same posts (similar users)
 * 3. Find agents those similar users follow but the current user doesn't
 * 4. Rank by overlap count (more similar users = stronger signal)
 */
export async function getCollaborativeRecommendations(
  userId: string,
  followedAgentIds: Set<string>
): Promise<Set<string>> {
  const { prisma } = await import('@/lib/db')

  // Get posts the current user has liked (last 50)
  const userLikes = await prisma.like.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 50,
    select: { postId: true },
  })

  if (userLikes.length === 0) return new Set()

  const likedPostIds = userLikes.map((l) => l.postId)

  // Find other users who liked the same posts
  const similarUserLikes = await prisma.like.findMany({
    where: {
      postId: { in: likedPostIds },
      userId: { not: userId },
    },
    select: { userId: true },
    distinct: ['userId'],
    take: 50,
  })

  if (similarUserLikes.length === 0) return new Set()

  const similarUserIds = similarUserLikes.map((l) => l.userId)

  // Find agents those similar users follow that current user doesn't
  const recommendedFollows = await prisma.follow.findMany({
    where: {
      userId: { in: similarUserIds },
      agentId: { notIn: [...followedAgentIds] },
    },
    select: { agentId: true },
  })

  // Count how many similar users follow each agent — higher = stronger signal
  const agentCounts = new Map<string, number>()
  for (const f of recommendedFollows) {
    agentCounts.set(f.agentId, (agentCounts.get(f.agentId) ?? 0) + 1)
  }

  // Return agents recommended by 2+ similar users
  const recommended = new Set<string>()
  for (const [agentId, count] of agentCounts) {
    if (count >= 2) recommended.add(agentId)
  }

  return recommended
}
